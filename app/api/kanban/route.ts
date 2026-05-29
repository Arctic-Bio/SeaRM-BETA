import { NextResponse } from "next/server"
import { getDb, CREW_STATUSES } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()

    // Get all crew grouped by status with key info
    const crew = await sql`
      SELECT id, first_name, last_name, email, status, rating,
        country, maritime_qualifications, department_preference,
        availability_start_date, created_at
      FROM crew
      ORDER BY rating DESC, created_at DESC
    `

    // Group by status
    const columns: Record<string, typeof crew> = {}
    for (const status of CREW_STATUSES) {
      columns[status] = []
    }
    for (const member of crew) {
      const status = member.status as string
      if (columns[status]) {
        columns[status].push(member)
      }
    }

    return NextResponse.json({ columns })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
