import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { v4Fallback } from "@/lib/uuid"
import {
  ensureIntegrationTables,
  upsertCrewFromMapping,
  createLogEntry,
  finalizeLogEntry,
} from "@/lib/integrations/store"
import { mapPayloadToCrew } from "@/lib/integrations/mapper"
import type { FieldMapRule } from "@/lib/integrations/types"

// Public, API-key authenticated inbound webhook.
// URL: /api/integrations/webhook/<api_key>
// Designed for "Webhooks by Zapier" (POST) and any forms software that can POST JSON.
//
// LOG-FIRST ARCHITECTURE: every inbound request is written to integration_logs
// the instant it arrives (status "received") BEFORE any parsing/mapping. The
// same row is then updated with the outcome. This means a submission can NEVER
// silently disappear from history, even if parsing, mapping, or the DB upsert
// throws. All failures are also console.error'd for the debug log.

async function loadConnection(key: string) {
  const sql = getDb()
  await ensureIntegrationTables(sql)
  const rows = await sql`SELECT * FROM integration_connections WHERE api_key = ${key} LIMIT 1`
  return rows[0] || null
}

function collectHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    // Redact obviously sensitive headers
    if (key.toLowerCase() === "authorization" || key.toLowerCase() === "cookie") {
      out[key] = "[redacted]"
    } else {
      out[key] = value
    }
  })
  return out
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  )
}

