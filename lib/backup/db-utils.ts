// Database connection utilities for backup feature
import { Client } from 'pg'

export type BackupProvider = 'neon' | 'aws' | 'supabase' | 'pg' | 'mysql'

// Whitelist of allowed table names to prevent SQL injection
const ALLOWED_TABLES = new Set([
  "users", "roles", "role_permissions", "user_roles", "custom_roles",
  "crew", "crew_assignments", "crew_sea_time", "crew_checkins",
  "crew_tags", "crew_hourly_logs", "crew_pay_config",
  "ships", "ship_positions", "ship_maintenance", "ship_supplies",
  "voyages", "voyage_legs", "positions", "crew_positions",
  "ports", "countries",
  "tasks", "documents", "incidents", "activities",
  "onboarding_checklists",
  "crew_invoices", "invoice_line_items", "invoice_settings",
  "email_templates", "email_queue", "email_triggers", "email_providers",
  "extensions", "extension_hooks", "extension_config", "extension_logs",
  "file_storage", "saved_views", "saved_tools", "dashboard_widgets",
  "site_settings", "sso_providers", "sso_credentials", "sso_linked_accounts", "sso_audit_log",
  "integrations", "integration_logs", "integration_syncs", "import_jobs",
  "notification_preferences", "notification_rules", "notifications",
  "custom_field_definitions", "custom_field_values",
  "signature_audit_log",
])

function validateTableName(tableName: string): string {
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`)
  }
  // Double-quote the identifier for safety
  return `"${tableName}"`
}

export async function testDatabaseConnection(
  provider: BackupProvider,
  connectionString: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'mysql') {
      return { success: false, error: 'MySQL connections are not yet supported' }
    }

    const client = new Client({ connectionString, connectionTimeoutMillis: 10000 })
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

export async function getDatabaseSchema(connectionString: string): Promise<any[]> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    const result = await client.query(`
      SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function exportTableData(connectionString: string, tableName: string): Promise<any[]> {
  const safeTable = validateTableName(tableName)
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    const result = await client.query(`SELECT * FROM ${safeTable}`)
    return result.rows
  } finally {
    await client.end()
  }
}

export async function importTableData(
  connectionString: string,
  tableName: string,
  data: any[]
): Promise<number> {
  if (data.length === 0) return 0

  const safeTable = validateTableName(tableName)
  const client = new Client({ connectionString, connectionTimeoutMillis: 30000 })
  try {
    await client.connect()
    await client.query('BEGIN')

    const columns = Object.keys(data[0])
    const quotedColumns = columns.map(c => `"${c}"`).join(', ')
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const insertQuery = `INSERT INTO ${safeTable} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`

    let inserted = 0
    for (const row of data) {
      const values = columns.map(col => {
        const val = row[col]
        // Handle JSON objects -- pg driver needs them stringified
        if (val !== null && typeof val === 'object') return JSON.stringify(val)
        return val
      })
      const result = await client.query(insertQuery, values)
      inserted += result.rowCount ?? 0
    }

    await client.query('COMMIT')
    return inserted
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw new Error(`Failed to import data into ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    await client.end()
  }
}

export function parseConnectionString(connStr: string): {
  host?: string
  port?: number
  database?: string
  user?: string
} {
  try {
    const url = new URL(connStr)
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      database: url.pathname.slice(1),
      user: url.username,
    }
  } catch {
    return {}
  }
}
