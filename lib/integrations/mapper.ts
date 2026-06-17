// ============================================================================
// Field Mapping Engine
// ----------------------------------------------------------------------------
// Pure functions that transform an arbitrary inbound form payload into a
// normalized crew record. Fully data-driven from types.ts so new sources and
// fields require zero changes here.
// ============================================================================

import {
  CREW_TARGET_FIELDS,
  FULL_NAME_TARGET,
  type FieldMapRule,
  type FieldTransform,
  type TargetField,
} from "./types"

const SKILL_LEVELS = ["Basic", "Experienced", "Professional"]

// Flatten a possibly-nested payload (Typeform/Jotform sometimes nest answers)
// into a flat { key: stringValue } map. Arrays are joined with commas.
export function flattenPayload(input: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  if (input === null || input === undefined) return out

  if (Array.isArray(input)) {
    // Array of primitives -> joined; array of objects -> indexed flatten
    const allPrimitive = input.every((v) => typeof v !== "object" || v === null)
    if (allPrimitive) {
      if (prefix) out[prefix] = input.filter((v) => v !== null && v !== "").join(", ")
    } else {
      input.forEach((item, i) => {
        Object.assign(out, flattenPayload(item, prefix ? `${prefix}[${i}]` : `[${i}]`))
      })
    }
    return out
  }

  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === "object") {
        Object.assign(out, flattenPayload(v, key))
      } else if (v !== undefined && v !== null) {
        out[key] = String(v)
      }
    }
    return out
  }

  if (prefix) out[prefix] = String(input)
  return out
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[_\-\s]+/g, " ").trim()
}

// Find the best target field for an unmapped incoming key using aliases.
export function autoDetectTarget(incomingKey: string): string | null {
  const norm = normalizeKey(incomingKey)
  const all: TargetField[] = [...CREW_TARGET_FIELDS, FULL_NAME_TARGET as TargetField]

  // Exact alias / key match first
  for (const field of all) {
    if (normalizeKey(field.key) === norm) return field.key
    if (field.aliases.some((a) => normalizeKey(a) === norm)) return field.key
  }
  // Contains match (e.g. "Skills [Cooking]" contains "cooking")
  for (const field of all) {
    if (field.aliases.some((a) => norm.includes(normalizeKey(a)) && normalizeKey(a).length > 2)) {
      return field.key
    }
  }
  return null
}

// Build an effective set of mapping rules: explicit rules win; auto-map fills
// the rest when enabled.
export function buildEffectiveRules(
  flat: Record<string, string>,
  explicit: FieldMapRule[],
  autoMap: boolean,
): FieldMapRule[] {
  const rules: FieldMapRule[] = []
  const mappedSources = new Set<string>()

  for (const rule of explicit || []) {
    if (rule.source && rule.target) {
      rules.push(rule)
      mappedSources.add(normalizeKey(rule.source))
    }
  }

  if (autoMap) {
    for (const key of Object.keys(flat)) {
      if (mappedSources.has(normalizeKey(key))) continue
      const target = autoDetectTarget(key)
      if (target) {
        rules.push({ source: key, target })
        mappedSources.add(normalizeKey(key))
      }
    }
  }
  return rules
}

function getValueForSource(flat: Record<string, string>, source: string): string {
  if (flat[source] !== undefined) return flat[source]
  const norm = normalizeKey(source)
  for (const [k, v] of Object.entries(flat)) {
    if (normalizeKey(k) === norm) return v
  }
  return ""
}

export function applyTransform(value: string, transform: FieldTransform): string | boolean {
  const v = (value ?? "").toString().trim()
  switch (transform) {
    case "trim":
      return v
    case "lowercase":
      return v.toLowerCase()
    case "uppercase":
      return v.toUpperCase()
    case "email":
      return v.toLowerCase()
    case "phone":
      return v.replace(/[^\d+]/g, "")
    case "boolean":
      return ["yes", "true", "1", "y", "checked", "on"].includes(v.toLowerCase())
    case "date":
      return normalizeDate(v)
    case "skill_level":
      return normalizeSkillLevel(v)
    case "first_name":
      return v.split(/\s+/)[0] || ""
    case "last_name": {
      const parts = v.split(/\s+/)
      return parts.length > 1 ? parts.slice(1).join(" ") : ""
    }
    default:
      return v
  }
}

function normalizeSkillLevel(v: string): string {
  if (!v) return ""
  // Handle comma separated -> highest
  const parts = v.split(",").map((s) => s.trim())
  let highest = ""
  for (const level of SKILL_LEVELS) {
    if (parts.some((p) => p.toLowerCase() === level.toLowerCase())) highest = level
  }
  if (highest) return highest
  // Map yes/checked to "Experienced" as a sensible default
  if (["yes", "true", "checked", "1"].includes(v.toLowerCase())) return "Experienced"
  return parts[0] || ""
}

function normalizeDate(v: string): string {
  if (!v) return ""
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return v // keep raw if unparseable
}

export interface MappedResult {
  crew: Record<string, string | boolean>
  applicationData: Record<string, string>
  matchedCount: number
}

// Main entry: produce a crew record from a payload + a connection config.
export function mapPayloadToCrew(
  payload: unknown,
  explicit: FieldMapRule[],
  autoMap: boolean,
): MappedResult {
  const flat = flattenPayload(payload)
  const rules = buildEffectiveRules(flat, explicit, autoMap)
  const crew: Record<string, string | boolean> = {}
  let matchedCount = 0

  const transformFor = (key: string): FieldTransform => {
    const f = CREW_TARGET_FIELDS.find((t) => t.key === key)
    return f ? f.transform : "trim"
  }

  for (const rule of rules) {
    const raw = getValueForSource(flat, rule.source)
    if (raw === "" || raw === undefined) continue

    if (rule.target === FULL_NAME_TARGET.key) {
      // Split a full name into first/last (only fill if not already set)
      if (!crew.first_name) crew.first_name = applyTransform(raw, "first_name")
      if (!crew.last_name) crew.last_name = applyTransform(raw, "last_name")
      matchedCount++
      continue
    }

    const transformed = applyTransform(raw, transformFor(rule.target))
    crew[rule.target] = transformed
    matchedCount++
  }

  // Store the full original payload (flattened) for auditing / unmapped fields
  const applicationData: Record<string, string> = {}
  for (const [k, v] of Object.entries(flat)) {
    if (v && v.toString().trim()) applicationData[k] = v.toString().trim()
  }

  return { crew, applicationData, matchedCount }
}
