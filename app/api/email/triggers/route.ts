import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET: List all triggers with joined template/provider names
export async function GET() {
  try {
    const rows = await sql`
      SELECT t.*, tmpl.name AS template_name, tmpl.slug AS template_slug,
        p.name AS provider_name
      FROM email_triggers t
      LEFT JOIN email_templates tmpl ON t.template_id = tmpl.id
      LEFT JOIN email_providers p ON t.provider_id = p.id
      ORDER BY t.event_type, t.priority
    `
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create or update a trigger
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.action === "update") return handleUpdate(body)
    return handleCreate(body)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove a trigger
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    await sql`DELETE FROM email_triggers WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleCreate(body: any) {
  const { name, event_type, template_id, provider_id, recipient_type, recipient_field, cc_addresses, bcc_addresses, conditions, delay_minutes, priority, max_retries, created_by } = body
  if (!name?.trim() || !event_type) {
    return NextResponse.json({ error: "Name and event_type are required" }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO email_triggers (
      name, event_type, template_id, provider_id, recipient_type, recipient_field,
      cc_addresses, bcc_addresses, conditions, delay_minutes, priority, max_retries, created_by
    ) VALUES (
      ${name.trim()}, ${event_type}, ${template_id || null}, ${provider_id || null},
      ${recipient_type || "crew_member"}, ${recipient_field || "email"},
      ${cc_addresses ? `{${cc_addresses.filter(Boolean).join(",")}}` : null},
      ${bcc_addresses ? `{${bcc_addresses.filter(Boolean).join(",")}}` : null},
      ${JSON.stringify(conditions || {})}, ${delay_minutes || 0},
      ${priority || 5}, ${max_retries || 3}, ${created_by || null}
    ) RETURNING id
  `
  return NextResponse.json({ success: true, id: rows[0].id })
}

async function handleUpdate(body: any) {
  const { id, name, event_type, template_id, provider_id, recipient_type, recipient_field, cc_addresses, bcc_addresses, conditions, delay_minutes, is_active, priority, max_retries } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await sql`
    UPDATE email_triggers SET
      name = COALESCE(${name || null}, name),
      event_type = COALESCE(${event_type || null}, event_type),
      template_id = COALESCE(${template_id || null}, template_id),
      provider_id = COALESCE(${provider_id || null}, provider_id),
      recipient_type = COALESCE(${recipient_type || null}, recipient_type),
      recipient_field = COALESCE(${recipient_field || null}, recipient_field),
      cc_addresses = COALESCE(${cc_addresses ? `{${cc_addresses.filter(Boolean).join(",")}}` : null}, cc_addresses),
      bcc_addresses = COALESCE(${bcc_addresses ? `{${bcc_addresses.filter(Boolean).join(",")}}` : null}, bcc_addresses),
      conditions = COALESCE(${conditions ? JSON.stringify(conditions) : null}, conditions),
      delay_minutes = COALESCE(${delay_minutes ?? null}, delay_minutes),
      is_active = COALESCE(${is_active ?? null}, is_active),
      priority = COALESCE(${priority || null}, priority),
      max_retries = COALESCE(${max_retries || null}, max_retries),
      updated_at = NOW()
    WHERE id = ${id}
  `
  return NextResponse.json({ success: true })
}
