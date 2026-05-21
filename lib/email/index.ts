// ============================================================================
// SeaRM Email System - Public API
// Import from "@/lib/email" to access all email functionality.
// ============================================================================

export { fireEmailEvent } from "./events"
export { renderTemplate, extractVariables } from "./template-engine"
export { sendMail, testConnection, clearTransportCache } from "./transport"
export { encrypt, decrypt } from "./encryption"
export {
  SYSTEM_EVENTS,
  TEMPLATE_CATEGORIES,
  DEFAULT_VARIABLES,
} from "./types"
export type {
  EmailProvider,
  EmailTemplate,
  EmailTrigger,
  EmailQueueItem,
  TemplateVariable,
  TemplateCategory,
  SystemEvent,
  RecipientType,
  TriggerConditions,
  SendMailOptions,
  SendMailResult,
} from "./types"
