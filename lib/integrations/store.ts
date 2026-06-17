// ============================================================================
// Integration persistence layer
// ----------------------------------------------------------------------------
// - Lazily bootstraps the integration tables (CREATE TABLE IF NOT EXISTS) so the
//   feature is self-installing and "fully functional" with no manual migration.
// - Upserts crew records produced by the mapping engine.
// ============================================================================

import { CREW_TARGET_FIELDS } from "./types"
import type { MappedResult } from "./mapper"

// Loose SQL type to match the project's getDb() neon tagged-template client
type Sql = any

let tablesReady = false

// Self-healing, robust bootstrap. Forcefully ensures integration_logs has the
// exact correct schema by dropping and recreating it if needed. This fixes
// any schema mismatch from previous versions or partial migrations.
export async function ensureIntegrationTables(sql: Sql): Promise<void> {
  if (tablesReady) return

  try {
    // Check if integration_logs table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'integration_logs' AND table_schema = 'public'
      ) AS exists
    `

    if (tableExists[0]?.exists) {
      // Table exists, check if schema is correct by counting columns
      const colCount = await sql`
        SELECT COUNT(*)::int AS count FROM information_schema.columns 
        WHERE table_name = 'integration_logs' AND table_schema = 'public'
      `
      
      const expectedColumnCount = 19 // id, connection_id, status, action, crew_id, crew_name, payload, mapped_data, error_message, http_method, content_type, headers, raw_body, request_ip, response_status, response_body, matched_count, duration_ms, created_at
      
      if (colCount[0]?.count !== expectedColumnCount) {
        console.log(
          `[v0] integration_logs has ${colCount[0]?.count} columns, expected ${expectedColumnCount}. Rebuilding...`
        )
        await sql`DROP TABLE IF EXISTS integration_logs CASCADE`
      } else {
        // Schema looks correct, skip creation
        console.log("[v0] integration_logs schema is correct")
        tablesReady = true
        return
      }
    }
  } catch (e: any) {
    console.log("[v0] ensureIntegrationTables schema check error:", e.message)
    // Proceed to create/recreate anyway
  }

  // Create tables with complete, fresh schema
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS integration_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'custom',
        api_key TEXT NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        default_status TEXT NOT NULL DEFAULT 'application',
        update_existing BOOLEAN NOT NULL DEFAULT true,
        dedupe_field TEXT NOT NULL DEFAULT 'email',
        field_mapping JSONB NOT NULL DEFAULT '[]'::jsonb,
        auto_map BOOLEAN NOT NULL DEFAULT true,
        total_received INTEGER NOT NULL DEFAULT 0,
        last_received_at TIMESTAMPTZ,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    console.log("[v0] integration_connections created or already exists")
  } catch (e: any) {
    console.error("[v0] Failed to create integration_connections:", e.message)
  }

  try {
    await sql`
      CREATE TABLE integration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id UUID,
        status TEXT NOT NULL DEFAULT 'received',
        action TEXT NOT NULL DEFAULT 'none',
        crew_id UUID,
        crew_name TEXT,
        payload JSONB,
        mapped_data JSONB,
        error_message TEXT,
        http_method TEXT,
        content_type TEXT,
        headers JSONB,
        raw_body TEXT,
        request_ip TEXT,
        response_status INTEGER,
        response_body JSONB,
        matched_count INTEGER,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    console.log("[v0] integration_logs created fresh")
    
    await sql`CREATE INDEX IF NOT EXISTS idx_integration_logs_conn ON integration_logs (connection_id, created_at DESC)`
    console.log("[v0] integration_logs index created")
  } catch (e: any) {
    // Table might already exist (race condition), which is fine
    if (!e.message?.includes("already exists")) {
      console.error("[v0] Failed to create integration_logs:", e.message)
    } else {
      console.log("[v0] integration_logs already exists (concurrent creation)")
    }
  }

  tablesReady = true
  console.log("[v0] integration tables ready")
}

// ----------------------------------------------------------------------------
// Log-first architecture: record the inbound request the instant it arrives so
// history NEVER loses a submission, even if parsing/mapping/upsert fails later.
// ----------------------------------------------------------------------------

export interface InboundLogInput {
  connectionId: string | null
  httpMethod: string
  contentType: string | null
  headers: Record<string, string>
  rawBody: string
  requestIp: string | null
}

// Insert the initial "received" log row and return its id.
// Throws on failure so the webhook can catch and handle it, preventing silent
// failures where crew is created but no log record exists.
export async function createLogEntry(sql: Sql, input: InboundLogInput): Promise<string> {
  try {
    console.log("[v0] createLogEntry: inserting log for connection", input.connectionId)
    const rows = await sql`
      INSERT INTO integration_logs
        (connection_id, status, action, crew_id, crew_name, payload, mapped_data, error_message, 
         http_method, content_type, headers, raw_body, request_ip, response_status, response_body, 
         matched_count, duration_ms, created_at)
      VALUES
        (${input.connectionId}, 'received', 'none', null, null, null, null, null,
         ${input.httpMethod}, ${input.contentType}, ${JSON.stringify(input.headers)}::jsonb, 
         ${input.rawBody}, ${input.requestIp}, null, null, null, null, now())
      RETURNING id
    `
    const id = rows[0]?.id
    if (!id) {
      throw new Error("INSERT returned no id")
    }
    console.log("[v0] createLogEntry: success, id=", id)
    return id
  } catch (e: any) {
    console.error("[v0] createLogEntry FAILED:")
    console.error("  Message:", e.message)
    console.error("  Code:", e.code)
    console.error("  Detail:", e.detail)
    console.error("  Hint:", e.hint)
    console.error("  Input:", {
      connectionId: input.connectionId,
      httpMethod: input.httpMethod,
      contentType: input.contentType,
      requestIp: input.requestIp,
    })
    throw e
  }
}

