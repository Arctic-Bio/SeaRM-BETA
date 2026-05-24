// ─── Anomaly Detection Engine ───
// Pure-function, stateless detection engine. Compares current vessel positions
// against previous snapshots and rules to produce anomalies and hotspot points.
// Easily expandable: add a new detection function and call it from `runDetection`.

import type { VesselPosition } from "./types"
import type {
  Anomaly, AnomalyRules, AnomalyType, HotspotPoint,
  VesselSnapshot, WatchZone, WatchlistEntry, AnomalySeverity,
} from "./mission-types"
import { ANOMALY_META } from "./mission-types"

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeAnomaly(
  type: AnomalyType,
  vessel: VesselPosition,
  message: string,
  details: Record<string, any> = {},
  severity?: AnomalySeverity,
  zoneId?: string,
): Anomaly {
  return {
    id: uid(),
    type,
    severity: severity ?? ANOMALY_META[type].severity,
    vesselKey: vessel.mmsi || `v-${vessel.id}`,
    vesselName: vessel.vessel_name,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    timestamp: new Date().toISOString(),
    message,
    details,
    acknowledged: false,
    zoneId,
  }
}

function makeHotspot(anomaly: Anomaly, vessel: VesselPosition): HotspotPoint {
  const intensityMap: Record<AnomalySeverity, number> = { low: 0.3, medium: 0.5, high: 0.8, critical: 1.0 }
  return {
    latitude: anomaly.latitude,
    longitude: anomaly.longitude,
    intensity: intensityMap[anomaly.severity],
    type: anomaly.type,
    vesselKey: anomaly.vesselKey,
    timestamp: anomaly.timestamp,
    speed: vessel.speed ?? null,
    heading: vessel.heading ?? null,
    beaconOff: anomaly.type === "beacon_off",
  }
}

// ─── Individual Detection Functions ───
// Each takes vessels, snapshots, rules and returns anomalies.
// Add new detectors here and register them in runDetection.

function detectExcessiveSpeed(
  vessels: VesselPosition[],
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("excessive_speed")) return []
  const anomalies: Anomaly[] = []
  for (const v of vessels) {
    if (v.speed != null && v.speed > rules.maxSpeedKnots) {
      anomalies.push(makeAnomaly(
        "excessive_speed", v,
        `${v.vessel_name || v.mmsi || "Unknown"} traveling at ${v.speed.toFixed(1)} kn (limit: ${rules.maxSpeedKnots} kn)`,
        { speed: v.speed, limit: rules.maxSpeedKnots },
        v.speed > rules.maxSpeedKnots * 1.5 ? "critical" : "high",
      ))
    }
  }
  return anomalies
}

function detectSpeedChange(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("speed_change")) return []
  const anomalies: Anomaly[] = []
  for (const v of vessels) {
    const key = v.mmsi || `v-${v.id}`
    const prev = snapshots[key]
    if (!prev || prev.speed == null || v.speed == null) continue
    const delta = Math.abs(v.speed - prev.speed)
    if (delta >= rules.speedChangeThreshold) {
      anomalies.push(makeAnomaly(
        "speed_change", v,
        `${v.vessel_name || v.mmsi || "Unknown"} speed changed by ${delta.toFixed(1)} kn (${prev.speed.toFixed(1)} -> ${v.speed.toFixed(1)})`,
        { prevSpeed: prev.speed, newSpeed: v.speed, delta },
      ))
    }
  }
  return anomalies
}

function detectBeaconOff(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("beacon_off")) return []
  const anomalies: Anomaly[] = []
  const now = Date.now()
  const currentKeys = new Set(vessels.map(v => v.mmsi || `v-${v.id}`))

  for (const [key, snap] of Object.entries(snapshots)) {
    if (currentKeys.has(key)) continue // still visible
    if (!snap.wasVisible) continue     // was already gone last cycle
    const goneMs = now - new Date(snap.lastSeenAt).getTime()
    if (goneMs >= rules.beaconOffSeconds * 1000) {
      const pseudoVessel = {
        id: 0, source_id: 0, mmsi: snap.mmsi, imo: null,
        vessel_name: null, callsign: null, ship_type: null, flag: null,
        latitude: snap.latitude, longitude: snap.longitude,
        course: snap.course, speed: snap.speed, heading: snap.heading,
        nav_status: null, destination: null, eta: null, draught: null,
        dimension_a: null, dimension_b: null, dimension_c: null, dimension_d: null,
        extra: {}, received_at: snap.lastSeenAt, position_timestamp: null,
      } as VesselPosition
      anomalies.push(makeAnomaly(
        "beacon_off", pseudoVessel,
        `${snap.mmsi} beacon lost -- last seen ${Math.round(goneMs / 1000)}s ago at (${snap.latitude.toFixed(4)}, ${snap.longitude.toFixed(4)})`,
        { lastSeen: snap.lastSeenAt, goneSeconds: Math.round(goneMs / 1000), lastSpeed: snap.speed, lastHeading: snap.heading },
        goneMs > rules.beaconOffSeconds * 2000 ? "critical" : "high",
      ))
    }
  }
  return anomalies
}

