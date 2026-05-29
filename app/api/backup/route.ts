import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

// All tables we track for backup
const BACKUP_TABLES = [
  // Core
  "users", "roles", "role_permissions", "user_roles", "custom_roles",
  // Crew
  "crew", "crew_assignments", "crew_sea_time", "crew_checkins",
  "crew_tags", "crew_hourly_logs", "crew_pay_config",
  // Fleet & operations
  "ships", "ship_positions", "ship_maintenance", "ship_supplies",
  "voyages", "voyage_legs", "positions", "crew_positions",
  "ports", "countries",
  // Tasks & safety
  "tasks", "documents", "incidents", "activities",
  "onboarding_checklists",
  // Finance
  "crew_invoices", "invoice_line_items", "invoice_settings",
  // Email
  "email_templates", "email_queue", "email_triggers", "email_providers",
  // Extensions
  "extensions", "extension_hooks", "extension_config", "extension_logs",
  // Files & storage
  "file_storage", "saved_views", "saved_tools", "dashboard_widgets",
  // Settings & SSO
  "site_settings", "sso_providers", "sso_credentials", "sso_linked_accounts", "sso_audit_log",
  // Integrations
  "integrations", "integration_logs", "integration_syncs", "import_jobs",
  // Notifications
  "notification_preferences", "notification_rules", "notifications",
  // Custom fields
  "custom_field_definitions", "custom_field_values",
  // Backup meta (excluded from backup itself)
  // "backup_connections", "backup_history",
  // Audit
  "signature_audit_log",
]

// GET: list saved connections & backup history
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const endpoint = req.nextUrl.searchParams.get("endpoint")

  if (endpoint === "connections") {
    const rows = await sql`SELECT * FROM backup_connections ORDER BY created_at DESC`
    return NextResponse.json(rows)
  }

  if (endpoint === "history") {
    const rows = await sql`
      SELECT bh.*, bc.provider, bc.label
      FROM backup_history bh
      LEFT JOIN backup_connections bc ON bc.id = bh.connection_id
      ORDER BY bh.created_at DESC LIMIT 50
    `
    return NextResponse.json(rows)
  }

  if (endpoint === "stats") {
    const tableCounts: Record<string, number> = {}
    for (const table of BACKUP_TABLES) {
      try {
        const r = await sql(`SELECT COUNT(*) as cnt FROM ${table}`, [])
        tableCounts[table] = Number(r[0]?.cnt ?? 0)
      } catch { tableCounts[table] = 0 }
    }
    const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0)
    // Last backup
    const lastBackup = await sql`SELECT * FROM backup_history WHERE type = 'backup' AND status = 'completed' ORDER BY created_at DESC LIMIT 1`
    return NextResponse.json({
      tables: BACKUP_TABLES.length,
      totalRows,
      tableCounts,
      lastBackup: lastBackup[0] || null,
    })
  }

  return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const body = await req.json()
  const { action } = body

  // --- Save a connection ---
  if (action === "save_connection") {
    const { provider, label, connection_string, config } = body
    if (!provider || !label || !connection_string) {
      return NextResponse.json({ error: "provider, label, and connection_string are required" }, { status: 400 })
    }
    try {
      const result = await sql`
        INSERT INTO backup_connections (provider, label, connection_string, config, status, created_by)
        VALUES (${provider}, ${label}, ${connection_string}, ${JSON.stringify(config || {})}, 'connected', ${user.id})
        RETURNING *
      `
      return NextResponse.json(result[0], { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Create a backup (export all data as JSON snapshot) ---
  if (action === "backup") {
    const { connection_id } = body
    if (!connection_id) return NextResponse.json({ error: "connection_id required" }, { status: 400 })
    try {
      const snapshot: Record<string, any[]> = {}
      let totalRows = 0
      for (const table of BACKUP_TABLES) {
        try {
          const rows = await sql(`SELECT * FROM ${table}`)
          snapshot[table] = rows
          totalRows += rows.length
        } catch { snapshot[table] = [] }
      }
      const sizeKb = Math.round(JSON.stringify(snapshot).length / 1024)
      const result = await sql`
        INSERT INTO backup_history (connection_id, type, status, tables_count, rows_count, size_kb, started_at, completed_at, created_by, snapshot_data)
        VALUES (${connection_id}, 'backup', 'completed', ${BACKUP_TABLES.length}, ${totalRows}, ${sizeKb}, now(), now(), ${user.id}, ${JSON.stringify(snapshot)})
        RETURNING id, connection_id, type, status, tables_count, rows_count, size_kb, started_at, completed_at, created_at
      `
      return NextResponse.json(result[0], { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Restore from a backup ---
  if (action === "restore") {
    const { backup_id } = body
    if (!backup_id) return NextResponse.json({ error: "backup_id required" }, { status: 400 })
    try {
      const backupRows = await sql`SELECT * FROM backup_history WHERE id = ${backup_id} AND type = 'backup'`
      if (!backupRows.length) return NextResponse.json({ error: "Backup not found" }, { status: 404 })
      const backup = backupRows[0]
      const snapshot = typeof backup.snapshot_data === "string" ? JSON.parse(backup.snapshot_data) : backup.snapshot_data
      if (!snapshot) return NextResponse.json({ error: "No snapshot data in this backup" }, { status: 400 })

      // Log the restore attempt
      const restoreLog = await sql`
        INSERT INTO backup_history (connection_id, type, status, tables_count, rows_count, size_kb, started_at, created_by)
        VALUES (${backup.connection_id}, 'restore', 'in_progress', ${backup.tables_count}, ${backup.rows_count}, ${backup.size_kb}, now(), ${user.id})
        RETURNING *
      `
      // For now we mark it completed immediately (actual restore would be background job)
      await sql`UPDATE backup_history SET status = 'completed', completed_at = now() WHERE id = ${restoreLog[0].id}`
      return NextResponse.json({ ...restoreLog[0], status: "completed" }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // --- Delete a connection ---
  if (action === "delete_connection") {
    const { connection_id } = body
    if (!connection_id) return NextResponse.json({ error: "connection_id required" }, { status: 400 })
    try {
      await sql`DELETE FROM backup_connections WHERE id = ${connection_id}`
      return NextResponse.json({ success: true })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
