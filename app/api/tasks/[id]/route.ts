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
      "title", "description", "task_type", "status",
      "priority", "due_date", "assigned_to",
    ]

    for (const field of validFields) {
      if (body[field] !== undefined) {
        const value = body[field] === "" && field === "due_date" ? null : body[field]
        await sql.query(
          `UPDATE tasks SET ${field} = $1, updated_at = now() WHERE id = $2`,
          [value, id]
        )
      }
    }

    // If completing task, set completed_at
    if (body.status === "completed") {
      await sql`UPDATE tasks SET completed_at = now() WHERE id = ${id}`

      const task = await sql`
        SELECT t.crew_id, t.voyage_id, t.title
        FROM tasks t WHERE t.id = ${id}
      `
      if (task[0]?.crew_id) {
        await sql`
          INSERT INTO activities (crew_id, voyage_id, activity_type, title, description, actor_name)
          VALUES (${task[0].crew_id}, ${task[0].voyage_id}, 'task_completed', 'Task completed',
            ${`Task "${task[0].title}" completed`}, 'System')
        `
      }
    }

    const updated = await sql`
      SELECT t.*, c.first_name || ' ' || c.last_name as crew_name, v.voyage_name
      FROM tasks t
      LEFT JOIN crew c ON t.crew_id = c.id
      LEFT JOIN voyages v ON t.voyage_id = v.id
      WHERE t.id = ${id}
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
    await sql`DELETE FROM tasks WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
