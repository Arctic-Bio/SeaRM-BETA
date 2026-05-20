import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const shipId = searchParams.get("shipId")
    const status = searchParams.get("status")

    let voyages
    if (shipId && status) {
      voyages = await sql`
        SELECT v.*, s.name as ship_name,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id) as positions_count,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id AND cp.status = 'filled') as filled_positions
        FROM voyages v
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE v.ship_id = ${shipId} AND v.status = ${status}
        ORDER BY v.departure_date ASC NULLS LAST
      `
    } else if (shipId) {
      voyages = await sql`
        SELECT v.*, s.name as ship_name,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id) as positions_count,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id AND cp.status = 'filled') as filled_positions
        FROM voyages v
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE v.ship_id = ${shipId}
        ORDER BY v.departure_date ASC NULLS LAST
      `
    } else if (status) {
      voyages = await sql`
        SELECT v.*, s.name as ship_name,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id) as positions_count,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id AND cp.status = 'filled') as filled_positions
        FROM voyages v
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE v.status = ${status}
        ORDER BY v.departure_date ASC NULLS LAST
      `
    } else {
      voyages = await sql`
        SELECT v.*, s.name as ship_name,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id) as positions_count,
          (SELECT COUNT(*) FROM crew_positions cp WHERE cp.voyage_id = v.id AND cp.status = 'filled') as filled_positions
        FROM voyages v
        LEFT JOIN ships s ON v.ship_id = s.id
        ORDER BY v.departure_date ASC NULLS LAST
      `
    }
    return NextResponse.json({ data: voyages })
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
      ship_id, voyage_name, description = "", departure_port = "",
      destination_port = "", departure_date, return_date,
      mission_type = "", mission_objectives = "", notes = "",
    } = body

    if (!voyage_name) {
      return NextResponse.json({ error: "Voyage name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO voyages (ship_id, voyage_name, description, departure_port,
        destination_port, departure_date, return_date, mission_type,
        mission_objectives, notes)
      VALUES (${ship_id || null}, ${voyage_name}, ${description}, ${departure_port},
        ${destination_port}, ${departure_date || null}, ${return_date || null},
        ${mission_type}, ${mission_objectives}, ${notes})
      RETURNING *
    `

    await sql`
      INSERT INTO activities (voyage_id, ship_id, activity_type, title, description, actor_name)
      VALUES (${result[0].id}, ${ship_id || null}, 'general', 'Voyage created', ${`Voyage "${voyage_name}" was created`}, 'System')
    `

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
