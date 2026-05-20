import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT * FROM ship_maintenance WHERE ship_id = ${id} ORDER BY scheduled_date DESC NULLS LAST, created_at DESC
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const body = await req.json()
    const rows = await sql`
      INSERT INTO ship_maintenance (ship_id, title, category, status, priority, description, scheduled_date, completed_date, cost, performed_by, notes)
      VALUES (${id}, ${body.title || ""}, ${body.category || "general"}, ${body.status || "scheduled"}, ${body.priority || "medium"},
        ${body.description || ""}, ${body.scheduled_date || null}, ${body.completed_date || null},
        ${body.cost || 0}, ${body.performed_by || ""}, ${body.notes || ""})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1
    const allowed = ["title", "category", "status", "priority", "description", "scheduled_date", "completed_date", "cost", "performed_by", "notes"]
    for (const key of allowed) {
      if (key in body) { fields.push(`${key} = $${p}`); values.push(body[key]); p++ }
    }
    if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 })
    fields.push("updated_at = now()")
    values.push(body.id)
    const result = await sql.query(`UPDATE ship_maintenance SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`, values)
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(req.url)
    const mid = searchParams.get("mid")
    if (!mid) return NextResponse.json({ error: "mid required" }, { status: 400 })
    await sql`DELETE FROM ship_maintenance WHERE id = ${mid}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
