import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const crewId = searchParams.get("crew_id") || ""

    const conditions: string[] = []
    const params: unknown[] = []
    let p = 1

    if (status) { conditions.push(`ci.status = $${p}`); params.push(status); p++ }
    if (crewId) { conditions.push(`ci.crew_id = $${p}`); params.push(crewId); p++ }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const rows = await sql.query(`
      SELECT ci.*,
        ca.first_name as crew_first_name, ca.last_name as crew_last_name, ca.email as crew_email,
        v.voyage_name
      FROM crew_invoices ci
      LEFT JOIN crew_applications ca ON ca.id = ci.crew_id
      LEFT JOIN voyages v ON v.id = ci.voyage_id
      ${where}
      ORDER BY ci.created_at DESC
    `, params)

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

    // Get next invoice number
    const settings = await sql`SELECT * FROM invoice_settings WHERE org_id = 'default' LIMIT 1`
    const prefix = settings[0]?.invoice_prefix || "INV-"
    const nextNum = settings[0]?.next_invoice_number || 1
    const invoiceNumber = `${prefix}${String(nextNum).padStart(5, "0")}`

    // Calculate due date
    const paymentDays = settings[0]?.payment_terms_days || 30
    const issueDate = body.issue_date || new Date().toISOString().split("T")[0]
    const dueDate = body.due_date || new Date(new Date(issueDate).getTime() + paymentDays * 86400000).toISOString().split("T")[0]

    // Calculate subtotal from line items
    const lineItems = body.line_items || []
    const subtotal = lineItems.reduce((sum: number, li: any) => sum + (Number(li.quantity) * Number(li.unit_price)), 0)
    const taxRate = settings[0]?.tax_rate || 0
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount

    // Insert invoice
    const result = await sql`
      INSERT INTO crew_invoices (
        invoice_number, crew_id, voyage_id, issue_date, due_date,
        subtotal, tax_amount, total_amount, currency, status,
        notes, internal_notes, created_by
      ) VALUES (
        ${invoiceNumber}, ${body.crew_id || null}, ${body.voyage_id || null},
        ${issueDate}, ${dueDate},
        ${subtotal}, ${taxAmount}, ${totalAmount},
        ${body.currency || settings[0]?.default_currency || "USD"},
        'draft', ${body.notes || ""}, ${body.internal_notes || ""},
        ${session.name || ""}
      ) RETURNING *
    `
    const invoice = result[0]

    // Insert line items
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i]
      const amount = Number(li.quantity) * Number(li.unit_price)
      await sql`
        INSERT INTO invoice_line_items (
          invoice_id, description, category, quantity, unit,
          unit_price, amount, date_from, date_to, sort_order
        ) VALUES (
          ${invoice.id}, ${li.description}, ${li.category || "hours_worked"},
          ${li.quantity}, ${li.unit || "hours"}, ${li.unit_price}, ${amount},
          ${li.date_from || null}, ${li.date_to || null}, ${i}
        )
      `
    }

    // Increment invoice number
    await sql`UPDATE invoice_settings SET next_invoice_number = ${nextNum + 1} WHERE org_id = 'default'`

    return NextResponse.json(invoice, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
