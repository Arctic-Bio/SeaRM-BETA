import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession, isStaff } from "@/lib/auth"
import { ensureIntegrationTables, generateApiKey } from "@/lib/integrations/store"

export async function GET() {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const sql = getDb()
    await ensureIntegrationTables(sql)
    const rows = await sql`SELECT * FROM integration_connections ORDER BY created_at DESC`
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("[v0] GET /api/integrations error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const sql = getDb()
    await ensureIntegrationTables(sql)

    const body = await req.json()
    const name = (body.name || "").trim()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const source = body.source || "custom"
    const apiKey = generateApiKey()
    const fieldMapping = JSON.stringify(body.field_mapping || [])

    const rows = await sql`
      INSERT INTO integration_connections
        (name, source, api_key, field_mapping, created_by)
      VALUES
        (${name}, ${source}, ${apiKey}, ${fieldMapping}::jsonb, ${user.name || user.email || "unknown"})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    console.error("[v0] POST /api/integrations error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const sql = getDb()
    await ensureIntegrationTables(sql)

    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    if (body.action === "rotate_key") {
      const newKey = generateApiKey()
      const rows = await sql`
        UPDATE integration_connections SET api_key = ${newKey}, updated_at = now() WHERE id = ${id} RETURNING *
      `
      return NextResponse.json(rows.length ? rows[0] : { error: "Not found" }, { status: rows.length ? 200 : 404 })
    }

    // Update with only provided fields. COALESCE keeps the existing value when a
    // field is omitted from the request body.
    const hasUpdate =
      body.name !== undefined ||
      body.source !== undefined ||
      body.is_active !== undefined ||
      body.field_mapping !== undefined ||
      body.default_status !== undefined ||
      body.update_existing !== undefined ||
      body.dedupe_field !== undefined ||
      body.auto_map !== undefined

    if (!hasUpdate) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    const updateRow = await sql`
      UPDATE integration_connections SET
        name = COALESCE(${body.name ?? null}, name),
        source = COALESCE(${body.source ?? null}, source),
        is_active = COALESCE(${body.is_active ?? null}, is_active),
        field_mapping = COALESCE(${body.field_mapping ? JSON.stringify(body.field_mapping) : null}::jsonb, field_mapping),
        default_status = COALESCE(${body.default_status ?? null}, default_status),
        update_existing = COALESCE(${body.update_existing ?? null}, update_existing),
        dedupe_field = COALESCE(${body.dedupe_field ?? null}, dedupe_field),
        auto_map = COALESCE(${body.auto_map ?? null}, auto_map),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `

    if (!updateRow || updateRow.length === 0) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    return NextResponse.json(updateRow[0], { status: 200 })
  } catch (e: any) {
    console.error("[v0] PATCH /api/integrations error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const sql = getDb()
    await ensureIntegrationTables(sql)
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    await sql`DELETE FROM integration_logs WHERE connection_id = ${id}`
    await sql`DELETE FROM integration_connections WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[v0] DELETE /api/integrations error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
