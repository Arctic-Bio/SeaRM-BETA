import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const crewId = searchParams.get("crewId")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const taskType = searchParams.get("task_type")
    const search = searchParams.get("search")
    const shipId = searchParams.get("shipId")
    const voyageId = searchParams.get("voyageId")

    // Build dynamic WHERE clauses
    const conditions: string[] = []
    const values: any[] = []
    let idx = 1

    if (crewId) { conditions.push(`t.crew_id = $${idx++}`); values.push(crewId) }
    if (shipId) { conditions.push(`t.ship_id = $${idx++}`); values.push(shipId) }
    if (voyageId) { conditions.push(`t.voyage_id = $${idx++}`); values.push(voyageId) }
    if (status && status !== "all") { conditions.push(`t.status = $${idx++}`); values.push(status) }
    if (priority && priority !== "all") { conditions.push(`t.priority = $${idx++}`); values.push(priority) }
    if (taskType && taskType !== "all") { conditions.push(`t.task_type = $${idx++}`); values.push(taskType) }
    if (search) {
      conditions.push(`(
        t.title ILIKE $${idx} OR t.description ILIKE $${idx}
        OR t.assigned_to ILIKE $${idx}
        OR (c.first_name || ' ' || c.last_name) ILIKE $${idx}
        OR s.name ILIKE $${idx}
        OR v.voyage_name ILIKE $${idx}
      )`)
      values.push(`%${search}%`)
      idx++
    }

    // Default: hide completed/cancelled unless explicitly filtering
    if (!status) {
      conditions.push(`t.status NOT IN ('completed', 'cancelled')`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const tasks = await sql.query(`
      SELECT t.*,
        c.first_name || ' ' || c.last_name as crew_name,
        v.voyage_name,
        s.name as ship_name
      FROM tasks t
      LEFT JOIN crew c ON t.crew_id = c.id
      LEFT JOIN voyages v ON t.voyage_id = v.id
      LEFT JOIN ships s ON t.ship_id = s.id
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
      LIMIT 200
    `, values)

    return NextResponse.json({ data: tasks })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDb()
    const body = await request.json()
    const {
      crew_id, voyage_id, ship_id, title, description = "",
      task_type = "general", priority = "medium", due_date, assigned_to = "",
    } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO tasks (crew_id, voyage_id, ship_id, title, description,
        task_type, priority, due_date, assigned_to)
      VALUES (${crew_id || null}, ${voyage_id || null}, ${ship_id || null},
        ${title}, ${description}, ${task_type}, ${priority},
        ${due_date || null}, ${assigned_to})
      RETURNING *
    `

    if (crew_id) {
      await sql`
        INSERT INTO activities (crew_id, voyage_id, activity_type, title, description, actor_name)
        VALUES (${crew_id}, ${voyage_id || null}, 'task_created', 'Task created',
          ${`Task "${title}" created`}, 'System')
      `
    }

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
