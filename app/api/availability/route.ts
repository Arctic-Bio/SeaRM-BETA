import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()
    // Get all crew with their availability and assignments
    const crew = await sql`
      SELECT ca.id, ca.first_name, ca.last_name, ca.availability_start_date, ca.duration, ca.status, ca.department_preference
      FROM crew ca
      WHERE ca.status IN ('verified', 'volunteer', 'active', 'standby', 'application')
      ORDER BY ca.first_name, ca.last_name
    `

    // Get all voyage assignments
    const assignments = await sql`
      SELECT a.crew_id, a.voyage_id, a.role, a.status as assignment_status,
        v.voyage_name, v.departure_date, v.return_date, v.status as voyage_status, s.name as ship_name
      FROM crew_assignments a
      JOIN voyages v ON a.voyage_id = v.id
      LEFT JOIN ships s ON v.ship_id = s.id
      WHERE a.status NOT IN ('cancelled')
      ORDER BY v.departure_date
    `

    // Get voyages for timeline reference
    const voyages = await sql`
      SELECT id, voyage_name, departure_date, return_date, status, ship_id
      FROM voyages WHERE status NOT IN ('cancelled')
      ORDER BY departure_date
    `

    return NextResponse.json({ crew, assignments, voyages })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
