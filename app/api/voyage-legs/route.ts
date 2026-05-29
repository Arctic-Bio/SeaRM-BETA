import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET: List voyage legs for a specific voyage
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const voyageId = searchParams.get("voyage_id")

  if (!voyageId) {
    return NextResponse.json({ error: "voyage_id is required" }, { status: 400 })
  }

  const rows = await sql`
    SELECT 
      vl.*,
      dp.name as departure_port_name, dp.code as departure_port_code,
      dc.name as departure_country, dc.flag_emoji as departure_flag,
      ap.name as arrival_port_name, ap.code as arrival_port_code,
      ac.name as arrival_country, ac.flag_emoji as arrival_flag
    FROM voyage_legs vl
    LEFT JOIN ports dp ON dp.id = vl.departure_port_id
    LEFT JOIN countries dc ON dc.id = dp.country_id
    LEFT JOIN ports ap ON ap.id = vl.arrival_port_id
    LEFT JOIN countries ac ON ac.id = ap.country_id
    WHERE vl.voyage_id = ${voyageId}
    ORDER BY vl.leg_number
  `
  return NextResponse.json(rows)
}

// POST: Create a new voyage leg
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin", "voyage_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { voyage_id, leg_number, departure_port_id, arrival_port_id, departure_date, arrival_date, distance_nm, status, notes } = body

  if (!voyage_id || !leg_number) {
    return NextResponse.json({ error: "voyage_id and leg_number are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      INSERT INTO voyage_legs (voyage_id, leg_number, departure_port_id, arrival_port_id, departure_date, arrival_date, distance_nm, status, notes)
      VALUES (${voyage_id}, ${leg_number}, ${departure_port_id || null}, ${arrival_port_id || null}, ${departure_date || null}, ${arrival_date || null}, ${distance_nm || null}, ${status || 'planned'}, ${notes || null})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Leg number already exists for this voyage" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// PUT: Update a voyage leg
export async function PUT(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin", "voyage_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { id, departure_port_id, arrival_port_id, departure_date, arrival_date, distance_nm, status, notes } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const result = await sql`
    UPDATE voyage_legs SET
      departure_port_id = ${departure_port_id || null},
      arrival_port_id = ${arrival_port_id || null},
      departure_date = ${departure_date || null},
      arrival_date = ${arrival_date || null},
      distance_nm = ${distance_nm || null},
      status = COALESCE(${status || null}, status),
      notes = ${notes || null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(result[0])
}

// DELETE: Delete a voyage leg
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin", "voyage_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await sql`DELETE FROM voyage_legs WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
