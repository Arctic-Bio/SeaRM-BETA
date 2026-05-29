// ============================================================================
// SeaRM Email System - Core Type Definitions
// ============================================================================

export interface EmailProvider {
  id: string
  name: string
  provider_type: "smtp" | "sendgrid" | "ses" | "mailgun" | "postmark" | "resend" | "custom"
  host: string
  port: number
  secure: boolean
  username: string
  password_encrypted: string
  from_email: string
  from_name: string | null
  reply_to: string | null
  is_default: boolean
  is_active: boolean
  max_per_hour: number
  tls_reject_unauthorized: boolean
  custom_headers: Record<string, string>
  last_tested_at: string | null
  last_test_result: "success" | "failure" | null
  last_test_error: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  slug: string
  category: TemplateCategory
  subject: string
  body_html: string
  body_text: string | null
  variables: TemplateVariable[]
  metadata: Record<string, any>
  is_active: boolean
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  label: string
  type: "string" | "number" | "date" | "url" | "email" | "boolean"
  required: boolean
  default_value?: string
  description?: string
}

export type TemplateCategory =
  | "onboarding"
  | "deployment"
  | "notification"
  | "reminder"
  | "welcome"
  | "document"
  | "task"
  | "general"
  | "system"
  | "custom"

export interface EmailTrigger {
  id: string
  name: string
  event_type: SystemEvent
  template_id: string | null
  provider_id: string | null
  recipient_type: RecipientType
  recipient_field: string
  cc_addresses: string[] | null
  bcc_addresses: string[] | null
  conditions: TriggerConditions
  delay_minutes: number
  is_active: boolean
  priority: number
  max_retries: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  template_name?: string
  template_slug?: string
  provider_name?: string
}

export interface TriggerConditions {
  field?: string
  operator?: "equals" | "not_equals" | "contains" | "in" | "gt" | "lt" | "exists"
  value?: any
  and?: TriggerConditions[]
  or?: TriggerConditions[]
}

export type RecipientType =
  | "crew_member"
  | "applicant" // kept for backwards compat
  | "admin"
  | "custom_email"
  | "event_data_field"

// ============================================================================
// System Events - Easily extensible by adding new entries
// ============================================================================

export type SystemEvent =
  // Crew lifecycle
  | "crew_application_received" // kept for backwards compat
  | "crew_application_approved"
  | "crew_application_rejected"
  | "crew_application_waitlisted"
  // Onboarding
  | "crew_onboarding_started"
  | "crew_onboarding_stage_changed"
  | "crew_onboarding_completed"
  // Deployment & Voyages
  | "crew_assigned_to_voyage"
  | "crew_removed_from_voyage"
  | "voyage_departure_reminder"
  | "voyage_created"
  | "voyage_updated"
  | "voyage_completed"
  // Documents
  | "document_uploaded"
  | "document_verified"
  | "document_rejected"
  | "document_expiring_soon"
  | "esign_required"
  | "esign_completed"
  // Tasks
  | "task_assigned"
  | "task_completed"
  | "task_overdue"
  // System
  | "welcome_packet"
  | "password_reset"
  | "account_created"
  | "system_notification"
  | "custom_event"

