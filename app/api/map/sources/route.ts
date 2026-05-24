import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// GET all tracking sources
export async function GET() {
  try {
    const sources = await sql`SELECT * FROM vessel_tracking_sources ORDER BY created_at DESC`
    return NextResponse.json(sources)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST create a new tracking source
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, slug, source_type, description, api_url, api_key, polling_interval_sec, config } = body
    if (!name || !slug || !source_type) return NextResponse.json({ error: "name, slug, source_type required" }, { status: 400 })

    const rows = await sql`
      INSERT INTO vessel_tracking_sources (name, slug, source_type, description, api_url, api_key, polling_interval_sec, config)
      VALUES (${name}, ${slug}, ${source_type}, ${description || null}, ${api_url || null}, ${api_key || null}, ${polling_interval_sec || 300}, ${JSON.stringify(config || {})})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    if (e.message?.includes("duplicate key")) return NextResponse.json({ error: "A source with this slug already exists" }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT update a tracking source
// Neon's sql tagged template doesn't support dynamic column names,
// so we run individual UPDATE statements per field.
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const numId = parseInt(id)

    if ("name" in updates && updates.name != null) {
      await sql`UPDATE vessel_tracking_sources SET name = ${updates.name}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("slug" in updates && updates.slug != null) {
      await sql`UPDATE vessel_tracking_sources SET slug = ${updates.slug}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("source_type" in updates && updates.source_type != null) {
      await sql`UPDATE vessel_tracking_sources SET source_type = ${updates.source_type}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("is_active" in updates) {
      const active = updates.is_active === true || updates.is_active === "true"
      await sql`UPDATE vessel_tracking_sources SET is_active = ${active}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("description" in updates) {
      await sql`UPDATE vessel_tracking_sources SET description = ${updates.description || null}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("api_url" in updates) {
      await sql`UPDATE vessel_tracking_sources SET api_url = ${updates.api_url || null}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("api_key" in updates) {
      await sql`UPDATE vessel_tracking_sources SET api_key = ${updates.api_key || null}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("polling_interval_sec" in updates) {
      const interval = parseInt(updates.polling_interval_sec) || 300
      await sql`UPDATE vessel_tracking_sources SET polling_interval_sec = ${interval}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("config" in updates) {
      const configStr = typeof updates.config === "string" ? updates.config : JSON.stringify(updates.config || {})
      await sql`UPDATE vessel_tracking_sources SET config = ${configStr}::jsonb, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("last_error" in updates) {
      await sql`UPDATE vessel_tracking_sources SET last_error = ${updates.last_error || null}, updated_at = NOW() WHERE id = ${numId}`
    }
    if ("vessel_count" in updates) {
      const vc = parseInt(updates.vessel_count) || 0
      await sql`UPDATE vessel_tracking_sources SET vessel_count = ${vc}, updated_at = NOW() WHERE id = ${numId}`
    }

    // Return updated row
    const rows = await sql`SELECT * FROM vessel_tracking_sources WHERE id = ${numId}`
    if (rows.length === 0) return NextResponse.json({ error: "Source not found" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE a tracking source
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await sql`DELETE FROM vessel_positions WHERE source_id = ${parseInt(id)}`
    await sql`DELETE FROM vessel_tracking_sources WHERE id = ${parseInt(id)}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
