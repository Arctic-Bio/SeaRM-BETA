import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const result = await sql`
      SELECT s.*,
        (SELECT COUNT(*) FROM voyages v WHERE v.ship_id = s.id) as voyage_count,
        (SELECT COUNT(*) FROM crew_assignments ca 
         JOIN voyages v ON ca.voyage_id = v.id 
         WHERE v.ship_id = s.id AND ca.status IN ('on_board', 'active')) as active_crew
      FROM ships s WHERE s.id = ${id}
    `
    if (result.length === 0) {
      return NextResponse.json({ error: "Ship not found" }, { status: 404 })
    }
    return NextResponse.json({ data: result[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const body = await request.json()

    // Build dynamic update - only update provided fields
    const fields: string[] = []
    const validFields = [
      "name", "type", "flag", "imo_number", "call_sign", "mmsi",
      "length_m", "beam_m", "draft_m", "gross_tonnage", "crew_capacity",
      "year_built", "hull_material", "engine_type", "max_speed_knots",
      "home_port", "status", "notes",
    ]

    for (const field of validFields) {
      if (body[field] !== undefined) {
        fields.push(field)
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Use individual updates to avoid dynamic query complexity
    for (const field of fields) {
      await sql.query(
        `UPDATE ships SET ${field} = $1, updated_at = now() WHERE id = $2`,
        [body[field], id]
      )
    }

    const updated = await sql`SELECT * FROM ships WHERE id = ${id}`
    return NextResponse.json({ data: updated[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    await sql`DELETE FROM ships WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
