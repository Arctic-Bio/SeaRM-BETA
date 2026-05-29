import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const crewId = searchParams.get("crewId")
    const voyageId = searchParams.get("voyageId")

    let assignments
    if (crewId) {
      assignments = await sql`
        SELECT ca.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name,
          v.departure_date, v.return_date
        FROM crew_assignments ca
        JOIN crew c ON ca.crew_id = c.id
        JOIN voyages v ON ca.voyage_id = v.id
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE ca.crew_id = ${crewId}
        ORDER BY ca.created_at DESC
      `
    } else if (voyageId) {
      assignments = await sql`
        SELECT ca.*,
          c.first_name || ' ' || c.last_name as crew_name,
          c.email as crew_email, c.country as crew_country,
          v.voyage_name, s.name as ship_name
        FROM crew_assignments ca
        JOIN crew c ON ca.crew_id = c.id
        JOIN voyages v ON ca.voyage_id = v.id
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE ca.voyage_id = ${voyageId}
        ORDER BY ca.role
      `
    } else {
      assignments = await sql`
        SELECT ca.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name
        FROM crew_assignments ca
        JOIN crew c ON ca.crew_id = c.id
        JOIN voyages v ON ca.voyage_id = v.id
        LEFT JOIN ships s ON v.ship_id = s.id
        ORDER BY ca.created_at DESC
        LIMIT 100
      `
    }
    return NextResponse.json({ data: assignments })
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
      crew_id, voyage_id, position_id, role, department = "",
      expected_join_date, expected_departure_date, notes = "",
    } = body

    if (!crew_id || !voyage_id || !role) {
      return NextResponse.json({ error: "crew_id, voyage_id, and role are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO crew_assignments (crew_id, voyage_id, position_id, role, department,
        expected_join_date, expected_departure_date, notes)
      VALUES (${crew_id}, ${voyage_id}, ${position_id || null}, ${role}, ${department},
        ${expected_join_date || null}, ${expected_departure_date || null}, ${notes})
      RETURNING *
    `

    // If position provided, mark it as filled
    if (position_id) {
      await sql`
        UPDATE crew_positions SET status = 'filled', assigned_crew_id = ${crew_id}, updated_at = now()
        WHERE id = ${position_id}
      `
    }

    // Log activity
    const crewInfo = await sql`SELECT first_name, last_name FROM crew WHERE id = ${crew_id}`
    const voyageInfo = await sql`SELECT voyage_name FROM voyages WHERE id = ${voyage_id}`
    const crewName = crewInfo[0] ? `${crewInfo[0].first_name} ${crewInfo[0].last_name}` : "Unknown"
    const voyageName = voyageInfo[0]?.voyage_name || "Unknown"

    await sql`
      INSERT INTO activities (crew_id, voyage_id, activity_type, title, description, actor_name)
      VALUES (${crew_id}, ${voyage_id}, 'assigned_to_voyage', 'Assigned to voyage',
        ${`${crewName} assigned as ${role} on voyage "${voyageName}"`}, 'System')
    `

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
