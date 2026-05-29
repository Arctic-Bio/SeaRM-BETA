// SeaRM Extension Manager
// ============================================
// Core manager for installing, activating, deactivating, configuring,
// and uninstalling extensions. All DB operations live here.

import { getDb } from "@/lib/db"
import type { ExtensionManifest, ExtensionRow, ExtensionLogEntry } from "./types"

// ---- Logging ----

export async function logExtensionAction(
  extensionId: string | null,
  level: "info" | "warn" | "error" | "debug",
  action: string,
  message: string,
  details: any = {},
  performedBy?: string
) {
  await sql`INSERT INTO extension_logs (extension_id, level, action, message, details, performed_by)
    VALUES (${extensionId}, ${level}, ${action}, ${message}, ${JSON.stringify(details)}, ${performedBy || null})`
}

// ---- CRUD ----

export async function listExtensions(): Promise<ExtensionRow[]> {
  const sql = getDb()
  return await sql`SELECT * FROM extensions ORDER BY name ASC` as ExtensionRow[]
}

export async function getExtension(id: string): Promise<ExtensionRow | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM extensions WHERE id = ${id}`
  return (rows[0] as ExtensionRow) || null
}

export async function getExtensionBySlug(slug: string): Promise<ExtensionRow | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM extensions WHERE slug = ${slug}`
  return (rows[0] as ExtensionRow) || null
}

export async function installExtension(manifest: ExtensionManifest, installedBy?: string): Promise<ExtensionRow> {
  const sql = getDb()
  // Check for duplicate slug
  const existing = await getExtensionBySlug(manifest.slug)
  if (existing) throw new Error(`Extension with slug '${manifest.slug}' is already installed`)

  // Validate dependencies
  if (manifest.dependencies?.length) {
    for (const dep of manifest.dependencies) {
      const depExt = await getExtensionBySlug(dep)
      if (!depExt) throw new Error(`Missing dependency: '${dep}' must be installed first`)
      if (depExt.status !== "active") throw new Error(`Dependency '${dep}' must be active`)
    }
  }

  const configSchema = manifest.config_schema || []
  const rows = await sql`
    INSERT INTO extensions (
      slug, name, description, version, author, author_url, homepage_url, repository_url,
      icon, category, tags, status, permissions, hooks, routes, cron_jobs, ui_slots,
      dependencies, config_schema, readme, changelog, min_searm_version, installed_by
    ) VALUES (
      ${manifest.slug}, ${manifest.name}, ${manifest.description || null}, ${manifest.version},
      ${manifest.author || null}, ${manifest.author_url || null}, ${manifest.homepage_url || null},
      ${manifest.repository_url || null}, ${manifest.icon || null}, ${manifest.category},
      ${manifest.tags || []}, 'inactive', ${JSON.stringify(manifest.permissions)},
      ${JSON.stringify(manifest.hooks || [])}, ${JSON.stringify(manifest.routes || [])},
      ${JSON.stringify(manifest.cron_jobs || [])}, ${JSON.stringify(manifest.ui_slots || [])},
      ${JSON.stringify(manifest.dependencies || [])}, ${JSON.stringify(configSchema)},
      ${manifest.readme || null}, ${manifest.changelog || null},
      ${manifest.min_searm_version || null}, ${installedBy || null}
    ) RETURNING *`

  const ext = rows[0] as ExtensionRow

  // Initialize default config values
  for (const field of configSchema) {
    if (field.default !== undefined) {
      await sql`INSERT INTO extension_config (extension_id, config_key, config_value, config_type, is_secret)
        VALUES (${ext.id}, ${field.key}, ${JSON.stringify(field.default)}, ${field.type}, ${field.type === "password"})
        ON CONFLICT (extension_id, config_key) DO NOTHING`
    }
  }

  // Register hooks
  if (manifest.hooks?.length) {
    for (const hook of manifest.hooks) {
      await sql`INSERT INTO extension_hooks (extension_id, hook_name, hook_type, handler, priority, conditions, timeout_ms)
        VALUES (${ext.id}, ${hook.name}, ${hook.type}, ${hook.handler}, ${hook.priority || 10},
          ${JSON.stringify(hook.conditions || {})}, ${hook.timeout_ms || 5000})`
    }
  }

  await logExtensionAction(ext.id, "info", "install", `Installed extension '${manifest.name}' v${manifest.version}`, { manifest }, installedBy)
  return ext
}