function detectBeaconBlink(
  snapshots: Record<string, VesselSnapshot>,
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("beacon_blink")) return []
  const anomalies: Anomaly[] = []
  // Blink detection: if goneCount has been toggling (vessel appears/disappears rapidly)
  for (const [key, snap] of Object.entries(snapshots)) {
    // A vessel that went from seen->gone->seen multiple times within window
    // We approximate blink by checking if seenCount and goneCount are both > threshold
    if (snap.seenCount >= 2 && snap.goneCount >= rules.beaconBlinkCount) {
      const pseudoVessel = {
        id: 0, source_id: 0, mmsi: snap.mmsi, imo: null,
        vessel_name: null, callsign: null, ship_type: null, flag: null,
        latitude: snap.latitude, longitude: snap.longitude,
        course: snap.course, speed: snap.speed, heading: snap.heading,
        nav_status: null, destination: null, eta: null, draught: null,
        dimension_a: null, dimension_b: null, dimension_c: null, dimension_d: null,
        extra: {}, received_at: snap.lastSeenAt, position_timestamp: null,
      } as VesselPosition
      anomalies.push(makeAnomaly(
        "beacon_blink", pseudoVessel,
        `${snap.mmsi} beacon blinking -- appeared/disappeared ${snap.goneCount} times`,
        { seenCount: snap.seenCount, goneCount: snap.goneCount },
      ))
    }
  }
  return anomalies
}

function detectCourseDeviation(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("course_deviation")) return []
  const anomalies: Anomaly[] = []
  for (const v of vessels) {
    const key = v.mmsi || `v-${v.id}`
    const prev = snapshots[key]
    if (!prev || prev.course == null || v.course == null) continue
    let delta = Math.abs(v.course - prev.course)
    if (delta > 180) delta = 360 - delta  // normalize wrap-around
    if (delta >= rules.courseDeviationDegrees && (v.speed ?? 0) > 1) {
      anomalies.push(makeAnomaly(
        "course_deviation", v,
        `${v.vessel_name || v.mmsi || "Unknown"} course shifted ${delta.toFixed(0)} deg (${prev.course.toFixed(0)} -> ${v.course.toFixed(0)})`,
        { prevCourse: prev.course, newCourse: v.course, delta },
      ))
    }
  }
  return anomalies
}

function detectStationaryAlert(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  rules: AnomalyRules,
): Anomaly[] {
  if (!rules.enabledTypes.includes("stationary_alert")) return []
  const anomalies: Anomaly[] = []
  const now = Date.now()
  for (const v of vessels) {
    if ((v.speed ?? 0) > 0.3) continue // moving
    const key = v.mmsi || `v-${v.id}`
    const prev = snapshots[key]
    if (!prev) continue
    // Check if position hasn't changed
    const latDiff = Math.abs(v.latitude - prev.latitude)
    const lngDiff = Math.abs(v.longitude - prev.longitude)
    if (latDiff < 0.001 && lngDiff < 0.001) {
      const stationarySince = new Date(prev.lastSeenAt).getTime()
      const durationMin = (now - stationarySince) / 60000
      if (durationMin >= rules.stationaryMinutes) {
        anomalies.push(makeAnomaly(
          "stationary_alert", v,
          `${v.vessel_name || v.mmsi || "Unknown"} stationary for ${Math.round(durationMin)} min`,
          { durationMinutes: Math.round(durationMin), latitude: v.latitude, longitude: v.longitude },
        ))
      }
    }
  }
  return anomalies
}

function isInZone(lat: number, lng: number, zone: WatchZone): boolean {
  return lat >= zone.bounds.south && lat <= zone.bounds.north &&
         lng >= zone.bounds.west && lng <= zone.bounds.east
}

function detectZoneEvents(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  zones: WatchZone[],
  rules: AnomalyRules,
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const enableEntry = rules.enabledTypes.includes("zone_entry")
  const enableExit = rules.enabledTypes.includes("zone_exit")
  const enablePresence = rules.enabledTypes.includes("zone_presence")
  if (!enableEntry && !enableExit && !enablePresence) return anomalies

  for (const zone of zones) {
    if (!zone.enabled) continue
    for (const v of vessels) {
      const key = v.mmsi || `v-${v.id}`
      const prev = snapshots[key]
      const nowInZone = isInZone(v.latitude, v.longitude, zone)

      if (prev) {
        const wasInZone = isInZone(prev.latitude, prev.longitude, zone)
        // Entry: was outside, now inside
        if (enableEntry && zone.alertOnEntry && nowInZone && !wasInZone) {
          anomalies.push(makeAnomaly(
            "zone_entry", v,
            `${v.vessel_name || v.mmsi || "Unknown"} entered zone "${zone.name}"`,
            { zoneName: zone.name, zoneId: zone.id },
            "medium", zone.id,
          ))
        }
        // Exit: was inside, now outside
        if (enableExit && zone.alertOnExit && !nowInZone && wasInZone) {
          anomalies.push(makeAnomaly(
            "zone_exit", v,
            `${v.vessel_name || v.mmsi || "Unknown"} exited zone "${zone.name}"`,
            { zoneName: zone.name, zoneId: zone.id },
            "medium", zone.id,
          ))
        }
      } else {
        // First time seeing this vessel -- if it's in a zone, flag entry
        if (enableEntry && zone.alertOnEntry && nowInZone) {
          anomalies.push(makeAnomaly(
            "zone_entry", v,
            `${v.vessel_name || v.mmsi || "Unknown"} entered zone "${zone.name}"`,
            { zoneName: zone.name, zoneId: zone.id, firstSighting: true },
            "low", zone.id,
          ))
        }
      }

      // Presence: vessel is currently inside a zone (fires every cycle, so we
      // track dedup externally -- only fires once per vessel+zone until they leave)
      if (enablePresence && nowInZone) {
        anomalies.push(makeAnomaly(
          "zone_presence", v,
          `${v.vessel_name || v.mmsi || "Unknown"} present in zone "${zone.name}"`,
          { zoneName: zone.name, zoneId: zone.id, speed: v.speed, heading: v.heading },
          "low", zone.id,
        ))
      }
    }
  }
  return anomalies
}

