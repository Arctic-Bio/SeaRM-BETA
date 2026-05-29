import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { encrypt } from "@/lib/email/encryption"
import { testConnection } from "@/lib/email/transport"
import type { EmailProvider } from "@/lib/email/types"


// GET: List all providers (passwords masked)
export async function GET() {
  try {
    const sql = getDb()
    const rows = await sql`SELECT * FROM email_providers ORDER BY is_default DESC, created_at DESC`
    const providers = rows.map((r: any) => ({ ...r, password_encrypted: r.password_encrypted ? "********" : "" }))
    return NextResponse.json(providers)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Create or update a provider, or test connection
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json()
    const { action } = body

    if (action === "test") {
      return handleTest(body)
    }
    if (action === "update") {
      return handleUpdate(body)
    }
    return handleCreate(body)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove a provider
export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    await sql`DELETE FROM email_providers WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleCreate(body: any) {
  const { name, provider_type, host, port, secure, username, password, from_email, from_name, reply_to, max_per_hour, tls_reject_unauthorized, is_default } = body
  if (!name?.trim() || !host?.trim() || !from_email?.trim()) {
    return NextResponse.json({ error: "Name, host, and from_email are required" }, { status: 400 })
  }
  const encryptedPwd = password ? encrypt(password) : null

  // If setting as default, unset other defaults
  if (is_default) {
    await sql`UPDATE email_providers SET is_default = false WHERE is_default = true`
  }

  const rows = await sql`
    INSERT INTO email_providers (
      name, provider_type, host, port, secure, username, password_encrypted,
      from_email, from_name, reply_to, max_per_hour, tls_reject_unauthorized, is_default
    ) VALUES (
      ${name.trim()}, ${provider_type || "smtp"}, ${host.trim()}, ${port || 587},
      ${secure !== false}, ${username || null}, ${encryptedPwd},
      ${from_email.trim()}, ${from_name || null}, ${reply_to || null},
      ${max_per_hour || 100}, ${tls_reject_unauthorized !== false}, ${is_default || false}
    ) RETURNING id
  `
  return NextResponse.json({ success: true, id: rows[0].id })
}

async function handleUpdate(body: any) {
  const { id, name, provider_type, host, port, secure, username, password, from_email, from_name, reply_to, max_per_hour, tls_reject_unauthorized, is_default, is_active } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  // If setting as default, unset others
  if (is_default) {
    await sql`UPDATE email_providers SET is_default = false WHERE is_default = true AND id != ${id}`
  }

  // Only update password if a new one is provided
  if (password && password !== "********") {
    const encryptedPwd = encrypt(password)
    await sql`UPDATE email_providers SET password_encrypted = ${encryptedPwd}, updated_at = NOW() WHERE id = ${id}`
  }

  await sql`
    UPDATE email_providers SET
      name = COALESCE(${name || null}, name),
      provider_type = COALESCE(${provider_type || null}, provider_type),
      host = COALESCE(${host || null}, host),
      port = COALESCE(${port || null}, port),
      secure = COALESCE(${secure ?? null}, secure),
      username = COALESCE(${username || null}, username),
      from_email = COALESCE(${from_email || null}, from_email),
      from_name = COALESCE(${from_name ?? null}, from_name),
      reply_to = COALESCE(${reply_to ?? null}, reply_to),
      max_per_hour = COALESCE(${max_per_hour || null}, max_per_hour),
      tls_reject_unauthorized = COALESCE(${tls_reject_unauthorized ?? null}, tls_reject_unauthorized),
      is_default = COALESCE(${is_default ?? null}, is_default),
      is_active = COALESCE(${is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
  `
  return NextResponse.json({ success: true })
}

async function handleTest(body: any) {
  const { id, host, port, secure, username, password, from_email, from_name, tls_reject_unauthorized } = body

  // Build a temporary provider object for testing
  let provider: EmailProvider
  if (id) {
    const rows = await sql`SELECT * FROM email_providers WHERE id = ${id}`
    if (!rows.length) return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    provider = rows[0] as any
  } else {
    provider = {
      id: "test", name: "Test", provider_type: "smtp",
      host: host || "", port: port || 587, secure: secure !== false,
      username: username || "", password_encrypted: password ? encrypt(password) : "",
      from_email: from_email || "", from_name: from_name || null,
      reply_to: null, is_default: false, is_active: true,
      max_per_hour: 100, tls_reject_unauthorized: tls_reject_unauthorized !== false,
      custom_headers: {}, last_tested_at: null, last_test_result: null, last_test_error: null,
      created_at: "", updated_at: "",
    }
  }

  const testResult = await testConnection(provider)

  // Save test result if existing provider
  if (id) {
    await sql`
      UPDATE email_providers SET
        last_tested_at = NOW(),
        last_test_result = ${testResult.success ? "success" : "failure"},
        last_test_error = ${testResult.error || null}
      WHERE id = ${id}
    `
  }

  return NextResponse.json(testResult)
}
