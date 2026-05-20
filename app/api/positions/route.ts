import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const voyageId = searchParams.get("voyageId") || ""
    const department = searchParams.get("department") || ""

    const conditions: string[] = []
    const params: unknown[] = []
    let p = 1

    if (status) { conditions.push(`cp.status = $${p}`); params.push(status); p++ }
    if (voyageId) { conditions.push(`cp.voyage_id = $${p}`); params.push(voyageId); p++ }
    if (department) { conditions.push(`LOWER(cp.department) = $${p}`); params.push(department.toLowerCase()); p++ }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const rows = await sql.query(`
      SELECT cp.*,
        v.voyage_name, v.status as voyage_status, v.departure_date, v.return_date,
        s.name as ship_name,
        ac.first_name as assigned_first_name, ac.last_name as assigned_last_name
      FROM crew_positions cp
      LEFT JOIN voyages v ON v.id = cp.voyage_id
      LEFT JOIN ships s ON s.id = v.ship_id
      LEFT JOIN crew_applications ac ON ac.id = cp.assigned_crew_id
      ${where}
      ORDER BY
        CASE cp.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        cp.created_at DESC
    `, params)

    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json()
    const { voyage_id, position_name, department, required_skills, min_skill_level, priority, notes } = body

    const result = await sql`
      INSERT INTO crew_positions (voyage_id, position_name, department, required_skills, min_skill_level, priority, notes)
      VALUES (${voyage_id}, ${position_name}, ${department || ''}, ${JSON.stringify(required_skills || [])}, ${min_skill_level || 'Basic'}, ${priority || 'medium'}, ${notes || ''})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
