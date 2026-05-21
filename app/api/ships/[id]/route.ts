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

    // Neon serverless requires tagged template literals -- update each field individually
    if (body.name !== undefined) await sql`UPDATE ships SET name = ${body.name}, updated_at = NOW() WHERE id = ${id}`
    if (body.type !== undefined) await sql`UPDATE ships SET type = ${body.type}, updated_at = NOW() WHERE id = ${id}`
    if (body.flag !== undefined) await sql`UPDATE ships SET flag = ${body.flag}, updated_at = NOW() WHERE id = ${id}`
    if (body.imo_number !== undefined) await sql`UPDATE ships SET imo_number = ${body.imo_number}, updated_at = NOW() WHERE id = ${id}`
    if (body.call_sign !== undefined) await sql`UPDATE ships SET call_sign = ${body.call_sign}, updated_at = NOW() WHERE id = ${id}`
    if (body.mmsi !== undefined) await sql`UPDATE ships SET mmsi = ${body.mmsi}, updated_at = NOW() WHERE id = ${id}`
    if (body.length_m !== undefined) await sql`UPDATE ships SET length_m = ${parseFloat(body.length_m) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.beam_m !== undefined) await sql`UPDATE ships SET beam_m = ${parseFloat(body.beam_m) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.draft_m !== undefined) await sql`UPDATE ships SET draft_m = ${parseFloat(body.draft_m) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.gross_tonnage !== undefined) await sql`UPDATE ships SET gross_tonnage = ${parseFloat(body.gross_tonnage) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.crew_capacity !== undefined) await sql`UPDATE ships SET crew_capacity = ${parseInt(body.crew_capacity) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.year_built !== undefined) await sql`UPDATE ships SET year_built = ${parseInt(body.year_built) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.hull_material !== undefined) await sql`UPDATE ships SET hull_material = ${body.hull_material}, updated_at = NOW() WHERE id = ${id}`
    if (body.engine_type !== undefined) await sql`UPDATE ships SET engine_type = ${body.engine_type}, updated_at = NOW() WHERE id = ${id}`
    if (body.max_speed_knots !== undefined) await sql`UPDATE ships SET max_speed_knots = ${parseFloat(body.max_speed_knots) || 0}, updated_at = NOW() WHERE id = ${id}`
    if (body.home_port !== undefined) await sql`UPDATE ships SET home_port = ${body.home_port}, updated_at = NOW() WHERE id = ${id}`
    if (body.status !== undefined) await sql`UPDATE ships SET status = ${body.status}, updated_at = NOW() WHERE id = ${id}`
    if (body.notes !== undefined) await sql`UPDATE ships SET notes = ${body.notes}, updated_at = NOW() WHERE id = ${id}`

    const updated = await sql`SELECT * FROM ships WHERE id = ${id}`
    if (updated.length === 0) return NextResponse.json({ error: "Ship not found" }, { status: 404 })

    // Log activity
    await sql`
      INSERT INTO activities (ship_id, activity_type, title, description, actor_name)
      VALUES (${id}, 'general', 'Ship updated', ${`Ship "${updated[0].name}" was updated`}, 'System')
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
    await sql`DELETE FROM ships WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
