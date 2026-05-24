import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sql = getDb()
    const body = await req.json()
    const { crew_id, generation_type } = body
    // generation_type: "sea_days" | "position" | "hours" | "custom"

    if (!crew_id) return NextResponse.json({ error: "crew_id required" }, { status: 400 })

    // Get crew info
    const crew = await sql`SELECT id, first_name, last_name, email FROM crew_applications WHERE id = ${crew_id}`
    if (!crew.length) return NextResponse.json({ error: "Crew not found" }, { status: 404 })

    // Get settings
    const settings = await sql`SELECT * FROM invoice_settings WHERE org_id = 'default' LIMIT 1`
    const prefix = settings[0]?.invoice_prefix || "INV-"
    const nextNum = settings[0]?.next_invoice_number || 1
    const invoiceNumber = `${prefix}${String(nextNum).padStart(5, "0")}`
    const paymentDays = settings[0]?.payment_terms_days || 30
    const taxRate = Number(settings[0]?.tax_rate || 0)

    let lineItems: { description: string; category: string; quantity: number; unit: string; unit_price: number; date_from?: string; date_to?: string }[] = []
    let voyageId: string | null = null

    if (generation_type === "sea_days") {
      // Pull sea time records and generate line items from daily rate
      const seaTime = await sql`
        SELECT st.*, v.voyage_name, s.name as ship_name
        FROM crew_sea_time st
        LEFT JOIN voyages v ON v.id = st.voyage_id
        LEFT JOIN ships s ON s.id = st.ship_id
        WHERE st.crew_id = ${crew_id}
        ORDER BY st.embarked_at DESC
      `
      // Get position pay rate for this crew
      const positions = await sql`
        SELECT cp.* FROM crew_positions cp
        WHERE cp.assigned_crew_id = ${crew_id} AND cp.is_paid = true
        ORDER BY cp.updated_at DESC LIMIT 1
      `
      const dailyRate = Number(positions[0]?.daily_rate || body.daily_rate || 0)
      const hourlyRate = Number(positions[0]?.hourly_rate || body.hourly_rate || 0)
      const rate = dailyRate > 0 ? dailyRate : hourlyRate * 8 // fallback to 8hr day

      for (const st of seaTime) {
        if (st.days > 0) {
          voyageId = voyageId || st.voyage_id
          lineItems.push({
            description: `Sea days: ${st.ship_name || "Ship"} - ${st.voyage_name || "Voyage"} (${st.role || "Crew"})`,
            category: "hours_worked",
            quantity: Number(st.days),
            unit: "days",
            unit_price: rate,
            date_from: st.embarked_at || undefined,
            date_to: st.disembarked_at || undefined,
          })
        }
      }
    } else if (generation_type === "position") {
      // Pull paid position assignments and generate from estimated hours
      const positions = await sql`
        SELECT cp.*, v.voyage_name
        FROM crew_positions cp
        LEFT JOIN voyages v ON v.id = cp.voyage_id
        WHERE cp.assigned_crew_id = ${crew_id} AND cp.is_paid = true
      `
      for (const pos of positions) {
        voyageId = voyageId || pos.voyage_id
        const rate = Number(pos.hourly_rate || 0)
        const hours = Number(pos.estimated_hours || 0)
        if (rate > 0 && hours > 0) {
          lineItems.push({
            description: `${pos.position_name} - ${pos.voyage_name || "Campaign"}`,
            category: "hours_worked",
            quantity: hours,
            unit: "hours",
            unit_price: rate,
          })
        }
        const daily = Number(pos.daily_rate || 0)
        if (daily > 0 && hours === 0) {
          // Use daily rate with estimated 30 days
          lineItems.push({
            description: `${pos.position_name} - ${pos.voyage_name || "Campaign"} (daily)`,
            category: "hours_worked",
            quantity: body.days || 30,
            unit: "days",
            unit_price: daily,
          })
        }
      }
    } else if (generation_type === "hours") {
      // Pull from crew_hourly_logs (approved, not yet invoiced)
      const logs = await sql`
        SELECT chl.*, v.voyage_name
        FROM crew_hourly_logs chl
        LEFT JOIN voyages v ON v.id = chl.voyage_id
        WHERE chl.crew_id = ${crew_id} AND chl.status = 'approved' AND chl.invoice_id IS NULL
        ORDER BY chl.log_date ASC
      `
      for (const log of logs) {
        voyageId = voyageId || log.voyage_id
        lineItems.push({
          description: `${log.task_description || log.department || "Work"} - ${log.log_date}`,
          category: "hours_worked",
          quantity: Number(log.hours_worked),
          unit: "hours",
          unit_price: Number(log.hourly_rate || 0),
          date_from: log.log_date,
          date_to: log.log_date,
        })
        if (Number(log.overtime_hours) > 0) {
          lineItems.push({
            description: `Overtime - ${log.log_date}`,
            category: "overtime",
            quantity: Number(log.overtime_hours),
            unit: "hours",
            unit_price: Number(log.hourly_rate || 0) * 1.5,
            date_from: log.log_date,
            date_to: log.log_date,
          })
        }
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json({
        error: "No billable items found for this crew member",
        generation_type,
      }, { status: 400 })
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.unit_price), 0)
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount
    const issueDate = new Date().toISOString().split("T")[0]
    const dueDate = new Date(Date.now() + paymentDays * 86400000).toISOString().split("T")[0]

    // Insert invoice
    const result = await sql`
      INSERT INTO crew_invoices (
        invoice_number, crew_id, voyage_id, issue_date, due_date,
        subtotal, tax_amount, total_amount,
        currency, status, notes, created_by
      ) VALUES (
        ${invoiceNumber}, ${crew_id}, ${voyageId},
        ${issueDate}, ${dueDate},
        ${subtotal}, ${taxAmount}, ${totalAmount},
        ${settings[0]?.default_currency || "USD"}, 'draft',
        ${`Auto-generated from ${generation_type}`},
        ${session.name || ""}
      ) RETURNING *
    `
    const invoice = result[0]

    // Insert line items
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i]
      await sql`
        INSERT INTO invoice_line_items (
          invoice_id, description, category, quantity, unit,
          unit_price, amount, date_from, date_to, sort_order
        ) VALUES (
          ${invoice.id}, ${li.description}, ${li.category},
          ${li.quantity}, ${li.unit}, ${li.unit_price},
          ${li.quantity * li.unit_price},
          ${li.date_from || null}, ${li.date_to || null}, ${i}
        )
      `
    }

    // Mark hourly logs as invoiced (if hours type)
    if (generation_type === "hours") {
      await sql`
        UPDATE crew_hourly_logs SET status = 'invoiced', invoice_id = ${invoice.id}
        WHERE crew_id = ${crew_id} AND status = 'approved' AND invoice_id IS NULL
      `
    }

    // Increment invoice number
    await sql`UPDATE invoice_settings SET next_invoice_number = ${nextNum + 1} WHERE org_id = 'default'`

    // Return full invoice with line items
    return NextResponse.json({
      ...invoice,
      line_items: lineItems.map((li, i) => ({ ...li, amount: li.quantity * li.unit_price, sort_order: i })),
      crew_first_name: crew[0].first_name,
      crew_last_name: crew[0].last_name,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