// GET -> health check / test ping so Zapier "Test trigger" succeeds.
// We also log GET pings so the user can confirm the URL is being reached.
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const sql = getDb()

  let conn
  try {
    conn = await loadConnection(key)
  } catch (e: any) {
    console.error("[v0] webhook GET loadConnection error:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }

  if (!conn) {
    console.error("[v0] webhook GET: invalid key", key)
    return NextResponse.json({ ok: false, error: "Invalid webhook key" }, { status: 404 })
  }

  // Log the ping so it shows in history as a connectivity check
  let logId: string | null = null
  try {
    logId = await createLogEntry(sql, {
      connectionId: conn.id,
      httpMethod: "GET",
      contentType: req.headers.get("content-type"),
      headers: collectHeaders(req),
      rawBody: "",
      requestIp: getClientIp(req),
    })
  } catch (e: any) {
    console.error("[v0] webhook GET: failed to log ping:", e.message)
  }
  const body = {
    ok: true,
    connection: conn.name,
    source: conn.source,
    active: conn.is_active,
    message: "Webhook is live. Send a POST request with form data as JSON to create a crew profile.",
  }
  await finalizeLogEntry(sql, logId, {
    status: "skipped",
    action: "none",
    errorMessage: "Connectivity ping (GET). Send a POST with form data to import a profile.",
    responseStatus: 200,
    responseBody: body,
  })

  return NextResponse.json(body)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const startedAt = Date.now()
  const { key } = await params
  const sql = getDb()

  // 1) Read the raw body + request metadata FIRST (clone-safe single read).
  const contentType = req.headers.get("content-type")
  const headers = collectHeaders(req)
  const requestIp = getClientIp(req)
  let rawBody = ""
  try {
    rawBody = await req.text()
  } catch (e) {
    console.error("[v0] webhook POST: failed to read body", e)
  }

  // 2) Resolve the connection.
  let conn
  try {
    conn = await loadConnection(key)
  } catch (e: any) {
    console.error("[v0] webhook POST loadConnection error:", e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }

  // If the key is invalid we cannot attach the log to a connection, but we still
  // record it (connection_id = null) and surface it in the server logs.
  if (!conn) {
    console.error("[v0] webhook POST: invalid key", key, "body:", rawBody.slice(0, 500))
    await createLogEntry(sql, {
      connectionId: null,
      httpMethod: "POST",
      contentType,
      headers,
      rawBody,
      requestIp,
    })
    return NextResponse.json({ ok: false, error: "Invalid webhook key" }, { status: 404 })
  }

  // 3) LOG FIRST: persist the inbound request before any processing.
  let logId: string | null = null
  try {
    logId = await createLogEntry(sql, {
      connectionId: conn.id,
      httpMethod: "POST",
      contentType,
      headers,
      rawBody,
      requestIp,
    })
    console.log("[v0] webhook POST: created log entry", logId)
  } catch (e: any) {
    console.error("[v0] webhook POST: failed to create log entry")
    console.error("  Error:", e.message)
    console.error("  Code:", e.code)
    console.error("  Detail:", e.detail)
    console.error("  Connection ID:", conn?.id)
    console.error("  Content-Type:", contentType)
    const errorMsg = e.detail || e.message || "Database error"
    const body = { ok: false, error: `Failed to log submission: ${errorMsg}` }
    return NextResponse.json(body, { status: 500 })
  }

  // 4) Reject disabled connections (but the request is already logged).
  if (!conn.is_active) {
    const body = { ok: false, error: "This connection is disabled" }
    await finalizeLogEntry(sql, logId, {
      status: "error",
      action: "none",
      errorMessage: "Connection is disabled — submission was received but not processed.",
      responseStatus: 403,
      responseBody: body,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(body, { status: 403 })
  }

  // 5) Parse the body (JSON or form-encoded) from the raw text we captured.
  let payload: Record<string, unknown> = {}
  try {
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const sp = new URLSearchParams(rawBody)
      sp.forEach((v, k) => { payload[k] = v })
    } else {
      // Default to JSON (covers application/json and Zapier's default)
      payload = rawBody ? JSON.parse(rawBody) : {}
    }
  } catch (e: any) {
    console.error("[v0] webhook POST: body parse error", e, "raw:", rawBody.slice(0, 500))
    const body = { ok: false, error: "Could not parse request body. Expected JSON or form-encoded data." }
    await finalizeLogEntry(sql, logId, {
      status: "error",
      action: "none",
      errorMessage: `Body parse failed: ${e.message}`,
      responseStatus: 400,
      responseBody: body,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(body, { status: 400 })
  }

  // 6) Map + upsert.
  const mapping: FieldMapRule[] = Array.isArray(conn.field_mapping) ? conn.field_mapping : []
  try {
    const mapped = mapPayloadToCrew(payload, mapping, conn.auto_map !== false)

    const outcome = await upsertCrewFromMapping(sql, mapped, {
      defaultStatus: conn.default_status || "application",
      updateExisting: conn.update_existing !== false,
      dedupeField: conn.dedupe_field || "email",
      batchId: v4Fallback(),
    })

    const status =
      outcome.action === "skipped" ? "skipped" : outcome.action === "updated" ? "duplicate" : "success"

    const body = {
      ok: true,
      action: outcome.action,
      crew_id: outcome.crewId,
      crew_name: outcome.crewName,
      matched_fields: mapped.matchedCount,
    }

    await finalizeLogEntry(sql, logId, {
      status,
      action: outcome.action,
      crewId: outcome.crewId,
      crewName: outcome.crewName,
      payload,
      mappedData: mapped.crew,
      matchedCount: mapped.matchedCount,
      errorMessage:
        outcome.action === "skipped"
          ? "No identifiable name or email found in payload (or duplicate skipped). Check your field mapping."
          : null,
      responseStatus: 200,
      responseBody: body,
      durationMs: Date.now() - startedAt,
    })

    // Update connection counters.
    await sql`
      UPDATE integration_connections
      SET total_received = total_received + 1, last_received_at = now()
      WHERE id = ${conn.id}
    `

    // Best-effort activity entry for created/updated crew.
    if (outcome.crewId && outcome.action !== "skipped") {
      try {
        await sql`
          INSERT INTO activities (crew_id, activity_type, title, description, actor_name, metadata)
          VALUES (
            ${outcome.crewId}, 'application_received',
            ${outcome.action === "created" ? "Profile imported via integration" : "Profile updated via integration"},
            ${`Source: ${conn.name} (${conn.source})`},
            ${conn.name},
            ${JSON.stringify({ source: conn.source, connection_id: conn.id })}::jsonb
          )
        `
      } catch {
        // activities table shape may differ; non-critical
      }
    }

    return NextResponse.json(body)
  } catch (e: any) {
    console.error("[v0] webhook POST: processing error", e)
    const body = { ok: false, error: e.message }
    await finalizeLogEntry(sql, logId, {
      status: "error",
      action: "none",
      payload,
      errorMessage: `${e.message}${e.stack ? "\n\n" + e.stack : ""}`,
      responseStatus: 500,
      responseBody: body,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json(body, { status: 500 })
  }
}
