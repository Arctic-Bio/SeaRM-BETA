"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import useSWR from "swr"
import type { VesselPosition } from "@/lib/map/types"
import type { MissionState, WatchZone } from "@/lib/map/mission-types"
import { INITIAL_MISSION_STATE, ZONE_COLORS } from "@/lib/map/mission-types"
import type { WeatherState } from "@/components/map/weather-panel"
import {
  fetchRainViewerPaths,
  type RainViewerPaths,
} from "@/lib/map/weather-config"
import { runDetection, buildSnapshots } from "@/lib/map/anomaly-engine"
import { useAISStream } from "@/hooks/use-ais-stream"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Central hook for all map data: vessels, sources, mission state,
 * weather, refresh timer. Keeps the page component clean.
 */
export function useMapData() {
  // ─── Core UI state ───
  const [selectedVessel, setSelectedVessel] =
    useState<VesselPosition | null>(null)
  const [tileLayer, setTileLayer] = useState("dark")
  const [showTrails, setShowTrails] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const countdownRef = useRef(30)

  // ─── Passthrough vessels (live from external sources, never saved) ───
  const [passthroughVessels, setPassthroughVessels] = useState<
    VesselPosition[]
  >([])

  // ─── Weather ───
  const [weatherState, setWeatherState] = useState<WeatherState>({
    sources: [],
    globalOpacity: 0.6,
  })
  const [rainViewerPaths, setRainViewerPaths] = useState<RainViewerPaths>({
    radarPath: null,
  })

  // ─── Mission ───
  const [mission, setMission] = useState<MissionState>({
    ...INITIAL_MISSION_STATE,
  })
  const [isDrawingZone, setIsDrawingZone] = useState(false)

  // ─── Live Stream ───
  const [streamEnabled, setStreamEnabled] = useState(false)
  const [streamSourceId, setStreamSourceId] = useState<number | null>(null)

  // ─── Anomaly detection refs ───
  const prevVesselsRef = useRef<VesselPosition[]>([])
  const snapshotsRef = useRef(mission.snapshots)
  snapshotsRef.current = mission.snapshots
  const prevRulesRef = useRef(mission.rules)
  const presenceFlaggedRef = useRef<Set<string>>(new Set())

  // ─── RainViewer fetch ───
  useEffect(() => {
    const hasRainViewer = weatherState.sources.some(
      (s) => s.providerId === "rainviewer"
    )
    if (!hasRainViewer) {
      setRainViewerPaths({ radarPath: null })
      return
    }
    let cancelled = false
    const load = async () => {
      const paths = await fetchRainViewerPaths()
      if (!cancelled) setRainViewerPaths(paths)
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [weatherState.sources])

  // ─── Position URL (supports mission zone filtering) ───
  const positionsUrl = useMemo(() => {
    let url = "/api/map/positions?stale_minutes=10080"
    const enabledZones = mission.watchZones.filter((z) => z.enabled)
    for (const z of enabledZones) {
      url += `&bbox=${z.bounds.south},${z.bounds.west},${z.bounds.north},${z.bounds.east}`
    }
    return url
  }, [mission.watchZones])

  const {
    data: posData,
    mutate: refreshPositions,
    isValidating,
  } = useSWR(positionsUrl, fetcher, {
    refreshInterval: autoRefresh ? 30000 : 0,
    revalidateOnFocus: false,
  })
  const dbVessels: VesselPosition[] = useMemo(
    () => posData?.positions || [],
    [posData]
  )

  // ─── Merge DB + live vessels (dedup by MMSI, live takes priority) ───
  const vessels: VesselPosition[] = useMemo(() => {
    if (passthroughVessels.length === 0) return dbVessels
    const map = new Map<string, VesselPosition>()
    dbVessels.forEach((v) => map.set(v.mmsi || `db-${v.id}`, v))
    passthroughVessels.forEach((v) => {
      const key = v.mmsi || `live-${v.latitude}-${v.longitude}`
      map.set(key, v)
    })
    return Array.from(map.values())
  }, [dbVessels, passthroughVessels])

  // ─── Sources ───
  const { data: sourcesData } = useSWR("/api/map/sources", fetcher, {
    refreshInterval: 15000,
  })
  const activeSources = useMemo(() => {
    const srcs = Array.isArray(sourcesData) ? sourcesData : []
    return srcs.filter((s: any) => s.is_active)
  }, [sourcesData])

  // ─── Countdown timer ───
  useEffect(() => {
    if (!autoRefresh) return
    countdownRef.current = 30
    setCountdown(30)
    const timer = setInterval(() => {
      countdownRef.current -= 1
      if (countdownRef.current <= 0) countdownRef.current = 30
      setCountdown(countdownRef.current)
    }, 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, posData])

  // ─── Stats ───
  const stats = useMemo(() => {
    const moving = vessels.filter((v) => (v.speed ?? 0) > 0.5).length
    const anchored = vessels.length - moving
    const sources = activeSources.length
    return { total: vessels.length, moving, anchored, sources }
  }, [vessels, activeSources])

  // ─── Mission bounding boxes for AISstream ───
  const missionBoundingBoxes = useMemo(() => {
    if (mission.watchZones.length === 0) return undefined
    const boxes = mission.watchZones
      .filter((z) => z.enabled)
      .map((z) => [
        [z.bounds.south, z.bounds.west],
        [z.bounds.north, z.bounds.east],
      ])
    return boxes.length > 0 ? boxes : undefined
  }, [mission.watchZones])

  const missionMMSIs = useMemo(() => {
    if (mission.watchlist.length === 0) return undefined
    const mmsis = mission.watchlist
      .filter((w) => w.enabled && w.identifierType === "mmsi")
      .map((w) => w.identifier)
    return mmsis.length > 0 ? mmsis : undefined
  }, [mission.watchlist])

  // ─── Anomaly Detection Loop ───
  useEffect(() => {
    if (vessels.length === 0) return

    const rulesChanged = prevRulesRef.current !== mission.rules
    const vesselsChanged =
      vessels.length !== prevVesselsRef.current.length ||
      vessels.some((v, i) => {
        const p = prevVesselsRef.current[i]
        return (
          !p ||
          v.mmsi !== p.mmsi ||
          v.latitude !== p.latitude ||
          v.longitude !== p.longitude
        )
      })

    const newSnapshots = buildSnapshots(vessels, snapshotsRef.current)

    const { anomalies: newAnomalies, hotspots: newHotspots } = runDetection(
      vessels,
      snapshotsRef.current,
      mission.watchZones,
      mission.watchlist,
      mission.rules
    )

    // Deduplicate zone_presence
    const dedupedAnomalies = newAnomalies.filter((a) => {
      if (a.type === "zone_presence") {
        const key = `${a.vesselKey}::${a.zoneId}`
        if (presenceFlaggedRef.current.has(key)) return false
        presenceFlaggedRef.current.add(key)
        return true
      }
      return true
    })

    // Clean up presence flags for vessels that left zones
    if (vesselsChanged) {
      const currentVesselKeys = new Set(
        vessels.map((v) => v.mmsi || `v-${v.id}`)
      )
      const presenceKeys = newAnomalies
        .filter((a) => a.type === "zone_presence")
        .map((a) => `${a.vesselKey}::${a.zoneId}`)
      const presenceSet = new Set(presenceKeys)
      for (const flagged of presenceFlaggedRef.current) {
        const vesselKey = flagged.split("::")[0]
        if (!presenceSet.has(flagged) || !currentVesselKeys.has(vesselKey)) {
          presenceFlaggedRef.current.delete(flagged)
        }
      }
    }

    if (rulesChanged) {
      const dedupedHotspots = dedupedAnomalies.map((a) => {
        const vessel = vessels.find(
          (v) => (v.mmsi || `v-${v.id}`) === a.vesselKey
        )
        return {
          latitude: a.latitude,
          longitude: a.longitude,
          intensity: { low: 0.3, medium: 0.5, high: 0.8, critical: 1.0 }[
            a.severity
          ],
          type: a.type,
          vesselKey: a.vesselKey,
          timestamp: a.timestamp,
          speed: vessel?.speed ?? null,
          heading: vessel?.heading ?? null,
          beaconOff: a.type === "beacon_off",
        }
      })
      setMission((prev) => ({
        ...prev,
        snapshots: newSnapshots,
        anomalies: dedupedAnomalies.slice(-500),
        hotspots: dedupedHotspots.slice(-2000),
      }))
    } else if (vesselsChanged && dedupedAnomalies.length > 0) {
      const mergedAnomalies = [
        ...mission.anomalies,
        ...dedupedAnomalies,
      ].slice(-500)
      const mergedHotspots = [...mission.hotspots, ...newHotspots].slice(-2000)
      setMission((prev) => ({
        ...prev,
        snapshots: newSnapshots,
        anomalies: mergedAnomalies,
        hotspots: mergedHotspots,
      }))
    } else {
      setMission((prev) => ({ ...prev, snapshots: newSnapshots }))
    }

    prevVesselsRef.current = vessels
    prevRulesRef.current = mission.rules
  }, [
    vessels,
    mission.rules,
    mission.watchZones,
    mission.watchlist,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Zone Drawing Handler ───
  const handleZoneDrawn = useCallback(
    (bounds: {
      north: number
      south: number
      east: number
      west: number
    }) => {
      const zone: WatchZone = {
        id: `zone-${Date.now()}`,
        name: `Zone ${mission.watchZones.length + 1}`,
        color:
          ZONE_COLORS[mission.watchZones.length % ZONE_COLORS.length],
        bounds,
        enabled: true,
        alertOnEntry: true,
        alertOnExit: true,
        createdAt: new Date().toISOString(),
      }
      setMission((prev) => ({
        ...prev,
        watchZones: [...prev.watchZones, zone],
      }))
      setIsDrawingZone(false)
    },
    [mission.watchZones]
  )

  // ─── Passthrough handler ───
  const handlePassthroughVessels = useCallback(
    (rawVessels: any[], sourceName: string) => {
      const now = new Date().toISOString()
      const mapped: VesselPosition[] = rawVessels.map(
        (v: any, i: number) => ({
          id: -(i + 1),
          source_id: 0,
          mmsi: v.mmsi || "",
          imo: v.imo || null,
          vessel_name: v.vessel_name || null,
          callsign: v.callsign || null,
          ship_type: v.ship_type || null,
          flag: v.flag || null,
          latitude: v.latitude,
          longitude: v.longitude,
          course: v.course ?? null,
          speed: v.speed ?? null,
          heading: v.heading ?? null,
          nav_status: v.nav_status || null,
          destination: v.destination || null,
          eta: v.eta || null,
          draught: v.draught ?? null,
          dimension_a: v.dimension_a ?? null,
          dimension_b: v.dimension_b ?? null,
          dimension_c: v.dimension_c ?? null,
          dimension_d: v.dimension_d ?? null,
          extra: { ...(v.extra || {}), passthrough: true },
          received_at: now,
          position_timestamp: v.position_timestamp || null,
          source_name: `${sourceName} (live)`,
          source_type: "live",
        })
      )
      setPassthroughVessels((prev) => {
        const map = new Map<string, VesselPosition>()
        prev.forEach((p) => map.set(p.mmsi || `prev-${p.id}`, p))
        mapped.forEach((m) => map.set(m.mmsi || `new-${m.id}`, m))
        return Array.from(map.values())
      })
    },
    []
  )

  // ─── Manual refresh ───
  const handleManualRefresh = useCallback(() => {
    refreshPositions()
    countdownRef.current = 30
    setCountdown(30)
  }, [refreshPositions])

  // ─── AIS Live Stream ───
  const {
    status: streamStatus,
    liveVesselCount: streamLiveCount,
    clearVessels: clearStreamVessels,
  } = useAISStream({
    sourceId: streamSourceId,
    zones: missionBoundingBoxes ?? null,
    mmsis: missionMMSIs ?? null,
    enabled: streamEnabled,
    onVessels: (mapped) => {
      handlePassthroughVessels(mapped, "AISstream (live)")
    },
  })

  // ─── Computed values ───
  const weatherActiveCount = weatherState.sources.reduce(
    (n, s) => n + s.enabledLayers.length,
    0
  )
  const missionAnomalyCount = mission.anomalies.filter(
    (a) => !a.acknowledged
  ).length

  return {
    // Vessels
    vessels,
    dbVessels,
    passthroughVessels,
    selectedVessel,
    setSelectedVessel,
    handlePassthroughVessels,
    clearPassthrough: () => setPassthroughVessels([]),

    // Refresh
    autoRefresh,
    setAutoRefresh,
    countdown,
    isValidating,
    handleManualRefresh,

    // Map display
    tileLayer,
    setTileLayer,
    showTrails,
    setShowTrails,
    showLabels,
    setShowLabels,

    // Weather
    weatherState,
    setWeatherState,
    rainViewerPaths,
    weatherActiveCount,

    // Mission
    mission,
    setMission,
    isDrawingZone,
    setIsDrawingZone,
    handleZoneDrawn,
    missionBoundingBoxes,
    missionMMSIs,
    missionAnomalyCount,

    // Stats
    stats,
    activeSources,

    // Stream
    streamEnabled,
    setStreamEnabled,
    streamSourceId,
    setStreamSourceId,
    streamStatus,
    streamLiveCount,
    clearStreamVessels,
  }
}
