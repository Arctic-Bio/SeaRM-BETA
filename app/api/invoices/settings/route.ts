import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()

    let rows = await sql`SELECT * FROM invoice_settings WHERE org_id = 'default' LIMIT 1`
    if (rows.length === 0) {
      rows = await sql`
        INSERT INTO invoice_settings (org_id, invoice_prefix, next_invoice_number, default_currency, payment_terms_days, tax_rate)
        VALUES ('default', 'INV-', 1, 'USD', 30, 0)
        RETURNING *
      `
    }
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const body = await req.json()

    const fields: string[] = []
    const values: unknown[] = []
    let p = 1

    const allowed = ["invoice_prefix", "default_currency", "payment_terms_days", "tax_rate", "company_name", "company_address", "company_email", "footer_notes"]
    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = $${p}`)
        values.push(body[key])
        p++
      }
    }
    if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 })

    fields.push(`updated_at = now()`)
    values.push("default")

    const result = await sql.query(
      `UPDATE invoice_settings SET ${fields.join(", ")} WHERE org_id = $${p} RETURNING *`, values
    )
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
