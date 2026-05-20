import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT ci.*, v.voyage_name, s.name as ship_name
      FROM crew_checkins ci
      LEFT JOIN voyages v ON v.id = ci.voyage_id
      LEFT JOIN ships s ON s.id = ci.ship_id
      WHERE ci.crew_id = ${id}
      ORDER BY ci.checked_at DESC
    `
    // Determine current status (latest check)
    const latestCheck = rows.length > 0 ? rows[0] : null
    const currentStatus = latestCheck ? latestCheck.check_type : null
    return NextResponse.json({ records: rows, currentStatus })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const body = await req.json()
    const { voyage_id, ship_id, check_type, location, notes, recorded_by } = body

    if (!check_type || !["check_in", "check_out"].includes(check_type)) {
      return NextResponse.json({ error: "check_type must be check_in or check_out" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO crew_checkins (crew_id, voyage_id, ship_id, check_type, location, notes, recorded_by)
      VALUES (${id}, ${voyage_id || null}, ${ship_id || null}, ${check_type}, ${location || ''}, ${notes || ''}, ${recorded_by || ''})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
