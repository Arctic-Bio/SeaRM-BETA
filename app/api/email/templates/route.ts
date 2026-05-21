import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { renderTemplate } from "@/lib/email/template-engine"

const sql = neon(process.env.DATABASE_URL!)

// GET: List all templates
export async function GET() {
  try {
    const rows = await sql`SELECT * FROM email_templates ORDER BY category, name`
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create, update, duplicate, or preview a template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "preview") return handlePreview(body)
    if (action === "update") return handleUpdate(body)
    if (action === "duplicate") return handleDuplicate(body)
    return handleCreate(body)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove a template
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    await sql`DELETE FROM email_templates WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleCreate(body: any) {
  const { name, slug, category, subject, body_html, body_text, variables, metadata, created_by } = body
  if (!name?.trim() || !subject?.trim() || !body_html?.trim()) {
    return NextResponse.json({ error: "Name, subject, and body_html are required" }, { status: 400 })
  }

  const finalSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")

  // Check slug uniqueness
  const existing = await sql`SELECT id FROM email_templates WHERE slug = ${finalSlug}`
  if (existing.length) {
    return NextResponse.json({ error: "Template slug already exists" }, { status: 409 })
  }

  const rows = await sql`
    INSERT INTO email_templates (name, slug, category, subject, body_html, body_text, variables, metadata, created_by)
    VALUES (
      ${name.trim()}, ${finalSlug}, ${category || "general"},
      ${subject.trim()}, ${body_html}, ${body_text || null},
      ${JSON.stringify(variables || [])}, ${JSON.stringify(metadata || {})},
      ${created_by || null}
    ) RETURNING id
  `
  return NextResponse.json({ success: true, id: rows[0].id })
}

async function handleUpdate(body: any) {
  const { id, name, slug, category, subject, body_html, body_text, variables, metadata, is_active, updated_by } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // Check slug uniqueness if changed
  if (slug) {
    const existing = await sql`SELECT id FROM email_templates WHERE slug = ${slug} AND id != ${id}`
    if (existing.length) return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
  }

  await sql`
    UPDATE email_templates SET
      name = COALESCE(${name || null}, name),
      slug = COALESCE(${slug || null}, slug),
      category = COALESCE(${category || null}, category),
      subject = COALESCE(${subject || null}, subject),
      body_html = COALESCE(${body_html || null}, body_html),
      body_text = COALESCE(${body_text ?? null}, body_text),
      variables = COALESCE(${variables ? JSON.stringify(variables) : null}, variables),
      metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}, metadata),
      is_active = COALESCE(${is_active ?? null}, is_active),
      updated_by = COALESCE(${updated_by || null}, updated_by),
      version = version + 1,
      updated_at = NOW()
    WHERE id = ${id}
  `
  return NextResponse.json({ success: true })
}

async function handleDuplicate(body: any) {
  const { id } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const rows = await sql`SELECT * FROM email_templates WHERE id = ${id}`
  if (!rows.length) return NextResponse.json({ error: "Template not found" }, { status: 404 })
  const tmpl = rows[0]
  const newSlug = `${tmpl.slug}-copy-${Date.now()}`
  const newRows = await sql`
    INSERT INTO email_templates (name, slug, category, subject, body_html, body_text, variables, metadata, created_by)
    VALUES (${tmpl.name + " (Copy)"}, ${newSlug}, ${tmpl.category}, ${tmpl.subject}, ${tmpl.body_html}, ${tmpl.body_text}, ${JSON.stringify(tmpl.variables)}, ${JSON.stringify(tmpl.metadata)}, ${body.created_by || null})
    RETURNING id
  `
  return NextResponse.json({ success: true, id: newRows[0].id })
}

async function handlePreview(body: any) {
  const { subject, body_html, variables } = body
  if (!subject || !body_html) return NextResponse.json({ error: "subject and body_html required" }, { status: 400 })
  const sampleData: Record<string, any> = {
    crew_name: "Jane Doe", crew_first_name: "Jane", crew_email: "jane@example.com",
    crew_role: "Deckhand", organization_name: "SeaRM", portal_url: "https://searm.app/portal",
    dashboard_url: "https://searm.app", current_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    voyage_name: "Mediterranean Relief Mission", vessel_name: "MV Solidarity",
    departure_date: "July 15, 2026", document_name: "STCW Certificate",
    task_title: "Complete Safety Briefing",
    ...(variables || {}),
  }
  return NextResponse.json({
    subject: renderTemplate(subject, sampleData),
    body_html: renderTemplate(body_html, sampleData),
    variables_used: sampleData,
  })
}
