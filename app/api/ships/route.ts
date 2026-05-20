import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()
    const ships = await sql`
      SELECT s.*,
        (SELECT COUNT(*) FROM voyages v WHERE v.ship_id = s.id) as voyage_count,
        (SELECT COUNT(*) FROM crew_assignments ca 
         JOIN voyages v ON ca.voyage_id = v.id 
         WHERE v.ship_id = s.id AND ca.status IN ('assigned', 'travel', 'on_board', 'active')) as active_crew
      FROM ships s
      ORDER BY s.name ASC
    `
    return NextResponse.json({ data: ships })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()
    const {
      name, type = "research", flag = "", imo_number = "", call_sign = "",
      mmsi = "", length_m = 0, beam_m = 0, draft_m = 0, gross_tonnage = 0,
      crew_capacity = 0, year_built = 0, hull_material = "", engine_type = "",
      max_speed_knots = 0, home_port = "", notes = "",
    } = body

    if (!name) {
      return NextResponse.json({ error: "Ship name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO ships (name, type, flag, imo_number, call_sign, mmsi,
        length_m, beam_m, draft_m, gross_tonnage, crew_capacity, year_built,
        hull_material, engine_type, max_speed_knots, home_port, notes)
      VALUES (${name}, ${type}, ${flag}, ${imo_number}, ${call_sign}, ${mmsi},
        ${length_m}, ${beam_m}, ${draft_m}, ${gross_tonnage}, ${crew_capacity}, ${year_built},
        ${hull_material}, ${engine_type}, ${max_speed_knots}, ${home_port}, ${notes})
      RETURNING *
    `

    // Log activity
    await sql`
      INSERT INTO activities (ship_id, activity_type, title, description, actor_name)
      VALUES (${result[0].id}, 'general', 'Ship added', ${`Ship "${name}" was added to the fleet`}, 'System')
    `

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