export const SYSTEM_EVENTS: { value: SystemEvent; label: string; category: string; description: string }[] = [
  // Crew lifecycle
  { value: "crew_application_received", label: "Crew Member Added", category: "Crew", description: "When a new crew member is added to the system" },
  { value: "crew_application_approved", label: "Crew Member Approved", category: "Crew", description: "When a crew member is approved" },
  { value: "crew_application_rejected", label: "Crew Member Rejected", category: "Crew", description: "When a crew member is rejected" },
  { value: "crew_application_waitlisted", label: "Crew Member Waitlisted", category: "Crew", description: "When a crew member is waitlisted" },
  // Onboarding
  { value: "crew_onboarding_started", label: "Onboarding Started", category: "Onboarding", description: "When crew onboarding begins" },
  { value: "crew_onboarding_stage_changed", label: "Onboarding Stage Changed", category: "Onboarding", description: "When onboarding moves to the next stage" },
  { value: "crew_onboarding_completed", label: "Onboarding Completed", category: "Onboarding", description: "When all onboarding steps are finished" },
  // Deployment
  { value: "crew_assigned_to_voyage", label: "Assigned to Voyage", category: "Deployments", description: "When crew is assigned to a voyage" },
  { value: "crew_removed_from_voyage", label: "Removed from Voyage", category: "Deployments", description: "When crew is removed from a voyage" },
  { value: "voyage_departure_reminder", label: "Departure Reminder", category: "Deployments", description: "Reminder before voyage departure (configurable days)" },
  { value: "voyage_created", label: "Voyage Created", category: "Deployments", description: "When a new voyage is created" },
  { value: "voyage_updated", label: "Voyage Updated", category: "Deployments", description: "When voyage details are modified" },
  { value: "voyage_completed", label: "Voyage Completed", category: "Deployments", description: "When a voyage is marked complete" },
  // Documents
  { value: "document_uploaded", label: "Document Uploaded", category: "Documents", description: "When a document is uploaded for a crew member" },
  { value: "document_verified", label: "Document Verified", category: "Documents", description: "When a document is verified by admin" },
  { value: "document_rejected", label: "Document Rejected", category: "Documents", description: "When a document is rejected" },
  { value: "document_expiring_soon", label: "Document Expiring Soon", category: "Documents", description: "When a document is approaching its expiry date" },
  { value: "esign_required", label: "E-Sign Required", category: "Documents", description: "When a document requires electronic signature" },
  { value: "esign_completed", label: "E-Sign Completed", category: "Documents", description: "When an e-signature is completed" },
  // Tasks
  { value: "task_assigned", label: "Task Assigned", category: "Tasks", description: "When a task is assigned to crew" },
  { value: "task_completed", label: "Task Completed", category: "Tasks", description: "When a task is marked complete" },
  { value: "task_overdue", label: "Task Overdue", category: "Tasks", description: "When a task passes its due date" },
  // System
  { value: "welcome_packet", label: "Welcome Packet", category: "System", description: "Welcome email for new crew members" },
  { value: "password_reset", label: "Password Reset", category: "System", description: "Password reset request" },
  { value: "account_created", label: "Account Created", category: "System", description: "When a new user account is created" },
  { value: "system_notification", label: "System Notification", category: "System", description: "General system notification" },
  { value: "custom_event", label: "Custom Event", category: "Custom", description: "User-defined custom event trigger" },
]

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "deployment", label: "Deployment" },
  { value: "notification", label: "Notification" },
  { value: "reminder", label: "Reminder" },
  { value: "welcome", label: "Welcome" },
  { value: "document", label: "Document" },
  { value: "task", label: "Task" },
  { value: "general", label: "General" },
  { value: "system", label: "System" },
  { value: "custom", label: "Custom" },
]

export interface EmailQueueItem {
  id: string
  trigger_id: string | null
  template_id: string | null
  provider_id: string | null
  recipient_email: string
  recipient_name: string | null
  subject: string
  body_html: string
  body_text: string | null
  variables_used: Record<string, any>
  status: "pending" | "sending" | "sent" | "failed" | "cancelled" | "bounced"
  priority: number
  attempts: number
  max_retries: number
  last_attempt_at: string | null
  sent_at: string | null
  error_message: string | null
  message_id: string | null
  event_type: string | null
  event_data: Record<string, any>
  scheduled_for: string
  created_at: string
  // Joined fields
  template_name?: string
  provider_name?: string
  trigger_name?: string
}

// Default template variables available for all templates
export const DEFAULT_VARIABLES: TemplateVariable[] = [
  { key: "crew_name", label: "Crew Member Name", type: "string", required: false, description: "Full name of the crew member" },
  { key: "crew_first_name", label: "First Name", type: "string", required: false, description: "First name of the crew member" },
  { key: "crew_email", label: "Crew Email", type: "email", required: false, description: "Email of the crew member" },
  { key: "crew_role", label: "Assigned Role", type: "string", required: false, description: "Role assigned to the crew member" },
  { key: "organization_name", label: "Organization Name", type: "string", required: false, default_value: "SeaRM", description: "Your organization name" },
  { key: "portal_url", label: "Portal URL", type: "url", required: false, description: "Link to the crew portal" },
  { key: "dashboard_url", label: "Dashboard URL", type: "url", required: false, description: "Link to the admin dashboard" },
  { key: "current_date", label: "Current Date", type: "date", required: false, description: "Today's date" },
  { key: "voyage_name", label: "Voyage Name", type: "string", required: false, description: "Name of the voyage" },
  { key: "vessel_name", label: "Vessel Name", type: "string", required: false, description: "Name of the vessel" },
  { key: "departure_date", label: "Departure Date", type: "date", required: false, description: "Voyage departure date" },
  { key: "document_name", label: "Document Name", type: "string", required: false, description: "Name of the document" },
  { key: "task_title", label: "Task Title", type: "string", required: false, description: "Title of the assigned task" },
]
