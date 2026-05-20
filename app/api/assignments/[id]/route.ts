import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const body = await request.json()
    const validFields = [
      "role", "department", "status", "expected_join_date", "actual_join_date",
      "expected_departure_date", "actual_departure_date", "sign_on_date",
      "sign_off_date", "days_at_sea", "crew_review", "crew_review_rating",
      "reviewed_by", "notes",
    ]

    for (const field of validFields) {
      if (body[field] !== undefined) {
        const value = body[field] === "" && field.includes("date") ? null : body[field]
        await sql.query(
          `UPDATE crew_assignments SET ${field} = $1, updated_at = now() WHERE id = $2`,
          [value, id]
        )
      }
    }

    // Log sign-on/sign-off activities
    if (body.status === "on_board" || body.sign_on_date) {
      const assignment = await sql`
        SELECT ca.crew_id, ca.voyage_id, c.first_name, c.last_name
        FROM crew_assignments ca JOIN crew_applications c ON ca.crew_id = c.id
        WHERE ca.id = ${id}
      `
      if (assignment[0]) {
        await sql`
          INSERT INTO activities (crew_id, voyage_id, activity_type, title, description, actor_name)
          VALUES (${assignment[0].crew_id}, ${assignment[0].voyage_id}, 'signed_on', 'Signed on',
            ${`${assignment[0].first_name} ${assignment[0].last_name} signed on to ship`}, 'System')
        `
      }
    }

    if (body.status === "signed_off" || body.sign_off_date) {
      const assignment = await sql`
        SELECT ca.crew_id, ca.voyage_id, c.first_name, c.last_name, ca.sign_on_date, ca.sign_off_date
        FROM crew_assignments ca JOIN crew_applications c ON ca.crew_id = c.id
        WHERE ca.id = ${id}
      `
      if (assignment[0]) {
        // Calculate days at sea if both dates exist
        if (assignment[0].sign_on_date) {
          const signOff = body.sign_off_date || new Date().toISOString().split("T")[0]
          const days = Math.ceil(
            (new Date(signOff).getTime() - new Date(assignment[0].sign_on_date).getTime()) / (1000 * 60 * 60 * 24)
          )
          await sql`UPDATE crew_assignments SET days_at_sea = ${days} WHERE id = ${id}`
        }
        await sql`
          INSERT INTO activities (crew_id, voyage_id, activity_type, title, description, actor_name)
          VALUES (${assignment[0].crew_id}, ${assignment[0].voyage_id}, 'signed_off', 'Signed off',
            ${`${assignment[0].first_name} ${assignment[0].last_name} signed off from ship`}, 'System')
        `
      }
    }

    const updated = await sql`
      SELECT ca.*, c.first_name || ' ' || c.last_name as crew_name,
        v.voyage_name, s.name as ship_name
      FROM crew_assignments ca
      JOIN crew_applications c ON ca.crew_id = c.id
      JOIN voyages v ON ca.voyage_id = v.id
      LEFT JOIN ships s ON v.ship_id = s.id
      WHERE ca.id = ${id}
    `
    return NextResponse.json({ data: updated[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    await sql`DELETE FROM crew_assignments WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
