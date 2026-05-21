// SeaRM Extension System - Core Types
// ============================================
// All type definitions for the extension framework.
// Extensions declare their capabilities via these interfaces.

export const SEARM_VERSION = "1.0.0"

// Extension lifecycle states
export type ExtensionStatus = "active" | "inactive" | "error" | "installing" | "updating"

// Hook types define when/how an extension runs
export type HookType = "event" | "filter" | "action" | "cron" | "api" | "ui"

// Permission scopes an extension can request
export type ExtensionPermission =
  | "read:crew"
  | "write:crew"
  | "read:voyages"
  | "write:voyages"
  | "read:documents"
  | "write:documents"
  | "read:tasks"
  | "write:tasks"
  | "read:settings"
  | "write:settings"
  | "send:email"
  | "read:queue"
  | "write:queue"
  | "access:database"
  | "access:api"
  | "register:hooks"
  | "register:routes"
  | "register:ui"
  | "register:cron"
  | "admin:full"

// Categories for organizing extensions
export type ExtensionCategory =
  | "general"
  | "communication"
  | "reporting"
  | "integration"
  | "automation"
  | "compliance"
  | "crew"
  | "operations"
  | "finance"
  | "safety"
  | "custom"

// System events that extensions can hook into
export const SYSTEM_EVENTS = {
  // Crew lifecycle
  "crew.application.received": { label: "Application Received", category: "crew", payload: ["crew_id", "email", "name", "position"] },
  "crew.application.approved": { label: "Application Approved", category: "crew", payload: ["crew_id", "approved_by"] },
  "crew.application.rejected": { label: "Application Rejected", category: "crew", payload: ["crew_id", "reason"] },
  "crew.profile.updated": { label: "Profile Updated", category: "crew", payload: ["crew_id", "fields_changed"] },
  "crew.status.changed": { label: "Status Changed", category: "crew", payload: ["crew_id", "old_status", "new_status"] },

  // Documents
  "document.uploaded": { label: "Document Uploaded", category: "documents", payload: ["doc_id", "crew_id", "document_type"] },
  "document.signed": { label: "Document Signed", category: "documents", payload: ["doc_id", "crew_id", "signature_name"] },
  "document.verified": { label: "Document Verified", category: "documents", payload: ["doc_id", "verified_by"] },
  "document.expired": { label: "Document Expired", category: "documents", payload: ["doc_id", "crew_id", "expiry_date"] },

  // Voyages & deployments
  "voyage.created": { label: "Voyage Created", category: "operations", payload: ["voyage_id", "vessel_id", "departure_date"] },
  "voyage.crew.assigned": { label: "Crew Assigned to Voyage", category: "operations", payload: ["voyage_id", "crew_id", "role"] },
  "voyage.crew.removed": { label: "Crew Removed from Voyage", category: "operations", payload: ["voyage_id", "crew_id"] },
  "voyage.departed": { label: "Voyage Departed", category: "operations", payload: ["voyage_id"] },
  "voyage.completed": { label: "Voyage Completed", category: "operations", payload: ["voyage_id"] },

  // Tasks
  "task.created": { label: "Task Created", category: "tasks", payload: ["task_id", "assigned_to", "title"] },
  "task.completed": { label: "Task Completed", category: "tasks", payload: ["task_id", "completed_by"] },
  "task.overdue": { label: "Task Overdue", category: "tasks", payload: ["task_id", "assigned_to", "due_date"] },

  // System
  "system.startup": { label: "System Startup", category: "system", payload: [] },
  "system.cron.tick": { label: "Cron Tick (5min)", category: "system", payload: ["timestamp"] },
  "system.user.login": { label: "User Login", category: "system", payload: ["user_id", "email", "role"] },
  "system.settings.changed": { label: "Settings Changed", category: "system", payload: ["key", "old_value", "new_value"] },

  // Email
  "email.sent": { label: "Email Sent", category: "communication", payload: ["queue_id", "recipient", "subject"] },
  "email.failed": { label: "Email Failed", category: "communication", payload: ["queue_id", "recipient", "error"] },
  "email.bounced": { label: "Email Bounced", category: "communication", payload: ["queue_id", "recipient"] },

  // Extension lifecycle
  "extension.installed": { label: "Extension Installed", category: "system", payload: ["extension_id", "slug"] },
  "extension.activated": { label: "Extension Activated", category: "system", payload: ["extension_id", "slug"] },
  "extension.deactivated": { label: "Extension Deactivated", category: "system", payload: ["extension_id", "slug"] },
  "extension.error": { label: "Extension Error", category: "system", payload: ["extension_id", "slug", "error"] },
} as const

