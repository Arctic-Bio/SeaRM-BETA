import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    // Get crew currently checked in (last check-in with no subsequent check-out)
    const onBoard = await sql`
      SELECT DISTINCT ON (cc.crew_id)
        cc.crew_id, cc.check_type, cc.checked_at, cc.location,
        ca.first_name, ca.last_name, ca.email, ca.status as crew_status,
        ca.department_preference
      FROM crew_checkins cc
      INNER JOIN crew ca ON ca.id = cc.crew_id
      WHERE (cc.ship_id = ${id} OR cc.voyage_id IN (SELECT v.id FROM voyages v WHERE v.ship_id = ${id}))
      ORDER BY cc.crew_id, cc.checked_at DESC
    `
    const currentlyOnBoard = onBoard.filter((r: any) => r.check_type === "check_in")

    // Get all crew assigned to active/crewing voyages on this ship
    const assigned = await sql`
      SELECT ca2.crew_id, ca2.role, ca2.department, ca2.status as assignment_status,
        cr.first_name, cr.last_name, cr.email,
        v.voyage_name
      FROM crew_assignments ca2
      INNER JOIN crew cr ON cr.id = ca2.crew_id
      INNER JOIN voyages v ON v.id = ca2.voyage_id
      WHERE v.ship_id = ${id}
        AND ca2.status IN ('assigned', 'travel', 'on_board', 'active')
      ORDER BY ca2.department, ca2.role
    `

    return NextResponse.json({ onBoard: currentlyOnBoard, assigned })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
