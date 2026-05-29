import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()

    const invoices = await sql`
      SELECT ci.*,
        ca.first_name as crew_first_name, ca.last_name as crew_last_name, ca.email as crew_email,
        v.voyage_name
      FROM crew_invoices ci
      LEFT JOIN crew ca ON ca.id = ci.crew_id
      LEFT JOIN voyages v ON v.id = ci.voyage_id
      WHERE ci.id = ${id}
    `
    if (!invoices.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const lineItems = await sql`
      SELECT * FROM invoice_line_items WHERE invoice_id = ${id} ORDER BY sort_order
    `

    return NextResponse.json({ ...invoices[0], line_items: lineItems })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const body = await req.json()
    const fields: string[] = []
    const values: unknown[] = []
    let p = 1

    const allowed = ["status", "due_date", "payment_method", "payment_reference", "paid_at", "notes", "internal_notes", "approved_by"]
    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = $${p}`)
        values.push(body[key])
        p++
      }
    }
    if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 })

    fields.push(`updated_at = now()`)
    values.push(id)

    const queryText = `UPDATE crew_invoices SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`
    const result = await sql.query(queryText, values)
    if (!result.length) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    await sql`DELETE FROM crew_invoices WHERE id = ${id} AND status = 'draft'`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
