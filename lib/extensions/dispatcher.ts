// SeaRM Extension Hook Dispatcher
// ============================================
// Dispatches system events to registered extension hooks.
// Handles timeouts, error isolation, and cascading failures.

import { getActiveHooksForEvent, recordExtensionError, logExtensionAction, getExtensionConfigRaw } from "./manager"
import type { ExtensionContext } from "./types"
import { getDb } from "@/lib/db"


// Built-in hook handlers registry (extensions register their handlers here)
const handlerRegistry: Map<string, (ctx: ExtensionContext, event: string, data: any) => Promise<any>> = new Map()

// Register a handler function that extensions can use
export function registerHandler(key: string, handler: (ctx: ExtensionContext, event: string, data: any) => Promise<any>) {
  handlerRegistry.set(key, handler)
}

// Create an extension context for a hook execution
async function createContext(extensionId: string, slug: string): Promise<ExtensionContext> {
  const sql = getDb()
  const config = await getExtensionConfigRaw(extensionId)
  return {
    extensionId,
    slug,
    config,
    log: async (level, message, details) => {
      await logExtensionAction(extensionId, level, "hook_log", message, details)
    },
    getConfig: (key: string) => config[key],
    setConfig: async (key: string, value: any) => {
      await sql`INSERT INTO extension_config (extension_id, config_key, config_value, updated_at)
        VALUES (${extensionId}, ${key}, ${JSON.stringify(value)}, NOW())
        ON CONFLICT (extension_id, config_key) DO UPDATE SET config_value = ${JSON.stringify(value)}, updated_at = NOW()`
      config[key] = value
    },
    fireEvent: async (event: string, data: any) => {
      // Allow extensions to fire sub-events (with loop protection)
      await dispatchEvent(event, data, extensionId)
    },
  }
}

// Dispatch an event to all registered hooks
export async function dispatchEvent(
  eventName: string,
  eventData: any = {},
  sourceExtensionId?: string,
  maxDepth: number = 3
): Promise<{ results: any[]; errors: any[] }> {
  const results: any[] = []
  const errors: any[] = []

  // Prevent infinite loops
  const depth = (eventData.__dispatch_depth || 0) + 1
  if (depth > maxDepth) {
    console.warn(`[SeaRM Extensions] Max dispatch depth reached for event '${eventName}'`)
    return { results, errors }
  }

  try {
    const hooks = await getActiveHooksForEvent(eventName)

    for (const hook of hooks) {
      // Skip if this is a recursive call from the same extension
      if (sourceExtensionId && hook.extension_id === sourceExtensionId) continue

      // Check conditions
      if (hook.conditions && Object.keys(hook.conditions).length > 0) {
        const conditionsMet = evaluateConditions(hook.conditions, eventData)
        if (!conditionsMet) continue
      }

      try {
        const ctx = await createContext(hook.extension_id, hook.extension_slug)
        const handler = handlerRegistry.get(hook.handler)

        if (handler) {
          // Execute with timeout
          const timeoutMs = hook.timeout_ms || 5000
          const result = await Promise.race([
            handler(ctx, eventName, { ...eventData, __dispatch_depth: depth }),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timeout after ${timeoutMs}ms`)), timeoutMs)),
          ])
          results.push({ hook: hook.hook_name, extension: hook.extension_slug, result })
        } else {
          // Handler not found in registry - log but don't fail
          await logExtensionAction(
            hook.extension_id, "warn", "handler_missing",
            `Handler '${hook.handler}' not found in registry for hook '${hook.hook_name}'`
          )
        }
      } catch (hookError: any) {
        const errorMsg = hookError.message || "Unknown hook error"
        errors.push({ hook: hook.hook_name, extension: hook.extension_slug, error: errorMsg })
        await recordExtensionError(hook.extension_id, `Hook '${hook.hook_name}' failed: ${errorMsg}`)
      }
    }
  } catch (err: any) {
    errors.push({ event: eventName, error: err.message })
  }

  return { results, errors }
}

// Evaluate conditions against event data
function evaluateConditions(conditions: Record<string, any>, data: Record<string, any>): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = data[key]

    // Support operators
    if (typeof expected === "object" && expected !== null) {
      if ("$eq" in expected && actual !== expected.$eq) return false
      if ("$ne" in expected && actual === expected.$ne) return false
      if ("$gt" in expected && !(actual > expected.$gt)) return false
      if ("$gte" in expected && !(actual >= expected.$gte)) return false
      if ("$lt" in expected && !(actual < expected.$lt)) return false
      if ("$lte" in expected && !(actual <= expected.$lte)) return false
      if ("$in" in expected && !expected.$in.includes(actual)) return false
      if ("$nin" in expected && expected.$nin.includes(actual)) return false
      if ("$exists" in expected && (expected.$exists ? actual === undefined : actual !== undefined)) return false
      if ("$regex" in expected && !new RegExp(expected.$regex, expected.$flags || "").test(String(actual))) return false
    } else {
      if (actual !== expected) return false
    }
  }
  return true
}

// Fire event from anywhere in the app (convenience function)
export async function fireExtensionEvent(eventName: string, data: any = {}): Promise<void> {
  try {
    await dispatchEvent(eventName, data)
  } catch {
    // Extension errors should never break the main app flow
  }
}
