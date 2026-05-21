// ─── Vessel Tracking Types ───

export type SourceType = "aishub" | "marinetraffic" | "vesselfinder" | "aisstream" | "custom_api" | "internal_fleet"

export interface TrackingSource {
  id: number
  name: string
  slug: string
  source_type: SourceType
  is_active: boolean
  config: Record<string, any>
  description: string | null
  api_url: string | null
  api_key: string | null
  polling_interval_sec: number
  last_fetched_at: string | null
  last_error: string | null
  vessel_count: number
  created_at: string
  updated_at: string
}

export interface VesselPosition {
  id: number
  source_id: number
  mmsi: string | null
  imo: string | null
  vessel_name: string | null
  callsign: string | null
  ship_type: string | null
  flag: string | null
  latitude: number
  longitude: number
  course: number | null
  speed: number | null
  heading: number | null
  nav_status: string | null
  destination: string | null
  eta: string | null
  draught: number | null
  dimension_a: number | null
  dimension_b: number | null
  dimension_c: number | null
  dimension_d: number | null
  extra: Record<string, any>
  received_at: string
  position_timestamp: string | null
  // Joined from vessel_tracking_sources or set by passthrough
  source_name?: string
  source_type?: string
  source_slug?: string
}

// Normalized vessel from any source parser
export interface ParsedVessel {
  mmsi?: string
  imo?: string
  vessel_name?: string
  callsign?: string
  ship_type?: string
  flag?: string
  latitude: number
  longitude: number
  course?: number
  speed?: number
  heading?: number
  nav_status?: string
  destination?: string
  eta?: string
  draught?: number
  dimension_a?: number
  dimension_b?: number
  dimension_c?: number
  dimension_d?: number
  extra?: Record<string, any>
  position_timestamp?: string
}

// Source type metadata
export interface SourceTypeInfo {
  value: SourceType
  label: string
  description: string
  color: string
  fields: SourceField[]
  docs_url?: string
  response_format: string
}

export interface SourceField {
  key: string
  label: string
  type: "text" | "url" | "password" | "number" | "select"
  required?: boolean
  placeholder?: string
  description?: string
  default?: any
  options?: { value: string; label: string }[]
}

// Nav status labels
export const NAV_STATUS_LABELS: Record<string, string> = {
  "0": "Under way using engine",
  "1": "At anchor",
  "2": "Not under command",
  "3": "Restricted manoeuvrability",
  "4": "Constrained by draught",
  "5": "Moored",
  "6": "Aground",
  "7": "Engaged in fishing",
  "8": "Under way sailing",
  "9": "Reserved (HSC)",
  "10": "Reserved (WIG)",
  "11": "Power-driven vessel towing astern",
  "12": "Power-driven vessel pushing",
  "14": "AIS-SART, MOB-AIS, EPIRB-AIS",
  "15": "Undefined / default",
}

// Ship type categories
export const SHIP_TYPE_CATEGORIES: Record<string, { label: string; color: string }> = {
  cargo: { label: "Cargo", color: "#22c55e" },
  tanker: { label: "Tanker", color: "#ef4444" },
  passenger: { label: "Passenger", color: "#3b82f6" },
  fishing: { label: "Fishing", color: "#f59e0b" },
  tug: { label: "Tug", color: "#8b5cf6" },
  military: { label: "Military", color: "#64748b" },
  sailing: { label: "Sailing", color: "#06b6d4" },
  pleasure: { label: "Pleasure Craft", color: "#ec4899" },
  sar: { label: "Search & Rescue", color: "#f97316" },
  law_enforcement: { label: "Law Enforcement", color: "#1e40af" },
  other: { label: "Other", color: "#94a3b8" },
  unknown: { label: "Unknown", color: "#6b7280" },
}

export function categorizeShipType(raw?: string | null): string {
  if (!raw) return "unknown"
  const lower = raw.toLowerCase()
  if (/cargo|container|bulk|general cargo|vehicle carrier|roro/i.test(lower)) return "cargo"
  if (/tanker|oil|chemical|lng|lpg|gas carrier/i.test(lower)) return "tanker"
  if (/passenger|cruise|ferry/i.test(lower)) return "passenger"
  if (/fish/i.test(lower)) return "fishing"
  if (/tug|pilot|supply|offshore|anchor handling/i.test(lower)) return "tug"
  if (/militar|navy|patrol|coast guard/i.test(lower)) return "military"
  if (/sail/i.test(lower)) return "sailing"
  if (/pleasure|yacht|recreational/i.test(lower)) return "pleasure"
  if (/search|rescue|sar/i.test(lower)) return "sar"
  if (/law|enforcement|police/i.test(lower)) return "law_enforcement"
  return "other"
}
