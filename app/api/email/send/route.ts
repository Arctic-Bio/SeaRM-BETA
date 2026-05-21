import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { renderTemplate } from "@/lib/email/template-engine"
import { sendMail } from "@/lib/email/transport"
import type { EmailProvider } from "@/lib/email/types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/email/send
 * Manual send: compose and send an email using a template + provider, or raw content.
 * Also used by the queue processor to retry/send pending emails.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "send_manual") return handleManualSend(body)
    if (action === "process_queue") return handleProcessQueue()
    if (action === "send_test") return handleTestSend(body)

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleManualSend(body: any) {
  const { template_id, provider_id, recipient_email, recipient_name, variables, cc, bcc } = body
  if (!recipient_email) return NextResponse.json({ error: "recipient_email required" }, { status: 400 })

  // Get provider
  let providerRows
  if (provider_id) {
    providerRows = await sql`SELECT * FROM email_providers WHERE id = ${provider_id} AND is_active = true`
  } else {
    providerRows = await sql`SELECT * FROM email_providers WHERE is_default = true AND is_active = true LIMIT 1`
  }
  if (!providerRows.length) providerRows = await sql`SELECT * FROM email_providers WHERE is_active = true ORDER BY created_at LIMIT 1`
  if (!providerRows.length) return NextResponse.json({ error: "No active email provider configured" }, { status: 400 })
  const provider = providerRows[0] as any as EmailProvider

  // Get template
  let subject: string, bodyHtml: string, bodyText: string | null = null
  if (template_id) {
    const tmplRows = await sql`SELECT * FROM email_templates WHERE id = ${template_id}`
    if (!tmplRows.length) return NextResponse.json({ error: "Template not found" }, { status: 404 })
    const tmpl = tmplRows[0]
    const data = { current_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), organization_name: "SeaRM", ...(variables || {}) }
    subject = renderTemplate(tmpl.subject, data)
    bodyHtml = renderTemplate(tmpl.body_html, data)
    bodyText = tmpl.body_text ? renderTemplate(tmpl.body_text, data) : null
  } else if (body.subject && body.body_html) {
    subject = body.subject
    bodyHtml = body.body_html
    bodyText = body.body_text || null
  } else {
    return NextResponse.json({ error: "Either template_id or subject+body_html required" }, { status: 400 })
  }

  const result = await sendMail({
    provider, to: recipient_email, toName: recipient_name, subject, html: bodyHtml, text: bodyText || undefined,
    cc: cc?.filter(Boolean), bcc: bcc?.filter(Boolean),
  })

  // Log to queue
  await sql`
    INSERT INTO email_queue (
      template_id, provider_id, recipient_email, recipient_name,
      subject, body_html, body_text, variables_used, status,
      attempts, sent_at, message_id, event_type, last_attempt_at, error_message
    ) VALUES (
      ${template_id || null}, ${provider.id}, ${recipient_email}, ${recipient_name || null},
      ${subject}, ${bodyHtml}, ${bodyText}, ${JSON.stringify(variables || {})},
      ${result.success ? "sent" : "failed"}, 1,
      ${result.success ? new Date().toISOString() : null},
      ${result.messageId || null}, 'manual_send',
      ${new Date().toISOString()}, ${result.error || null}
    )
  `

  return NextResponse.json(result)
}

async function handleProcessQueue() {
  // Process pending emails that are scheduled for now or past
  const pendingRows = await sql`
    SELECT q.*, p.host, p.port, p.secure, p.username, p.password_encrypted,
      p.from_email, p.from_name, p.reply_to, p.max_per_hour, p.tls_reject_unauthorized,
      p.custom_headers, p.provider_type, p.is_active AS provider_active, p.name AS prov_name
    FROM email_queue q
    LEFT JOIN email_providers p ON q.provider_id = p.id
    WHERE q.status = 'pending' AND q.scheduled_for <= NOW() AND q.attempts < q.max_retries
    ORDER BY q.priority ASC, q.created_at ASC
    LIMIT 20
  `

  let sent = 0, failed = 0
  for (const item of pendingRows) {
    if (!item.provider_active || !item.host) {
      await sql`UPDATE email_queue SET status = 'failed', error_message = 'No active provider', last_attempt_at = NOW(), attempts = attempts + 1 WHERE id = ${item.id}`
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

    const result = await sendMail({
      provider, to: item.recipient_email, toName: item.recipient_name,
      subject: item.subject, html: item.body_html, text: item.body_text || undefined,
    })

    if (result.success) {
      await sql`UPDATE email_queue SET status = 'sent', sent_at = NOW(), message_id = ${result.messageId || null}, last_attempt_at = NOW(), attempts = attempts + 1 WHERE id = ${item.id}`
      sent++
    } else {
      const newAttempts = (item.attempts || 0) + 1
      const newStatus = newAttempts >= item.max_retries ? "failed" : "pending"
      await sql`UPDATE email_queue SET status = ${newStatus}, error_message = ${result.error || null}, last_attempt_at = NOW(), attempts = ${newAttempts} WHERE id = ${item.id}`
      failed++
    }
  }

  return NextResponse.json({ processed: pendingRows.length, sent, failed })
}

async function handleTestSend(body: any) {
  const { provider_id, recipient_email } = body
  if (!recipient_email) return NextResponse.json({ error: "recipient_email required" }, { status: 400 })

  let providerRows
  if (provider_id) {
    providerRows = await sql`SELECT * FROM email_providers WHERE id = ${provider_id} AND is_active = true`
  } else {
    providerRows = await sql`SELECT * FROM email_providers WHERE is_default = true AND is_active = true LIMIT 1`
  }
  if (!providerRows.length) return NextResponse.json({ error: "No active provider" }, { status: 400 })
  const provider = providerRows[0] as any as EmailProvider

  const result = await sendMail({
    provider, to: recipient_email,
    subject: "SeaRM Email System - Test Email",
    html: `<div style="font-family:sans-serif;padding:20px;"><h2>SeaRM Email Test</h2><p>This is a test email from your SeaRM email system.</p><p>Provider: <strong>${provider.name}</strong></p><p>Sent at: ${new Date().toISOString()}</p><hr/><p style="color:#666;font-size:12px;">If you received this email, your SMTP configuration is working correctly.</p></div>`,
  })

  return NextResponse.json(result)
}