export async function activateExtension(id: string, performedBy?: string): Promise<ExtensionRow> {
  const sql = getDb()
  const ext = await getExtension(id)
  if (!ext) throw new Error("Extension not found")
  if (ext.status === "active") throw new Error("Extension is already active")

  // Validate dependencies are active
  const deps: string[] = Array.isArray(ext.dependencies) ? ext.dependencies : []
  for (const dep of deps) {
    const depExt = await getExtensionBySlug(dep)
    if (!depExt || depExt.status !== "active") throw new Error(`Dependency '${dep}' must be active`)
  }

  const rows = await sql`UPDATE extensions SET status = 'active', activated_at = NOW(), deactivated_at = NULL, updated_at = NOW(), error_count = 0, last_error = NULL WHERE id = ${id} RETURNING *`
  await sql`UPDATE extension_hooks SET is_active = true WHERE extension_id = ${id}`
  await logExtensionAction(id, "info", "activate", `Activated extension '${ext.name}'`, {}, performedBy)
  return rows[0] as ExtensionRow
}

export async function deactivateExtension(id: string, performedBy?: string): Promise<ExtensionRow> {
  const sql = getDb()
  const ext = await getExtension(id)
  if (!ext) throw new Error("Extension not found")

  // Check if other active extensions depend on this one
  const dependents = await sql`SELECT * FROM extensions WHERE status = 'active' AND dependencies::text LIKE ${`%${ext.slug}%`}`
  if (dependents.length > 0) {
    const names = dependents.map((d: any) => d.name).join(", ")
    throw new Error(`Cannot deactivate: ${names} depend(s) on this extension`)
  }

  const rows = await sql`UPDATE extensions SET status = 'inactive', deactivated_at = NOW(), updated_at = NOW() WHERE id = ${id} RETURNING *`
  await sql`UPDATE extension_hooks SET is_active = false WHERE extension_id = ${id}`
  await logExtensionAction(id, "info", "deactivate", `Deactivated extension '${ext.name}'`, {}, performedBy)
  return rows[0] as ExtensionRow
}

export async function uninstallExtension(id: string, performedBy?: string): Promise<void> {
  const sql = getDb()
  const ext = await getExtension(id)
  if (!ext) throw new Error("Extension not found")

  // Must deactivate first
  if (ext.status === "active") await deactivateExtension(id, performedBy)

  // Check dependents
  const dependents = await sql`SELECT * FROM extensions WHERE dependencies::text LIKE ${`%${ext.slug}%`}`
  if (dependents.length > 0) {
    const names = dependents.map((d: any) => d.name).join(", ")
    throw new Error(`Cannot uninstall: ${names} depend(s) on this extension`)
  }

  await logExtensionAction(null, "info", "uninstall", `Uninstalled extension '${ext.name}' v${ext.version}`, { slug: ext.slug }, performedBy)
  await sql`DELETE FROM extension_hooks WHERE extension_id = ${id}`
  await sql`DELETE FROM extension_config WHERE extension_id = ${id}`
  await sql`DELETE FROM extension_logs WHERE extension_id = ${id}`
  await sql`DELETE FROM extensions WHERE id = ${id}`
}

// ---- Configuration ----

export async function getExtensionConfig(extensionId: string): Promise<Record<string, any>> {
  const sql = getDb()
  const rows = await sql`SELECT config_key, config_value, is_secret FROM extension_config WHERE extension_id = ${extensionId}`
  const config: Record<string, any> = {}
  for (const row of rows) {
    config[row.config_key] = row.is_secret ? "••••••••" : row.config_value
  }
  return config
}

