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
export const SHIP_TYPE_CATEGORIES: Record<string, { label: string; color: string; aisRange?: string }> = {
  cargo:           { label: "Cargo",            color: "#22c55e", aisRange: "70-79" },
  tanker:          { label: "Tanker",           color: "#ef4444", aisRange: "80-89" },
  passenger:       { label: "Passenger",        color: "#3b82f6", aisRange: "60-69" },
  fishing:         { label: "Fishing",          color: "#f59e0b", aisRange: "30" },
  tug:             { label: "Tug/Supply",       color: "#8b5cf6", aisRange: "31-32, 52" },
  military:        { label: "Military",         color: "#64748b", aisRange: "35" },
  sailing:         { label: "Sailing",          color: "#06b6d4", aisRange: "36" },
  pleasure:        { label: "Pleasure Craft",   color: "#ec4899", aisRange: "37" },
  sar:             { label: "Search & Rescue",  color: "#f97316", aisRange: "51" },
  law_enforcement: { label: "Law Enforcement",  color: "#1e40af", aisRange: "55" },
  pilot:           { label: "Pilot Vessel",     color: "#14b8a6", aisRange: "50" },
  hsc:             { label: "High Speed Craft", color: "#a855f7", aisRange: "40-49" },
  wig:             { label: "Wing In Ground",   color: "#84cc16", aisRange: "20-29" },
  dredger:         { label: "Dredger",          color: "#78716c", aisRange: "33" },
  diving:          { label: "Diving Ops",       color: "#0ea5e9", aisRange: "34" },
  port_tender:     { label: "Port Tender",      color: "#d946ef", aisRange: "53" },
  medical:         { label: "Medical",          color: "#dc2626", aisRange: "58" },
  other:           { label: "Other",            color: "#94a3b8", aisRange: "90-99" },
  unknown:         { label: "Unknown",          color: "#6b7280" },
}

// AIS numeric ship type ranges per ITU-R M.1371-5:
//   20-29: Wing In Ground, 30-39: Special (fishing=30, tug=31-32, dredging=33, diving=34, military=35, sailing=36),
//   40-49: High Speed Craft, 50-59: Pilot/SAR/Tow/Port Tender (50=pilot, 51=SAR, 52=tug, 53=port tender, 55=law enforcement),
//   60-69: Passenger, 70-79: Cargo, 80-89: Tanker, 90-99: Other
function categorizeByAISCode(code: number): string {
  if (code === 30) return "fishing"
  if (code === 31 || code === 32 || code === 52) return "tug"
  if (code === 33) return "dredger"
  if (code === 34) return "diving"
  if (code === 35) return "military"
  if (code === 36) return "sailing"
  if (code === 37) return "pleasure"
  if (code === 50) return "pilot"
  if (code === 51) return "sar"
  if (code === 53) return "port_tender"
  if (code === 55) return "law_enforcement"
  if (code === 58) return "medical"
  if (code >= 20 && code <= 29) return "wig"
  if (code >= 40 && code <= 49) return "hsc"
  if (code >= 60 && code <= 69) return "passenger"
  if (code >= 70 && code <= 79) return "cargo"
  if (code >= 80 && code <= 89) return "tanker"
  if (code >= 90 && code <= 99) return "other"
  return "unknown"
}

export function categorizeShipType(raw?: string | null): string {
  if (!raw) return "unknown"
  // Try numeric AIS code first (AISstream sends "70", "30", etc.)
  const num = parseInt(raw, 10)
  if (!isNaN(num) && num >= 0) return categorizeByAISCode(num)
  // Fall back to text matching
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
  if (/dredg/i.test(lower)) return "dredger"
  if (/diving/i.test(lower)) return "diving"
  if (/medical|hospital/i.test(lower)) return "medical"
  if (/high.?speed|hsc/i.test(lower)) return "hsc"
  return "other"
}
