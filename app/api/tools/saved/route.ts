import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Ensure saved_tools table exists
async function ensureTable() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS saved_tools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'Wrench',
      color TEXT DEFAULT 'chart-1',
      query TEXT NOT NULL,
      display_type TEXT DEFAULT 'table',
      category TEXT DEFAULT 'general',
      is_favorite BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const sql = getDb()
    const tools = await sql`
      SELECT * FROM saved_tools ORDER BY is_favorite DESC, sort_order ASC, created_at DESC
    `
    return NextResponse.json({ tools })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable()
    const sql = getDb()
    const body = await request.json()
    const { name, description, icon, color, query, display_type, category, created_by } = body

    if (!name || !query) {
      return NextResponse.json({ error: "Name and query are required" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO saved_tools (name, description, icon, color, query, display_type, category, created_by)
      VALUES (${name}, ${description || ""}, ${icon || "Wrench"}, ${color || "chart-1"}, ${query}, ${display_type || "table"}, ${category || "general"}, ${created_by || ""})
      RETURNING *
    `
    return NextResponse.json({ tool: rows[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureTable()
    const sql = getDb()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })

    // Build dynamic update
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1
    const allowed = ["name", "description", "icon", "color", "query", "display_type", "category", "is_favorite", "sort_order"]
    for (const key of allowed) {
      if (key in updates) {
        fields.push(`${key} = $${p}`)
        values.push(updates[key])
        p++
      }
    }
    if (fields.length === 0) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `UPDATE saved_tools SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`
    const rows = await sql.query(query, values)

    if (rows.length === 0) return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    return NextResponse.json({ tool: rows[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTable()
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 })
    await sql`DELETE FROM saved_tools WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
