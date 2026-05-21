// ============================================================================
// SeaRM Email System - Event Dispatcher
// Central event bus for firing system events that trigger automated emails.
// Usage: import { fireEmailEvent } from "@/lib/email/events"; fireEmailEvent("crew_application_received", { crew_name: "John", ... })
// ============================================================================

import { neon } from "@neondatabase/serverless"
import { renderTemplate } from "./template-engine"
import { sendMail } from "./transport"
import { decrypt } from "./encryption"
import type { SystemEvent, EmailProvider, TriggerConditions } from "./types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Fire a system event, find all active triggers, render templates, and queue/send emails.
 * This is the main entry point for the entire email automation system.
 *
 * @param eventType - The system event that occurred
 * @param eventData - Key-value data to pass to templates (crew_name, voyage_name, etc.)
 * @param recipientOverride - Optional override for recipient email (useful for custom events)
 */
export async function fireEmailEvent(
  eventType: SystemEvent | string,
  eventData: Record<string, any>,
  recipientOverride?: { email: string; name?: string }
): Promise<{ queued: number; sent: number; errors: string[] }> {
  const result = { queued: 0, sent: 0, errors: [] as string[] }

  try {
    // Find all active triggers for this event
    const triggers = await sql`
      SELECT t.*, tmpl.subject AS template_subject, tmpl.body_html AS template_body_html,
        tmpl.body_text AS template_body_text, tmpl.slug AS template_slug, tmpl.name AS template_name,
        tmpl.variables AS template_variables
      FROM email_triggers t
      LEFT JOIN email_templates tmpl ON t.template_id = tmpl.id AND tmpl.is_active = true
      WHERE t.event_type = ${eventType} AND t.is_active = true
      ORDER BY t.priority ASC
    `

    if (!triggers.length) return result

    for (const trigger of triggers) {
      try {
        // Check conditions
        if (trigger.conditions && Object.keys(trigger.conditions).length > 0) {
          if (!evaluateConditions(trigger.conditions as TriggerConditions, eventData)) continue
        }

        // Skip if no template linked
        if (!trigger.template_subject) {
          result.errors.push(`Trigger "${trigger.name}" has no active template`)
          continue
        }

        // Resolve recipient
        const recipient = recipientOverride || resolveRecipient(trigger, eventData)
        if (!recipient?.email) {
          result.errors.push(`Trigger "${trigger.name}": could not resolve recipient email`)
          continue
        }

        // Enrich data with defaults
        const enrichedData = {
          current_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          organization_name: "SeaRM",
          ...eventData,
        }

        // Render template
        const subject = renderTemplate(trigger.template_subject, enrichedData)
        const bodyHtml = renderTemplate(trigger.template_body_html, enrichedData)
        const bodyText = trigger.template_body_text ? renderTemplate(trigger.template_body_text, enrichedData) : null

        // Get provider (trigger-specific or default)
        const provider = await getProvider(trigger.provider_id)
        if (!provider) {
          // Queue without sending if no provider configured
          await queueEmail(trigger, recipient, subject, bodyHtml, bodyText, enrichedData, eventType, null)
          result.queued++
          continue
        }

        // Check delay
        if (trigger.delay_minutes > 0) {
          const scheduledFor = new Date(Date.now() + trigger.delay_minutes * 60000).toISOString()
          await queueEmail(trigger, recipient, subject, bodyHtml, bodyText, enrichedData, eventType, provider.id, scheduledFor)
          result.queued++
          continue
        }

        // Send immediately
        const sendResult = await sendMail({
          provider,
          to: recipient.email,
          toName: recipient.name,
          subject,
          html: bodyHtml,
          text: bodyText || undefined,
          cc: trigger.cc_addresses || undefined,
          bcc: trigger.bcc_addresses || undefined,
        })

        // Log to queue table
        await sql`
          INSERT INTO email_queue (
            trigger_id, template_id, provider_id, recipient_email, recipient_name,
            subject, body_html, body_text, variables_used, status, priority,
            attempts, max_retries, sent_at, message_id, event_type, event_data,
            last_attempt_at, error_message
          ) VALUES (
            ${trigger.id}, ${trigger.template_id}, ${provider.id},
            ${recipient.email}, ${recipient.name || null},
            ${subject}, ${bodyHtml}, ${bodyText}, ${JSON.stringify(enrichedData)},
            ${sendResult.success ? "sent" : "failed"}, ${trigger.priority},
            1, ${trigger.max_retries},
            ${sendResult.success ? new Date().toISOString() : null},
            ${sendResult.messageId || null},
            ${eventType}, ${JSON.stringify(eventData)},
            ${new Date().toISOString()},
            ${sendResult.error || null}
          )
        `

        if (sendResult.success) result.sent++
        else result.errors.push(`Trigger "${trigger.name}": ${sendResult.error}`)
      } catch (triggerErr: any) {
        result.errors.push(`Trigger "${trigger.name}": ${triggerErr.message}`)
      }
    }
  } catch (err: any) {
    result.errors.push(`Event dispatch error: ${err.message}`)
  }

  return result
}

