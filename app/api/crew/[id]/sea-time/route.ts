import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT st.*, v.voyage_name, s.name as ship_name
      FROM crew_sea_time st
      LEFT JOIN voyages v ON v.id = st.voyage_id
      LEFT JOIN ships s ON s.id = st.ship_id
      WHERE st.crew_id = ${id}
      ORDER BY st.embarked_at DESC NULLS LAST
    `
    // Compute total days
    const totalDays = rows.reduce((sum: number, r: any) => sum + (r.days || 0), 0)
    return NextResponse.json({ records: rows, totalDays })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const body = await req.json()
    const { voyage_id, ship_id, role, embarked_at, disembarked_at, days, notes } = body

    const result = await sql`
      INSERT INTO crew_sea_time (crew_id, voyage_id, ship_id, role, embarked_at, disembarked_at, days, notes)
      VALUES (${id}, ${voyage_id || null}, ${ship_id || null}, ${role || ''}, ${embarked_at || null}, ${disembarked_at || null}, ${days || 0}, ${notes || ''})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
