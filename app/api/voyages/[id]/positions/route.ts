import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const positions = await sql`
      SELECT cp.*,
        ca.first_name || ' ' || ca.last_name as assigned_crew_name,
        ca.email as assigned_crew_email
      FROM crew_positions cp
      LEFT JOIN crew ca ON cp.assigned_crew_id = ca.id
      WHERE cp.voyage_id = ${id}
      ORDER BY p.department, p.name
    `
    return NextResponse.json({ data: positions })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const body = await request.json()
    const { position_id, department = "", required_skills = [], notes = "" } = body

    if (!position_name) {
      return NextResponse.json({ error: "Position name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO crew_positions (voyage_id, position_id, department, required_skills, notes)
      VALUES (${id}, ${position_name}, ${department}, ${JSON.stringify(required_skills)}, ${notes})
      RETURNING *
    `

    await sql`
      INSERT INTO activities (voyage_id, activity_type, title, description, actor_name)
      VALUES (${id}, 'position_opened', 'Position opened', ${`Position "${position_name}" opened for voyage`}, 'System')
    `

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
