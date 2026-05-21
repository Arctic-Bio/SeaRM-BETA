// SeaRM Widgets CRUD API
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const widgets = await sql`SELECT * FROM widgets ORDER BY created_at DESC`
  return NextResponse.json({ widgets })
}

export async function POST(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const {
    name, slug, description, data_source, columns, filters, sort_by, sort_dir,
    view_type, style_preset, custom_css, max_rows, refresh_interval_sec,
    show_header, show_footer, show_pagination, show_search,
    header_title, footer_text, empty_message, card_layout, chart_config,
    allowed_domains, rate_limit_per_min, is_active, is_public
  } = body

  if (!name || !slug || !data_source || !view_type) {
    return NextResponse.json({ error: "name, slug, data_source, and view_type are required" }, { status: 400 })
  }

  const access_token = crypto.randomBytes(32).toString("hex")

  const rows = await sql`
    INSERT INTO widgets (
      name, slug, description, data_source, columns, filters, sort_by, sort_dir,
      view_type, style_preset, custom_css, max_rows, refresh_interval_sec,
      show_header, show_footer, show_pagination, show_search,
      header_title, footer_text, empty_message, card_layout, chart_config,
      access_token, allowed_domains, rate_limit_per_min, is_active, is_public,
      created_by
    ) VALUES (
      ${name}, ${slug}, ${description || null}, ${data_source},
      ${JSON.stringify(columns || [])}, ${JSON.stringify(filters || [])},
      ${sort_by || null}, ${sort_dir || "asc"},
      ${view_type}, ${style_preset || "modern"}, ${custom_css || null},
      ${max_rows || 25}, ${refresh_interval_sec || 300},
      ${show_header !== false}, ${show_footer !== false}, ${show_pagination !== false}, ${show_search || false},
      ${header_title || name}, ${footer_text || null}, ${empty_message || "No data available"},
      ${JSON.stringify(card_layout || {})}, ${JSON.stringify(chart_config || {})},
      ${access_token}, ${allowed_domains || []}, ${rate_limit_per_min || 60},
      ${is_active !== false}, ${is_public !== false},
      ${user.username || "admin"}
    ) RETURNING *
  `
  return NextResponse.json({ widget: rows[0] }, { status: 201 })
}

export async function PUT(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const sets: string[] = []
  const params: unknown[] = []
  let idx = 1
  const allowed = [
    "name", "slug", "description", "data_source", "view_type", "style_preset",
    "custom_css", "max_rows", "refresh_interval_sec", "show_header", "show_footer",
    "show_pagination", "show_search", "header_title", "footer_text", "empty_message",
    "sort_by", "sort_dir", "rate_limit_per_min", "is_active", "is_public"
  ]
  const jsonFields = ["columns", "filters", "card_layout", "chart_config"]
  const arrayFields = ["allowed_domains"]

  for (const key of allowed) {
    if (key in updates) { sets.push(`"${key}" = $${idx++}`); params.push(updates[key]) }
  }
  for (const key of jsonFields) {
    if (key in updates) { sets.push(`"${key}" = $${idx++}`); params.push(JSON.stringify(updates[key])) }
  }
  for (const key of arrayFields) {
    if (key in updates) { sets.push(`"${key}" = $${idx++}`); params.push(updates[key]) }
  }

  if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

  sets.push(`updated_at = NOW()`)
  params.push(id)

  const query = `UPDATE widgets SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`
  const rows = await sql.query(query, params)
  return NextResponse.json({ widget: rows[0] })
}

export async function DELETE(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  await sql`DELETE FROM widgets WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