export interface FinalizeLogInput {
  status: string
  action: string
  crewId?: string | null
  crewName?: string | null
  payload?: unknown
  mappedData?: unknown
  errorMessage?: string | null
  responseStatus?: number | null
  responseBody?: unknown
  matchedCount?: number | null
  durationMs?: number | null
}

// Update the previously-created log row with the processing outcome.
export async function finalizeLogEntry(sql: Sql, id: string | null, input: FinalizeLogInput): Promise<void> {
  if (!id) return
  try {
    await sql`
      UPDATE integration_logs SET
        status = ${input.status},
        action = ${input.action},
        crew_id = ${input.crewId ?? null},
        crew_name = ${input.crewName ?? null},
        payload = ${input.payload !== undefined ? JSON.stringify(input.payload) : null}::jsonb,
        mapped_data = ${input.mappedData !== undefined ? JSON.stringify(input.mappedData) : null}::jsonb,
        error_message = ${input.errorMessage ?? null},
        response_status = ${input.responseStatus ?? null},
        response_body = ${input.responseBody !== undefined ? JSON.stringify(input.responseBody) : null}::jsonb,
        matched_count = ${input.matchedCount ?? null},
        duration_ms = ${input.durationMs ?? null}
      WHERE id = ${id}
    `
  } catch (e) {
    console.error("[v0] finalizeLogEntry failed:", e)
  }
}

const VALID_DEDUPE_FIELDS = ["email", "phone"]

// The full set of crew columns we are allowed to write from a mapping.
const WRITABLE_COLUMNS = CREW_TARGET_FIELDS.map((f) => f.key)

export interface UpsertOutcome {
  action: "created" | "updated" | "skipped"
  crewId: string | null
  crewName: string
}

export async function upsertCrewFromMapping(
  sql: Sql,
  mapped: MappedResult,
  opts: { defaultStatus: string; updateExisting: boolean; dedupeField: string; batchId: string },
): Promise<UpsertOutcome> {
  const crew = mapped.crew
  const firstName = (crew.first_name as string) || ""
  const lastName = (crew.last_name as string) || ""
  const email = (crew.email as string) || ""
  const phone = (crew.phone as string) || ""
  const crewName = `${firstName} ${lastName}`.trim() || email || "Unknown"

  // Require at least some identity to avoid junk records
  if (!firstName && !lastName && !email) {
    return { action: "skipped", crewId: null, crewName }
  }

  const dedupeField = VALID_DEDUPE_FIELDS.includes(opts.dedupeField) ? opts.dedupeField : "email"
  const dedupeValue = dedupeField === "phone" ? phone : email

  // Look for existing crew by dedupe field
  let existingId: string | null = null
  if (dedupeValue) {
    const rows =
      dedupeField === "phone"
        ? await sql`SELECT id FROM crew WHERE phone = ${dedupeValue} LIMIT 1`
        : await sql`SELECT id FROM crew WHERE LOWER(email) = ${dedupeValue.toLowerCase()} LIMIT 1`
    if (rows.length) existingId = rows[0].id as string
  }

  // Build the column/value pairs from mapped data (only writable columns).
  // WRITABLE_COLUMNS is a fixed allow-list, so column names are never user input.
  const cols: string[] = []
  const vals: unknown[] = []
  for (const col of WRITABLE_COLUMNS) {
    const value = crew[col]
    if (value !== undefined && value !== "") {
      cols.push(col)
      vals.push(value)
    }
  }

  // Always capture the raw form data for auditing / unmapped fields
  const appDataJson = JSON.stringify(mapped.applicationData)

  if (existingId) {
    if (!opts.updateExisting) {
      return { action: "skipped", crewId: existingId, crewName }
    }
    // Single dynamic UPDATE: set every provided column to the new value and
    // merge the new application_data into the existing JSON. Column names come
    // from a fixed allow-list, values are bound parameters (injection-safe).
    const setClauses: string[] = []
    const params: unknown[] = []
    cols.forEach((col, i) => {
      params.push(vals[i])
      setClauses.push(`${col} = $${params.length}`)
    })
    params.push(appDataJson)
    setClauses.push(`application_data = COALESCE(application_data, '{}'::jsonb) || $${params.length}::jsonb`)
    setClauses.push(`updated_at = now()`)
    params.push(existingId)

    const query = `UPDATE crew SET ${setClauses.join(", ")} WHERE id = $${params.length} RETURNING id`
    const res = await sql.query(query, params)
    return { action: "updated", crewId: res[0]?.id ?? existingId, crewName }
  }

  // Single dynamic INSERT with all mapped columns + metadata
  const insertCols = [...cols, "application_data", "status", "upload_batch_id"]
  const insertVals = [...vals, appDataJson, opts.defaultStatus || "application", opts.batchId]
  const placeholders = insertCols.map((col, i) =>
    col === "application_data" ? `$${i + 1}::jsonb` : `$${i + 1}`,
  )
  const query = `INSERT INTO crew (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`
  const res = await sql.query(query, insertVals)
  return { action: "created", crewId: res[0]?.id ?? null, crewName }
}

// Generate a URL-safe API key for a connection
export function generateApiKey(): string {
  const rand = () =>
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  return `whk_${rand()}${rand()}`.slice(0, 40)
}