function resolveRecipient(trigger: any, data: Record<string, any>): { email: string; name?: string } | null {
  switch (trigger.recipient_type) {
    case "crew_member":
    case "applicant":
      return { email: data.crew_email || data.email, name: data.crew_name || data.name }
    case "admin":
      return { email: data.admin_email || data.email, name: data.admin_name }
    case "custom_email":
      return { email: trigger.recipient_field, name: undefined }
    case "event_data_field":
      return { email: data[trigger.recipient_field], name: data[`${trigger.recipient_field}_name`] }
    default:
      return { email: data.email, name: data.name }
  }
}

function evaluateConditions(conditions: TriggerConditions, data: Record<string, any>): boolean {
  // AND group
  if (conditions.and) {
    return conditions.and.every((c) => evaluateConditions(c, data))
  }
  // OR group
  if (conditions.or) {
    return conditions.or.some((c) => evaluateConditions(c, data))
  }
  // Single condition
  if (!conditions.field || !conditions.operator) return true

  const fieldVal = data[conditions.field]
  const condVal = conditions.value

  switch (conditions.operator) {
    case "equals": return fieldVal == condVal
    case "not_equals": return fieldVal != condVal
    case "contains": return typeof fieldVal === "string" && fieldVal.includes(String(condVal))
    case "in": return Array.isArray(condVal) && condVal.includes(fieldVal)
    case "gt": return Number(fieldVal) > Number(condVal)
    case "lt": return Number(fieldVal) < Number(condVal)
    case "exists": return fieldVal !== undefined && fieldVal !== null && fieldVal !== ""
    default: return true
  }
}

async function getProvider(providerId: string | null): Promise<EmailProvider | null> {
  let rows
  if (providerId) {
    rows = await sql`SELECT * FROM email_providers WHERE id = ${providerId} AND is_active = true`
  } else {
    rows = await sql`SELECT * FROM email_providers WHERE is_default = true AND is_active = true LIMIT 1`
  }
  if (!rows.length) {
    rows = await sql`SELECT * FROM email_providers WHERE is_active = true ORDER BY created_at ASC LIMIT 1`
  }
  if (!rows.length) return null
  const p = rows[0] as any
  return { ...p, password_encrypted: p.password_encrypted } as EmailProvider
}

async function queueEmail(
  trigger: any, recipient: { email: string; name?: string },
  subject: string, bodyHtml: string, bodyText: string | null,
  variables: Record<string, any>, eventType: string,
  providerId: string | null, scheduledFor?: string
) {
  await sql`
    INSERT INTO email_queue (
      trigger_id, template_id, provider_id, recipient_email, recipient_name,
      subject, body_html, body_text, variables_used, status, priority,
      max_retries, event_type, event_data, scheduled_for
    ) VALUES (
      ${trigger.id}, ${trigger.template_id}, ${providerId},
      ${recipient.email}, ${recipient.name || null},
      ${subject}, ${bodyHtml}, ${bodyText}, ${JSON.stringify(variables)},
      'pending', ${trigger.priority}, ${trigger.max_retries},
      ${eventType}, ${JSON.stringify(variables)},
      ${scheduledFor || new Date().toISOString()}
    )
  `
}
