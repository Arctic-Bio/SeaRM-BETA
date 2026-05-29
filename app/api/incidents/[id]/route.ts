import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb()
    const { id } = await params
    const body = await req.json()
    const updates: string[] = []
    const values: any[] = []
    let idx = 0
    for (const key of ["title", "description", "severity", "category", "status", "location", "corrective_actions", "follow_up", "reported_by"]) {
      if (body[key] !== undefined) { idx++; updates.push(`${key} = $${idx}`); values.push(body[key]) }
    }
    if (body.crew_involved !== undefined) { idx++; updates.push(`crew_involved = $${idx}::jsonb`); values.push(JSON.stringify(body.crew_involved)) }
    updates.push(`updated_at = now()`)
    if (!updates.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    idx++; values.push(id)
    await sql.query(`UPDATE incidents SET ${updates.join(", ")} WHERE id = $${idx}`, values)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb()
    const { id } = await params
    await sql`DELETE FROM incidents WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
