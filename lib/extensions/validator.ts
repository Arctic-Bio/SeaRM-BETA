// SeaRM Extension Manifest Validator
// ============================================
// Validates extension manifests before installation.

import type { ExtensionManifest, ExtensionPermission, ExtensionCategory, HookType } from "./types"
import { SEARM_VERSION } from "./types"

const VALID_PERMISSIONS: ExtensionPermission[] = [
  "read:crew", "write:crew", "read:voyages", "write:voyages",
  "read:documents", "write:documents", "read:tasks", "write:tasks",
  "read:settings", "write:settings", "send:email", "read:queue",
  "write:queue", "access:database", "access:api", "register:hooks",
  "register:routes", "register:ui", "register:cron", "admin:full",
]

const VALID_CATEGORIES: ExtensionCategory[] = [
  "general", "communication", "reporting", "integration",
  "automation", "compliance", "crew", "operations", "finance", "safety", "custom",
]

const VALID_HOOK_TYPES: HookType[] = ["event", "filter", "action", "cron", "api", "ui"]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateManifest(manifest: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!manifest.slug || typeof manifest.slug !== "string") {
    errors.push("'slug' is required and must be a string")
  } else {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(manifest.slug) && manifest.slug.length > 1) {
      errors.push("'slug' must contain only lowercase letters, numbers, and hyphens")
    }
    if (manifest.slug.length < 2 || manifest.slug.length > 100) {
      errors.push("'slug' must be between 2 and 100 characters")
    }
  }

  if (!manifest.name || typeof manifest.name !== "string") errors.push("'name' is required and must be a string")
  if (!manifest.description || typeof manifest.description !== "string") errors.push("'description' is required and must be a string")

  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("'version' is required (semver format: x.y.z)")
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push("'version' must follow semver format (e.g., 1.0.0)")
  }

  if (!manifest.category || !VALID_CATEGORIES.includes(manifest.category)) {
    errors.push(`'category' must be one of: ${VALID_CATEGORIES.join(", ")}`)
  }

  // Permissions validation
  if (!Array.isArray(manifest.permissions)) {
    errors.push("'permissions' must be an array")
  } else {
    for (const perm of manifest.permissions) {
      if (!VALID_PERMISSIONS.includes(perm)) {
        errors.push(`Invalid permission: '${perm}'. Valid: ${VALID_PERMISSIONS.join(", ")}`)
      }
    }
    if (manifest.permissions.includes("admin:full")) {
      warnings.push("Extension requests 'admin:full' permission -- this grants unrestricted access")
    }
  }

  // Hooks validation
  if (manifest.hooks && Array.isArray(manifest.hooks)) {
    for (let i = 0; i < manifest.hooks.length; i++) {
      const hook = manifest.hooks[i]
      if (!hook.name) errors.push(`Hook ${i}: 'name' is required`)
      if (!hook.handler) errors.push(`Hook ${i}: 'handler' is required`)
      if (hook.type && !VALID_HOOK_TYPES.includes(hook.type)) {
        errors.push(`Hook ${i}: invalid type '${hook.type}'`)
      }
      if (hook.timeout_ms && (hook.timeout_ms < 100 || hook.timeout_ms > 30000)) {
        warnings.push(`Hook ${i}: timeout_ms should be between 100ms and 30000ms`)
      }
      // Check permission for hooks
      if (!manifest.permissions?.includes("register:hooks") && !manifest.permissions?.includes("admin:full")) {
        errors.push("Extension defines hooks but doesn't request 'register:hooks' permission")
        break
      }
    }
  }

  // Routes validation
  if (manifest.routes && Array.isArray(manifest.routes)) {
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    for (let i = 0; i < manifest.routes.length; i++) {
      const route = manifest.routes[i]
      if (!route.path) errors.push(`Route ${i}: 'path' is required`)
      if (!route.handler) errors.push(`Route ${i}: 'handler' is required`)
      if (route.method && !validMethods.includes(route.method)) {
        errors.push(`Route ${i}: invalid method '${route.method}'`)
      }
      if (route.path && !route.path.startsWith("/ext/")) {
        warnings.push(`Route ${i}: paths should start with '/ext/' for namespacing`)
      }
    }
    if (!manifest.permissions?.includes("register:routes") && !manifest.permissions?.includes("admin:full")) {
      errors.push("Extension defines routes but doesn't request 'register:routes' permission")
    }
  }

  // Config schema validation
  if (manifest.config_schema && Array.isArray(manifest.config_schema)) {
    const validTypes = ["string", "number", "boolean", "select", "multiselect", "textarea", "password", "url", "email", "json", "color", "date"]
    const keys = new Set<string>()
    for (let i = 0; i < manifest.config_schema.length; i++) {
      const field = manifest.config_schema[i]
      if (!field.key) errors.push(`Config field ${i}: 'key' is required`)
      if (!field.label) errors.push(`Config field ${i}: 'label' is required`)
      if (field.type && !validTypes.includes(field.type)) {
        errors.push(`Config field ${i}: invalid type '${field.type}'`)
      }
      if (field.key && keys.has(field.key)) errors.push(`Config field ${i}: duplicate key '${field.key}'`)
      if (field.key) keys.add(field.key)
    }
  }

  // Version compatibility check
  if (manifest.min_searm_version) {
    const [minMajor] = manifest.min_searm_version.split(".").map(Number)
    const [curMajor] = SEARM_VERSION.split(".").map(Number)
    if (minMajor > curMajor) {
      errors.push(`Extension requires SeaRM v${manifest.min_searm_version} but current version is ${SEARM_VERSION}`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
