import { NextRequest, NextResponse } from "next/server"
import { getDb, CREW_STATUSES, STATUS_LABELS, type CrewStatus } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()
    const { id, newStatus } = body

    if (!id || !newStatus) {
      return NextResponse.json({ error: "id and newStatus are required" }, { status: 400 })
    }

    if (!CREW_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get old status
    const old = await sql`SELECT status, first_name, last_name FROM crew WHERE id = ${id}`
    if (old.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const oldStatus = old[0].status as CrewStatus
    const name = `${old[0].first_name} ${old[0].last_name}`

    // Update status
    await sql`UPDATE crew SET status = ${newStatus}, updated_at = now() WHERE id = ${id}`

    // Log activity
    await sql`
      INSERT INTO activities (crew_id, activity_type, title, description, actor_name)
      VALUES (${id}, 'status_change', 'Status changed',
        ${`${name}: ${STATUS_LABELS[oldStatus]} -> ${STATUS_LABELS[newStatus as CrewStatus]}`},
        'System')
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