export async function getExtensionConfigRaw(extensionId: string): Promise<Record<string, any>> {
  const sql = getDb()
  const rows = await sql`SELECT config_key, config_value FROM extension_config WHERE extension_id = ${extensionId}`
  const config: Record<string, any> = {}
  for (const row of rows) config[row.config_key] = row.config_value
  return config
}

export async function setExtensionConfig(extensionId: string, key: string, value: any, updatedBy?: string): Promise<void> {
  const sql = getDb()
  // Validate against config schema
  const ext = await getExtension(extensionId)
  if (!ext) throw new Error("Extension not found")
  const schema: any[] = Array.isArray(ext.config_schema) ? ext.config_schema : []
  const field = schema.find((f: any) => f.key === key)
  const configType = field?.type || "string"
  const isSecret = configType === "password"

  await sql`INSERT INTO extension_config (extension_id, config_key, config_value, config_type, is_secret, updated_by, updated_at)
    VALUES (${extensionId}, ${key}, ${JSON.stringify(value)}, ${configType}, ${isSecret}, ${updatedBy || null}, NOW())
    ON CONFLICT (extension_id, config_key) DO UPDATE SET config_value = ${JSON.stringify(value)}, updated_by = ${updatedBy || null}, updated_at = NOW()`
}

export async function setExtensionConfigBulk(extensionId: string, config: Record<string, any>, updatedBy?: string): Promise<void> {
  for (const [key, value] of Object.entries(config)) {
    await setExtensionConfig(extensionId, key, value, updatedBy)
  }
  await logExtensionAction(extensionId, "info", "config_update", `Configuration updated`, { keys: Object.keys(config) }, updatedBy)
}

// ---- Hooks ----

export async function getActiveHooksForEvent(eventName: string): Promise<any[]> {
  const sql = getDb()
  return await sql`
    SELECT h.*, e.slug as extension_slug, e.name as extension_name
    FROM extension_hooks h
    JOIN extensions e ON e.id = h.extension_id
    WHERE h.hook_name = ${eventName} AND h.is_active = true AND e.status = 'active'
    ORDER BY h.priority ASC`
}

// ---- Logs ----

export async function getExtensionLogs(filters: {
  extension_id?: string
  level?: string
  action?: string
  limit?: number
  offset?: number
}): Promise<{ logs: ExtensionLogEntry[]; total: number }> {
  const sql = getDb()
  const limit = filters.limit || 50
  const offset = filters.offset || 0

  let whereClause = "1=1"
  if (filters.extension_id) whereClause += ` AND extension_id = '${filters.extension_id}'`
  if (filters.level) whereClause += ` AND level = '${filters.level}'`
  if (filters.action) whereClause += ` AND action = '${filters.action}'`

  // Use parameterized queries for safety
  const logs = filters.extension_id
    ? await sql`SELECT l.*, e.name as extension_name FROM extension_logs l LEFT JOIN extensions e ON e.id = l.extension_id
        WHERE l.extension_id = ${filters.extension_id}
        ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    : filters.level
      ? await sql`SELECT l.*, e.name as extension_name FROM extension_logs l LEFT JOIN extensions e ON e.id = l.extension_id
          WHERE l.level = ${filters.level}
          ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT l.*, e.name as extension_name FROM extension_logs l LEFT JOIN extensions e ON e.id = l.extension_id
          ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`

  const countResult = filters.extension_id
    ? await sql`SELECT COUNT(*)::int as count FROM extension_logs WHERE extension_id = ${filters.extension_id}`
    : await sql`SELECT COUNT(*)::int as count FROM extension_logs`

  return { logs: logs as ExtensionLogEntry[], total: countResult[0]?.count || 0 }
}

// ---- Record errors ----

export async function recordExtensionError(id: string, error: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE extensions SET error_count = error_count + 1, last_error = ${error}, last_error_at = NOW(), updated_at = NOW() WHERE id = ${id}`
  await logExtensionAction(id, "error", "runtime_error", error, {})
}

export async function clearExtensionErrors(id: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE extensions SET error_count = 0, last_error = NULL, last_error_at = NULL, updated_at = NOW() WHERE id = ${id}`
}
