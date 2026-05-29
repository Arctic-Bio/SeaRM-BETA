import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb()
    const { id } = await params
    const body = await req.json()
    if (body.items) {
      const items = body.items as { key: string; label: string; done: boolean }[]
      const done = items.filter((i) => i.done).length
      const total = items.length
      const progress = total > 0 ? Math.round((done / total) * 100) : 0
      const status = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending"
      await sql.query(
        `UPDATE onboarding_checklists SET items = $1::jsonb, progress = $2, status = $3, updated_at = now() WHERE id = $4::uuid`,
        [JSON.stringify(items), progress, status, id]
      )
      return NextResponse.json({ progress, status })
    }
    return NextResponse.json({ error: "No items provided" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb()
    const { id } = await params
    await sql.query(`DELETE FROM onboarding_checklists WHERE id = $1::uuid`, [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
