import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const body = await req.json()
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1

    const allowed = ["position_name", "department", "required_skills", "min_skill_level", "priority", "status", "assigned_crew_id", "notes"]
    for (const key of allowed) {
      if (key in body) {
        const val = key === "required_skills" ? JSON.stringify(body[key]) : body[key]
        fields.push(`${key} = $${p}`)
        values.push(val)
        p++
      }
    }
    if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 })

    fields.push(`updated_at = now()`)
    values.push(id)

    const result = await sql.query(
      `UPDATE crew_positions SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`, values
    )
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    await sql`DELETE FROM crew_positions WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