export type SystemEventName = keyof typeof SYSTEM_EVENTS

// Configuration field schema for extension settings UI
export interface ConfigField {
  key: string
  label: string
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "textarea" | "password" | "url" | "email" | "json" | "color" | "date"
  description?: string
  default?: any
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  group?: string
  depends_on?: { field: string; value: any }
}

// Hook definition in an extension manifest
export interface ExtensionHookDef {
  name: string
  type: HookType
  handler: string
  priority?: number
  conditions?: Record<string, any>
  timeout_ms?: number
  description?: string
}

// Route definition for custom API endpoints
export interface ExtensionRouteDef {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  handler: string
  auth_required?: boolean
  permissions?: ExtensionPermission[]
  description?: string
  rate_limit?: number
}

// Cron job definition
export interface ExtensionCronDef {
  name: string
  schedule: string
  handler: string
  timeout_ms?: number
  description?: string
}

// UI slot definition - where extension can inject UI
export interface ExtensionUISlotDef {
  slot: "dashboard_widget" | "crew_detail_tab" | "sidebar_item" | "settings_section" | "toolbar_action" | "crew_list_column" | "voyage_detail_tab"
  component: string
  label: string
  icon?: string
  priority?: number
}

// The full extension manifest (what a developer creates)
export interface ExtensionManifest {
  slug: string
  name: string
  description: string
  version: string
  author?: string
  author_url?: string
  homepage_url?: string
  repository_url?: string
  icon?: string
  category: ExtensionCategory
  tags?: string[]
  min_searm_version?: string
  permissions: ExtensionPermission[]
  hooks?: ExtensionHookDef[]
  routes?: ExtensionRouteDef[]
  cron_jobs?: ExtensionCronDef[]
  ui_slots?: ExtensionUISlotDef[]
  dependencies?: string[]
  config_schema?: ConfigField[]
  readme?: string
  changelog?: string
}

// DB row type
export interface ExtensionRow {
  id: string
  slug: string
  name: string
  description: string | null
  version: string
  author: string | null
  author_url: string | null
  homepage_url: string | null
  repository_url: string | null
  icon: string | null
  category: ExtensionCategory
  tags: string[]
  status: ExtensionStatus
  permissions: ExtensionPermission[]
  hooks: ExtensionHookDef[]
  routes: ExtensionRouteDef[]
  cron_jobs: ExtensionCronDef[]
  ui_slots: ExtensionUISlotDef[]
  dependencies: string[]
  config_schema: Record<string, any>
  entry_point: string | null
  readme: string | null
  changelog: string | null
  min_searm_version: string | null
  installed_at: string
  activated_at: string | null
  deactivated_at: string | null
  updated_at: string
  installed_by: string | null
  error_count: number
  last_error: string | null
  last_error_at: string | null
}

// Extension context passed to hook handlers
export interface ExtensionContext {
  extensionId: string
  slug: string
  config: Record<string, any>
  log: (level: "info" | "warn" | "error" | "debug", message: string, details?: any) => Promise<void>
  getConfig: (key: string) => any
  setConfig: (key: string, value: any) => Promise<void>
  fireEvent: (event: string, data: any) => Promise<void>
}

// Log entry type
export interface ExtensionLogEntry {
  id: string
  extension_id: string | null
  level: string
  action: string
  message: string
  details: any
  performed_by: string | null
  created_at: string
}
