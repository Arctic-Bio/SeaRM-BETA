import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendMail } from "@/lib/email/transport"
import type { EmailProvider } from "@/lib/email/types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/email-queue
 * Vercel Cron Job endpoint - processes pending/scheduled/failed emails.
 * Runs every 5 minutes. Protected by CRON_SECRET to prevent unauthorized access.
 *
 * How it works on Vercel serverless:
 * - Vercel Cron triggers this endpoint on a schedule (configured in vercel.json)
 * - It picks up pending emails whose scheduled_for <= now and attempts < max_retries
 * - Sends up to 50 emails per invocation to stay within serverless time limits
 * - Failed sends are retried on the next cron run (with exponential backoff consideration)
 * - Successfully sent emails are marked as "sent" with timestamp and message ID
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel automatically sends this header for cron jobs)
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Process pending emails scheduled for now or past
    const pending = await sql`
      SELECT q.*, 
        p.host, p.port, p.secure, p.username, p.password_encrypted,
        p.from_email, p.from_name, p.reply_to, p.max_per_hour, 
        p.tls_reject_unauthorized, p.custom_headers, p.provider_type, 
        p.is_active AS provider_active, p.name AS prov_name
      FROM email_queue q
      LEFT JOIN email_providers p ON q.provider_id = p.id
      WHERE q.status IN ('pending', 'retry')
        AND q.scheduled_for <= NOW()
        AND q.attempts < q.max_retries
      ORDER BY q.priority ASC, q.created_at ASC
      LIMIT 50
    `

    let sent = 0, failed = 0, skipped = 0

    for (const item of pending) {
      // Skip if provider is inactive or missing
      if (!item.provider_active || !item.host) {
        await sql`
          UPDATE email_queue 
          SET status = 'failed', error_message = 'Provider inactive or not found', 
              last_attempt_at = NOW(), attempts = attempts + 1 
          WHERE id = ${item.id}
        `
        failed++
        continue
      }

      const provider: EmailProvider = {
        id: item.provider_id, name: item.prov_name, provider_type: item.provider_type,
        host: item.host, port: item.port, secure: item.secure,
        username: item.username, password_encrypted: item.password_encrypted,
        from_email: item.from_email, from_name: item.from_name, reply_to: item.reply_to,
        is_default: false, is_active: true, max_per_hour: item.max_per_hour,
        tls_reject_unauthorized: item.tls_reject_unauthorized,
        custom_headers: item.custom_headers || {},
        last_tested_at: null, last_test_result: null, last_test_error: null,
        created_at: "", updated_at: "",
      }

      try {
        const result = await sendMail({
          provider, to: item.recipient_email, toName: item.recipient_name,
          subject: item.subject, html: item.body_html, text: item.body_text || undefined,
        })

        if (result.success) {
          await sql`
            UPDATE email_queue 
            SET status = 'sent', sent_at = NOW(), message_id = ${result.messageId || null}, 
                last_attempt_at = NOW(), attempts = attempts + 1 
            WHERE id = ${item.id}
          `
          sent++
        } else {
          const newAttempts = (item.attempts || 0) + 1
          const newStatus = newAttempts >= item.max_retries ? "failed" : "pending"
          await sql`
            UPDATE email_queue 
            SET status = ${newStatus}, error_message = ${result.error || null}, 
                last_attempt_at = NOW(), attempts = ${newAttempts} 
            WHERE id = ${item.id}
          `
          failed++
        }
      } catch (sendErr: any) {
        const newAttempts = (item.attempts || 0) + 1
        const newStatus = newAttempts >= item.max_retries ? "failed" : "pending"
        await sql`
          UPDATE email_queue 
          SET status = ${newStatus}, error_message = ${sendErr.message || 'Unknown error'}, 
              last_attempt_at = NOW(), attempts = ${newAttempts} 
          WHERE id = ${item.id}
        `
        failed++
      }
    }

    // 2. Auto-expire emails stuck in pending for > 24 hours with max retries reached
    const expired = await sql`
      UPDATE email_queue 
      SET status = 'failed', error_message = 'Expired: max retries exhausted'
      WHERE status = 'pending' AND attempts >= max_retries 
        AND created_at < NOW() - INTERVAL '24 hours'
    `

    return NextResponse.json({
      success: true,
      processed: pending.length,
      sent, failed, skipped,
      expired_count: expired.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("Cron email-queue error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
