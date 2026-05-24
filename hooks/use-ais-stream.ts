"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { VesselPosition } from "@/lib/map/types"

export interface StreamStatus {
  connected: boolean
  phase: "idle" | "connecting" | "streaming" | "reconnecting" | "disconnected" | "timeout" | "error"
  messageCount: number
  vesselCount: number
  uptime: number
  zones: number
  messagesPerSecond: number
  lastBatchTime: string | null
  error: string | null
}

interface StreamBatch {
  vessels: any[]
  rawCount: number
  parsedCount: number
  totalMessages: number
  timestamp: string
}

interface UseAISStreamOptions {
  sourceId: number | null
  zones: number[][][] | null  // multi-zone bounding boxes
  mmsis: string[] | null
  enabled: boolean
  onVessels?: (vessels: VesselPosition[], batch: StreamBatch) => void
}

const INITIAL_STATUS: StreamStatus = {
  connected: false,
  phase: "idle",
  messageCount: 0,
  vesselCount: 0,
  uptime: 0,
  zones: 0,
  messagesPerSecond: 0,
  lastBatchTime: null,
  error: null,
}

/**
 * Hook for connecting to the AISstream SSE endpoint.
 * Manages the EventSource lifecycle, reconnection, and vessel parsing.
 */
export function useAISStream({
  sourceId,
  zones,
  mmsis,
  enabled,
  onVessels,
}: UseAISStreamOptions) {
  const [status, setStatus] = useState<StreamStatus>({ ...INITIAL_STATUS })
  const [liveVessels, setLiveVessels] = useState<Map<string, VesselPosition>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const onVesselsRef = useRef(onVessels)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef = useRef(0)
  const totalMessagesRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  onVesselsRef.current = onVessels

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    setStatus(prev => ({ ...prev, connected: false, phase: "idle" }))
  }, [])

  const connect = useCallback(() => {
    if (!sourceId || !enabled) return
    if (!zones || zones.length === 0) {
      setStatus(prev => ({
        ...prev,
        connected: false,
        phase: "error",
        error: "No watch zones defined. Draw zones on the map to start streaming.",
      }))
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setStatus(prev => ({
      ...prev,
      connected: false,
      phase: "connecting",
      error: null,
    }))

    // Build URL with params
    const params = new URLSearchParams()
    params.set("source_id", String(sourceId))
    params.set("zones", JSON.stringify(zones))
    if (mmsis && mmsis.length > 0) {
      params.set("mmsis", mmsis.join(","))
    }

    const url = `/api/map/aisstream/stream?${params.toString()}`
    startTimeRef.current = Date.now()
    totalMessagesRef.current = 0

    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data)
        setStatus(prev => ({
          ...prev,
          connected: data.connected,
          phase: data.phase,
          messageCount: data.messageCount || prev.messageCount,
          vesselCount: data.vesselCount || prev.vesselCount,
          uptime: data.uptime || prev.uptime,
          zones: data.zones || prev.zones,
          messagesPerSecond: data.messagesPerSecond || prev.messagesPerSecond,
        }))
      } catch { /* skip */ }
    })

    es.addEventListener("batch", (e) => {
      try {
        const batch: StreamBatch = JSON.parse(e.data)
        totalMessagesRef.current = batch.totalMessages

        if (batch.vessels && batch.vessels.length > 0) {
          const now = new Date().toISOString()
          const mapped: VesselPosition[] = batch.vessels.map((v: any, i: number) => ({
            id: -(i + 1000),
            source_id: sourceId!,
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
            extra: { ...(v.extra || {}), passthrough: true, live_stream: true },
            received_at: now,
            position_timestamp: v.position_timestamp || null,
            source_name: "AISstream (live)",
            source_type: "live",
          }))

          // Update live vessels map (dedup by MMSI)
          setLiveVessels(prev => {
            const next = new Map(prev)
            for (const v of mapped) {
              const key = v.mmsi || `live-${v.latitude}-${v.longitude}`
              next.set(key, v)
            }
            return next
          })

          // Notify parent
          onVesselsRef.current?.(mapped, batch)

          setStatus(prev => ({
            ...prev,
            vesselCount: batch.parsedCount,
            messageCount: batch.totalMessages,
            lastBatchTime: batch.timestamp,
            messagesPerSecond: startTimeRef.current
              ? batch.totalMessages / Math.max(1, (Date.now() - startTimeRef.current) / 1000)
              : 0,
          }))
        }
      } catch { /* skip */ }
    })

    es.addEventListener("error", (e) => {
      // EventSource auto-reconnects, but we track the state
      if (es.readyState === EventSource.CLOSED) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          phase: "disconnected",
        }))

        // Auto-reconnect with backoff
        reconnectCountRef.current++
        const delay = Math.min(30000, 2000 * Math.pow(1.5, reconnectCountRef.current - 1))

        setStatus(prev => ({
          ...prev,
          phase: "reconnecting",
          error: `Connection lost. Reconnecting in ${Math.ceil(delay / 1000)}s...`,
        }))

        reconnectTimerRef.current = setTimeout(() => {
          if (enabled && sourceId) {
            connect()
          }
        }, delay)
      }
    })

    es.addEventListener("ping", () => {
      // Keepalive received -- connection is healthy
    })

    // Custom error events from the server
    es.addEventListener("error", () => {
      // handled above
    })

    reconnectCountRef.current = 0
  }, [sourceId, zones, mmsis, enabled, disconnect])

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled && sourceId && zones && zones.length > 0) {
      connect()
    } else {
      disconnect()
      if (!enabled) {
        setLiveVessels(new Map())
        setStatus({ ...INITIAL_STATUS })
      }
    }
    return () => {
      disconnect()
    }
  }, [enabled, sourceId, connect, disconnect]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when zones or mmsis change
  useEffect(() => {
    if (enabled && sourceId && eventSourceRef.current) {
      // Close and reconnect with new params
      disconnect()
      const timer = setTimeout(() => connect(), 500)
      return () => clearTimeout(timer)
    }
  }, [zones, mmsis]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveVesselArray = useCallback(() => {
    return Array.from(liveVessels.values())
  }, [liveVessels])

  return {
    status,
    liveVessels: liveVesselArray(),
    liveVesselCount: liveVessels.size,
    connect,
    disconnect,
    clearVessels: useCallback(() => setLiveVessels(new Map()), []),
  }
}
