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
      SELECT v.*, s.name as ship_name
      FROM voyages v
      LEFT JOIN ships s ON v.ship_id = s.id
      WHERE v.id = ${id}
    `
    if (result.length === 0) {
      return NextResponse.json({ error: "Voyage not found" }, { status: 404 })
    }

    // Get positions
    const positions = await sql`
      SELECT cp.*, 
        ca.first_name || ' ' || ca.last_name as assigned_crew_name
      FROM crew_positions cp
      LEFT JOIN crew_applications ca ON cp.assigned_crew_id = ca.id
      WHERE cp.voyage_id = ${id}
      ORDER BY cp.department, cp.position_name
    `

    // Get assignments
    const assignments = await sql`
      SELECT ca.*,
        c.first_name || ' ' || c.last_name as crew_name,
        c.email as crew_email,
        c.country as crew_country
      FROM crew_assignments ca
      JOIN crew_applications c ON ca.crew_id = c.id
      WHERE ca.voyage_id = ${id}
      ORDER BY ca.role
    `

    return NextResponse.json({
      data: result[0],
      positions,
      assignments,
    })
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
    const validFields = [
      "ship_id", "voyage_name", "description", "departure_port",
      "destination_port", "departure_date", "return_date", "status",
      "mission_type", "mission_objectives", "notes",
    ]

    for (const field of validFields) {
      if (body[field] !== undefined) {
        const value = body[field] === "" && (field === "departure_date" || field === "return_date" || field === "ship_id")
          ? null : body[field]
        await sql.query(
          `UPDATE voyages SET ${field} = $1, updated_at = now() WHERE id = $2`,
          [value, id]
        )
      }
    }

    const updated = await sql`
      SELECT v.*, s.name as ship_name
      FROM voyages v LEFT JOIN ships s ON v.ship_id = s.id
      WHERE v.id = ${id}
    `
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
    await sql`DELETE FROM voyages WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
