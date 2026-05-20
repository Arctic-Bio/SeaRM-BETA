import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const crewId = searchParams.get("crewId")
    const voyageId = searchParams.get("voyageId")
    const shipId = searchParams.get("shipId")
    const limit = parseInt(searchParams.get("limit") || "50")

    let activities
    if (crewId) {
      activities = await sql`
        SELECT a.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name
        FROM activities a
        LEFT JOIN crew_applications c ON a.crew_id = c.id
        LEFT JOIN voyages v ON a.voyage_id = v.id
        LEFT JOIN ships s ON a.ship_id = s.id
        WHERE a.crew_id = ${crewId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `
    } else if (voyageId) {
      activities = await sql`
        SELECT a.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name
        FROM activities a
        LEFT JOIN crew_applications c ON a.crew_id = c.id
        LEFT JOIN voyages v ON a.voyage_id = v.id
        LEFT JOIN ships s ON a.ship_id = s.id
        WHERE a.voyage_id = ${voyageId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `
    } else if (shipId) {
      activities = await sql`
        SELECT a.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name
        FROM activities a
        LEFT JOIN crew_applications c ON a.crew_id = c.id
        LEFT JOIN voyages v ON a.voyage_id = v.id
        LEFT JOIN ships s ON a.ship_id = s.id
        WHERE a.ship_id = ${shipId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `
    } else {
      activities = await sql`
        SELECT a.*,
          c.first_name || ' ' || c.last_name as crew_name,
          v.voyage_name, s.name as ship_name
        FROM activities a
        LEFT JOIN crew_applications c ON a.crew_id = c.id
        LEFT JOIN voyages v ON a.voyage_id = v.id
        LEFT JOIN ships s ON a.ship_id = s.id
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ data: activities })
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
      crew_id, ship_id, voyage_id, activity_type,
      title, description = "", metadata = {}, actor_name = "System",
    } = body

    if (!activity_type || !title) {
      return NextResponse.json({ error: "activity_type and title are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO activities (crew_id, ship_id, voyage_id, activity_type, title, description, metadata, actor_name)
      VALUES (${crew_id || null}, ${ship_id || null}, ${voyage_id || null},
        ${activity_type}, ${title}, ${description}, ${JSON.stringify(metadata)}, ${actor_name})
      RETURNING *
    `

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
