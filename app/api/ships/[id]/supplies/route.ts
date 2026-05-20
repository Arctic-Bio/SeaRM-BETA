import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT * FROM ship_supplies WHERE ship_id = ${id} ORDER BY category, item_name
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
      INSERT INTO ship_supplies (ship_id, item_name, category, quantity, unit, min_quantity, last_restocked, notes)
      VALUES (${id}, ${body.item_name || ""}, ${body.category || "general"}, ${body.quantity || 0},
        ${body.unit || "units"}, ${body.min_quantity || 0}, ${body.last_restocked || null}, ${body.notes || ""})
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
    const allowed = ["item_name", "category", "quantity", "unit", "min_quantity", "last_restocked", "notes"]
    for (const key of allowed) {
      if (key in body) { fields.push(`${key} = $${p}`); values.push(body[key]); p++ }
    }
    if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 })
    fields.push("updated_at = now()")
    values.push(body.id)
    const result = await sql.query(`UPDATE ship_supplies SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`, values)
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(req.url)
    const sid = searchParams.get("sid")
    if (!sid) return NextResponse.json({ error: "sid required" }, { status: 400 })
    await sql`DELETE FROM ship_supplies WHERE id = ${sid}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
