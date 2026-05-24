// ─── Mission Dashboard Types ───
// Modular, expandable type system for mission monitoring, watch zones,
// vessel watchlists, anomaly detection, and hotspot analysis.

// ─── Watch Zones ───
// Bounding box regions drawn on the map for area monitoring
export interface WatchZone {
  id: string
  name: string
  color: string
  bounds: {
    north: number  // lat max
    south: number  // lat min
    east: number   // lng max
    west: number   // lng min
  }
  enabled: boolean
  alertOnEntry: boolean
  alertOnExit: boolean
  createdAt: string
}

// ─── Vessel Watchlist ───
// Specific vessels tracked by MMSI, IMO, or name
export interface WatchlistEntry {
  id: string
  identifier: string        // MMSI, IMO, or vessel name
  identifierType: "mmsi" | "imo" | "name" | "callsign"
  label: string             // user-friendly display name
  color: string             // highlight color on map
  notes: string
  enabled: boolean
  addedAt: string
}

// ─── Anomaly Detection ───
export type AnomalyType =
  | "excessive_speed"
  | "beacon_off"
  | "beacon_blink"
  | "zone_entry"
  | "zone_exit"
  | "zone_presence"
  | "course_deviation"
  | "stationary_alert"
  | "speed_change"

export type AnomalySeverity = "low" | "medium" | "high" | "critical"

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  vesselKey: string          // MMSI or vessel identifier
  vesselName: string | null
  latitude: number
  longitude: number
  timestamp: string
  message: string
  details: Record<string, any>  // extensible payload
  acknowledged: boolean
  zoneId?: string            // if zone-related
}

// Configurable anomaly detection thresholds
export interface AnomalyRules {
  maxSpeedKnots: number              // above this = excessive_speed
  speedChangeThreshold: number       // delta knots between checks = speed_change
  stationaryMinutes: number          // no movement for this long = stationary_alert
  beaconOffSeconds: number           // no signal for this long = beacon_off
  beaconBlinkCount: number           // on/off cycles in window = beacon_blink
  beaconBlinkWindowMinutes: number   // window for blink detection
  courseDeviationDegrees: number     // heading change threshold
  enabledTypes: AnomalyType[]        // which detections to run
}

export const DEFAULT_ANOMALY_RULES: AnomalyRules = {
  maxSpeedKnots: 30,
  speedChangeThreshold: 10,
  stationaryMinutes: 120,
  beaconOffSeconds: 300,
  beaconBlinkCount: 3,
  beaconBlinkWindowMinutes: 30,
  courseDeviationDegrees: 45,
  enabledTypes: [
    "excessive_speed",
    "beacon_off",
    "beacon_blink",
    "zone_entry",
    "zone_exit",
    "zone_presence",
    "course_deviation",
    "stationary_alert",
    "speed_change",
  ],
}

// ─── Hotspot Anomalies ───
// Points accumulated on the heatmap showing where anomalies cluster
export interface HotspotPoint {
  latitude: number
  longitude: number
  intensity: number          // weight for heatmap (severity-based)
  type: AnomalyType
  vesselKey: string
  timestamp: string
  speed: number | null
  heading: number | null
  beaconOff: boolean
}

// ─── Previous Position Snapshot ───
// Used for detecting changes between refresh cycles
export interface VesselSnapshot {
  mmsi: string
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  course: number | null
  timestamp: string
  wasVisible: boolean         // was this vessel seen last cycle?
  lastSeenAt: string         // ISO timestamp
  seenCount: number          // consecutive cycles seen
  goneCount: number          // consecutive cycles NOT seen
}

// ─── Full Mission State ───
export interface MissionState {
  watchZones: WatchZone[]
  watchlist: WatchlistEntry[]
  anomalies: Anomaly[]
  hotspots: HotspotPoint[]
  rules: AnomalyRules
  snapshots: Record<string, VesselSnapshot>  // keyed by MMSI
  showHeatmap: boolean
  showZones: boolean
  showWatchlistHighlights: boolean
}

export const INITIAL_MISSION_STATE: MissionState = {
  watchZones: [],
  watchlist: [],
  anomalies: [],
  hotspots: [],
  rules: { ...DEFAULT_ANOMALY_RULES },
  snapshots: {},
  showHeatmap: false,
  showZones: true,
  showWatchlistHighlights: true,
}

// ─── Anomaly Metadata ───
// Display info for each anomaly type (icons, labels, colors)
export const ANOMALY_META: Record<AnomalyType, { label: string; icon: string; color: string; severity: AnomalySeverity }> = {
  excessive_speed:  { label: "Excessive Speed",     icon: "Zap",         color: "#ef4444", severity: "high" },
  beacon_off:       { label: "Beacon Off",           icon: "WifiOff",     color: "#dc2626", severity: "critical" },
  beacon_blink:     { label: "Beacon Blinking",      icon: "Radio",       color: "#f97316", severity: "high" },
  zone_entry:       { label: "Zone Entry",           icon: "LogIn",       color: "#3b82f6", severity: "medium" },
  zone_exit:        { label: "Zone Exit",            icon: "LogOut",      color: "#6366f1", severity: "medium" },
  zone_presence:    { label: "Detected in Zone",     icon: "MapPin",      color: "#0ea5e9", severity: "low" },
  course_deviation: { label: "Course Deviation",     icon: "TrendingUp",  color: "#f59e0b", severity: "medium" },
  stationary_alert: { label: "Stationary Alert",     icon: "Anchor",      color: "#8b5cf6", severity: "low" },
  speed_change:     { label: "Sudden Speed Change",  icon: "Activity",    color: "#ec4899", severity: "medium" },
}

export const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
}

// ─── Zone colors for drag-and-drop creation ───
export const ZONE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
]

// ─── Watchlist highlight colors ───
export const WATCHLIST_COLORS = [
  "#22d3ee", "#a78bfa", "#fb923c", "#34d399", "#f472b6",
  "#facc15", "#60a5fa", "#f87171",
]