// ─── Snapshot Builder ───
// Builds next-cycle snapshots from current vessels + previous snapshots
export function buildSnapshots(
  vessels: VesselPosition[],
  prevSnapshots: Record<string, VesselSnapshot>,
): Record<string, VesselSnapshot> {
  const now = new Date().toISOString()
  const next: Record<string, VesselSnapshot> = {}
  const currentKeys = new Set<string>()

  for (const v of vessels) {
    const key = v.mmsi || `v-${v.id}`
    currentKeys.add(key)
    const prev = prevSnapshots[key]
    next[key] = {
      mmsi: v.mmsi || key,
      latitude: v.latitude,
      longitude: v.longitude,
      speed: v.speed ?? null,
      heading: v.heading ?? null,
      course: v.course ?? null,
      timestamp: now,
      wasVisible: true,
      lastSeenAt: now,
      seenCount: prev ? (prev.wasVisible ? prev.seenCount + 1 : 1) : 1,
      goneCount: prev ? (prev.wasVisible ? 0 : prev.goneCount) : 0,
    }
  }

  // Keep vessels that disappeared (for beacon-off detection) -- up to 1 hour
  const oneHourAgo = Date.now() - 3600000
  for (const [key, snap] of Object.entries(prevSnapshots)) {
    if (currentKeys.has(key)) continue // already in next
    if (new Date(snap.lastSeenAt).getTime() < oneHourAgo) continue // too old
    next[key] = {
      ...snap,
      wasVisible: false,
      goneCount: snap.goneCount + 1,
      seenCount: 0,
      timestamp: now,
    }
  }

  return next
}

// ─── Main Detection Runner ───
// Call this every refresh cycle with current vessels + previous state.
// Returns new anomalies and hotspot points to append.
export function runDetection(
  vessels: VesselPosition[],
  snapshots: Record<string, VesselSnapshot>,
  zones: WatchZone[],
  _watchlist: WatchlistEntry[],
  rules: AnomalyRules,
): { anomalies: Anomaly[]; hotspots: HotspotPoint[] } {
  const allAnomalies: Anomaly[] = [
    ...detectExcessiveSpeed(vessels, rules),
    ...detectSpeedChange(vessels, snapshots, rules),
    ...detectBeaconOff(vessels, snapshots, rules),
    ...detectBeaconBlink(snapshots, rules),
    ...detectCourseDeviation(vessels, snapshots, rules),
    ...detectStationaryAlert(vessels, snapshots, rules),
    ...detectZoneEvents(vessels, snapshots, zones, rules),
  ]

  // Convert anomalies to hotspot points for the heatmap
  const hotspots: HotspotPoint[] = allAnomalies.map(a => {
    const vessel = vessels.find(v => (v.mmsi || `v-${v.id}`) === a.vesselKey)
    return makeHotspot(a, vessel || {
      speed: null, heading: null, latitude: a.latitude, longitude: a.longitude,
    } as any)
  })

  return { anomalies: allAnomalies, hotspots }
}

// ─── Watchlist Matching ───
// Check if a vessel matches any watchlist entry
export function matchesWatchlist(vessel: VesselPosition, watchlist: WatchlistEntry[]): WatchlistEntry | null {
  for (const entry of watchlist) {
    if (!entry.enabled) continue
    const id = entry.identifier.toLowerCase()
    switch (entry.identifierType) {
      case "mmsi":
        if (vessel.mmsi?.toLowerCase() === id) return entry
        break
      case "imo":
        if (vessel.imo?.toLowerCase() === id) return entry
        break
      case "name":
        if (vessel.vessel_name?.toLowerCase().includes(id)) return entry
        break
      case "callsign":
        if (vessel.callsign?.toLowerCase() === id) return entry
        break
    }
  }
  return null
}

// ─── Zone Containment Check ───
// Returns all vessels currently inside a given zone
export function vesselsInZone(vessels: VesselPosition[], zone: WatchZone): VesselPosition[] {
  return vessels.filter(v => isInZone(v.latitude, v.longitude, zone))
}
