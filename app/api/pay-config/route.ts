import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const rows = await sql`SELECT * FROM crew_pay_config ORDER BY position_name ASC`
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const body = await req.json()

    const result = await sql`
      INSERT INTO crew_pay_config (
        position_name, department, is_volunteer, hourly_rate,
        daily_rate, currency, overtime_rate, notes
      ) VALUES (
        ${body.position_name}, ${body.department || null},
        ${body.is_volunteer ?? true}, ${body.hourly_rate || 0},
        ${body.daily_rate || 0}, ${body.currency || "USD"},
        ${body.overtime_rate || 0}, ${body.notes || ""}
      ) RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
