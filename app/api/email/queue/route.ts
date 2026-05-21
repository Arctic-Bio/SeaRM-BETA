import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET: List queue items with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const offset = parseInt(searchParams.get("offset") || "0")

    let rows
    if (status && status !== "all") {
      rows = await sql`
        SELECT q.*, tmpl.name AS template_name, p.name AS provider_name, tr.name AS trigger_name
        FROM email_queue q
        LEFT JOIN email_templates tmpl ON q.template_id = tmpl.id
        LEFT JOIN email_providers p ON q.provider_id = p.id
        LEFT JOIN email_triggers tr ON q.trigger_id = tr.id
        WHERE q.status = ${status}
        ORDER BY q.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT q.*, tmpl.name AS template_name, p.name AS provider_name, tr.name AS trigger_name
        FROM email_queue q
        LEFT JOIN email_templates tmpl ON q.template_id = tmpl.id
        LEFT JOIN email_providers p ON q.provider_id = p.id
        LEFT JOIN email_triggers tr ON q.trigger_id = tr.id
        ORDER BY q.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    // Get stats
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE status = 'sending') AS sending,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) AS total
      FROM email_queue
    `

    return NextResponse.json({ items: rows, stats: stats[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Retry failed emails, cancel pending, or purge old
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, id, ids } = body

    if (action === "retry" && id) {
      await sql`UPDATE email_queue SET status = 'pending', error_message = NULL, attempts = 0 WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    if (action === "retry_all_failed") {
      const result = await sql`UPDATE email_queue SET status = 'pending', error_message = NULL, attempts = 0 WHERE status = 'failed' RETURNING id`
      return NextResponse.json({ success: true, count: result.length })
    }

    if (action === "cancel" && id) {
      await sql`UPDATE email_queue SET status = 'cancelled' WHERE id = ${id} AND status = 'pending'`
      return NextResponse.json({ success: true })
    }

    if (action === "cancel_all_pending") {
      const result = await sql`UPDATE email_queue SET status = 'cancelled' WHERE status = 'pending' RETURNING id`
      return NextResponse.json({ success: true, count: result.length })
    }

    if (action === "purge") {
      const days = body.days || 30
      const result = await sql`DELETE FROM email_queue WHERE created_at < NOW() - INTERVAL '1 day' * ${days} AND status IN ('sent', 'cancelled') RETURNING id`
      return NextResponse.json({ success: true, count: result.length })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
