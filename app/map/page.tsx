"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PanelLeftClose, PanelLeftOpen, Radio, Ship, Layers, RefreshCw,
  Loader2, MapPin, Navigation, Anchor, Clock,
  Wifi, WifiOff, CloudSun,
} from "lucide-react"
import type { VesselPosition } from "@/lib/map/types"
import { categorizeShipType, SHIP_TYPE_CATEGORIES, NAV_STATUS_LABELS } from "@/lib/map/types"
import SourcePanel from "@/components/map/source-panel"
import VesselListPanel from "@/components/map/vessel-list-panel"
import LayersPanel from "@/components/map/layers-panel"
import WeatherPanel, { type WeatherState } from "@/components/map/weather-panel"
import { fetchRainViewerPaths, type RainViewerPaths } from "@/lib/map/weather-config"

// Dynamic import for Leaflet (no SSR)
const VesselMap = dynamic(() => import("@/components/map/vessel-map"), { ssr: false })

const fetcher = (url: string) => fetch(url).then(r => r.json())

type PanelTab = "sources" | "vessels" | "layers" | "weather"

export default function LiveMapPage() {
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>("vessels")
  const [selectedVessel, setSelectedVessel] = useState<VesselPosition | null>(null)
  const [tileLayer, setTileLayer] = useState("dark")
  const [showTrails, setShowTrails] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(30)
  const countdownRef = useRef(30)
  const [passthroughVessels, setPassthroughVessels] = useState<VesselPosition[]>([])
  const [weatherState, setWeatherState] = useState<WeatherState>({ sources: [], globalOpacity: 0.6 })
  const [rainViewerPaths, setRainViewerPaths] = useState<RainViewerPaths>({ radarPath: null })

  // Fetch RainViewer paths when RainViewer source is added
  useEffect(() => {
    const hasRainViewer = weatherState.sources.some(s => s.providerId === "rainviewer")
    if (!hasRainViewer) { setRainViewerPaths({ radarPath: null }); return }

    let cancelled = false
    const load = async () => {
      const paths = await fetchRainViewerPaths()
      if (!cancelled) setRainViewerPaths(paths)
    }
    load()
    // Refresh every 5 minutes to get latest frames
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [weatherState.sources])

  // Fetch internal fleet positions from DB (only internal_fleet saves to DB)
  const { data: posData, mutate: refreshPositions, isValidating } = useSWR(
    "/api/map/positions?stale_minutes=10080",
    fetcher,
    { refreshInterval: autoRefresh ? 30000 : 0, revalidateOnFocus: false }
  )
  const dbVessels: VesselPosition[] = useMemo(() => posData?.positions || [], [posData])

  // Merge DB vessels (internal fleet) + live source vessels, dedup by MMSI (live takes priority)
  const vessels: VesselPosition[] = useMemo(() => {
    if (passthroughVessels.length === 0) return dbVessels
    const map = new Map<string, VesselPosition>()
    dbVessels.forEach(v => map.set(v.mmsi || `db-${v.id}`, v))
    passthroughVessels.forEach(v => {
      const key = v.mmsi || `live-${v.latitude}-${v.longitude}`
      map.set(key, v)
    })
    return Array.from(map.values())
  }, [dbVessels, passthroughVessels])

  // Fetch sources to get accurate active count
  const { data: sourcesData } = useSWR("/api/map/sources", fetcher, { refreshInterval: 10000 })
  const activeSources = useMemo(() => {
    const srcs = Array.isArray(sourcesData) ? sourcesData : []
    return srcs.filter((s: any) => s.is_active)
  }, [sourcesData])

  // Countdown timer
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

  // Stats
  const stats = useMemo(() => {
    const moving = vessels.filter(v => (v.speed ?? 0) > 0.5).length
    const anchored = vessels.length - moving
    const sources = activeSources.length
    const dataSources = new Set(vessels.map(v => v.source_name).filter(Boolean)).size
    return { total: vessels.length, moving, anchored, sources, dataSources }
  }, [vessels, activeSources])

  // Handle live vessels returned from external source fetches (never saved to DB)
  const handlePassthroughVessels = useCallback((rawVessels: any[], sourceName: string) => {
    const now = new Date().toISOString()
    const mapped: VesselPosition[] = rawVessels.map((v: any, i: number) => ({
      id: -(i + 1), source_id: 0,
      mmsi: v.mmsi || "", imo: v.imo || null,
      vessel_name: v.vessel_name || null, callsign: v.callsign || null,
      ship_type: v.ship_type || null, flag: v.flag || null,
      latitude: v.latitude, longitude: v.longitude,
      course: v.course ?? null, speed: v.speed ?? null, heading: v.heading ?? null,
      nav_status: v.nav_status || null, destination: v.destination || null,
      eta: v.eta || null, draught: v.draught ?? null,
      dimension_a: v.dimension_a ?? null, dimension_b: v.dimension_b ?? null,
      dimension_c: v.dimension_c ?? null, dimension_d: v.dimension_d ?? null,
      extra: { ...(v.extra || {}), passthrough: true },
      received_at: now, position_timestamp: v.position_timestamp || null,
      source_name: `${sourceName} (live)`, source_type: "live",
    }))
    // Merge with existing passthrough data from other sources instead of replacing
    setPassthroughVessels(prev => {
      const map = new Map<string, VesselPosition>()
      prev.forEach(p => map.set(p.mmsi || `prev-${p.id}`, p))
      mapped.forEach(m => map.set(m.mmsi || `new-${m.id}`, m))
      return Array.from(map.values())
    })
  }, [])

  const handleManualRefresh = useCallback(() => {
    refreshPositions()
    countdownRef.current = 30
    setCountdown(30)
  }, [refreshPositions])

  const weatherActiveCount = weatherState.sources.reduce((n, s) => n + s.enabledLayers.length, 0)

  const panelTabs: { id: PanelTab; label: string; icon: any; badge?: number }[] = [
    { id: "vessels", label: "Vessels", icon: Ship },
    { id: "sources", label: "Sources", icon: Radio },
    { id: "weather", label: "Weather", icon: CloudSun, badge: weatherActiveCount },
    { id: "layers", label: "Layers", icon: Layers },
  ]

  // Selected vessel detail pane
  const selectedDetail = useMemo(() => {
    if (!selectedVessel) return null
    const cat = categorizeShipType(selectedVessel.ship_type)
    const catMeta = SHIP_TYPE_CATEGORIES[cat] || SHIP_TYPE_CATEGORIES.unknown
    const navLabel = NAV_STATUS_LABELS[selectedVessel.nav_status || ""] || selectedVessel.nav_status || "Unknown"
    const isMoving = (selectedVessel.speed ?? 0) > 0.5
    const isInternal = selectedVessel.extra && (selectedVessel.extra as any).internal
    return { cat, catMeta, navLabel, isMoving, isInternal }
  }, [selectedVessel])

  return (
    <div className="flex-1 flex relative overflow-hidden bg-slate-950" style={{ height: "calc(100vh - 0px)" }}>
      {/* ─── Side Panel ─��─ */}
      <div className={`relative z-10 flex flex-col bg-slate-900/95 backdrop-blur-sm border-r border-slate-800 transition-all duration-300 ${panelOpen ? "w-[320px]" : "w-0"} overflow-hidden`}>
        {panelOpen && (
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="p-3 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">Live Map</h2>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-500 hover:text-white" onClick={() => setPanelOpen(false)}>
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[9px] h-4 border-slate-700 text-slate-400 gap-1">
                  <MapPin className="h-2.5 w-2.5" />{stats.total} vessels
                </Badge>
                <Badge variant="outline" className="text-[9px] h-4 border-slate-700 text-emerald-400 gap-1">
                  <Navigation className="h-2.5 w-2.5" />{stats.moving} moving
                </Badge>
                <Badge variant="outline" className="text-[9px] h-4 border-slate-700 text-slate-500 gap-1">
                  <Anchor className="h-2.5 w-2.5" />{stats.anchored} anchored
                </Badge>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-800">
              {panelTabs.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={() => setPanelTab(t.id)}
                    className={`flex-1 py-2 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors border-b-2 -mb-px ${panelTab === t.id ? "text-blue-400 border-blue-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                    <Icon className="h-3 w-3" />{t.label}
                    {t.badge != null && t.badge > 0 && <span className="ml-0.5 text-[8px] bg-blue-500/20 text-blue-400 rounded-full px-1">{t.badge}</span>}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              {panelTab === "sources" && <SourcePanel onPassthroughVessels={handlePassthroughVessels} />}
              {panelTab === "vessels" && <VesselListPanel vessels={vessels} selectedVessel={selectedVessel} onSelectVessel={setSelectedVessel} />}
              {panelTab === "weather" && <WeatherPanel weatherState={weatherState} onWeatherChange={setWeatherState} />}
              {panelTab === "layers" && <LayersPanel tileLayer={tileLayer} setTileLayer={setTileLayer} showTrails={showTrails} setShowTrails={setShowTrails} showLabels={showLabels} setShowLabels={setShowLabels} />}
            </div>
          </div>
        )}
      </div>

      {/* ─── Map Area ─── */}
      <div className="flex-1 relative">
        <VesselMap
          vessels={vessels}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedVessel}
          tileLayer={tileLayer}
          showTrails={showTrails}
          showLabels={showLabels}
          weatherSources={weatherState.sources}
          weatherOpacity={weatherState.globalOpacity}
          rainViewerPaths={rainViewerPaths}
        />

        {/* Top-left: panel toggle (when closed) */}
        {!panelOpen && (
          <Button size="sm" variant="ghost"
            className="absolute top-3 left-3 z-20 h-8 w-8 p-0 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300"
            onClick={() => setPanelOpen(true)}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Top-center: status bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            {autoRefresh ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-slate-500" />}
            <span className="text-[10px] text-slate-400 font-medium">
              {stats.total} vessels &middot; {stats.sources} source{stats.sources !== 1 ? "s" : ""}
              {dbVessels.length > 0 && <span className="text-emerald-400"> &middot; {dbVessels.length} fleet</span>}
              {passthroughVessels.length > 0 && <span className="text-cyan-400"> &middot; {passthroughVessels.length} live</span>}
            </span>
            {passthroughVessels.length > 0 && (
              <button onClick={() => setPassthroughVessels([])} className="text-[9px] text-cyan-400 hover:text-cyan-300 underline ml-1">clear</button>
            )}
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${autoRefresh ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 hover:text-slate-300"}`}>
            {autoRefresh ? `${countdown}s` : "Paused"}
          </button>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-slate-400 hover:text-white" onClick={handleManualRefresh} disabled={isValidating}>
            {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>

        {/* Bottom-right: selected vessel detail card */}
        {selectedVessel && selectedDetail && (
          <div className="absolute bottom-4 right-4 z-20 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="h-1" style={{ background: selectedDetail.catMeta.color }} />
            <div className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedVessel.vessel_name || "Unknown Vessel"}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[8px] h-3.5" style={{ borderColor: selectedDetail.catMeta.color, color: selectedDetail.catMeta.color }}>
                      {selectedDetail.catMeta.label}
                    </Badge>
                    {selectedVessel.flag && <Badge variant="outline" className="text-[8px] h-3.5 border-slate-600 text-slate-400">{selectedVessel.flag}</Badge>}
                    {selectedDetail.isInternal && <Badge variant="outline" className="text-[8px] h-3.5 border-cyan-600 text-cyan-400">FLEET</Badge>}
                  </div>
                </div>
                <button onClick={() => setSelectedVessel(null)} className="text-slate-500 hover:text-white text-xs px-1">&times;</button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                {selectedVessel.mmsi && (
                  <><span className="text-slate-500">MMSI</span><span className="text-slate-300 font-mono text-right">{selectedVessel.mmsi}</span></>
                )}
                {selectedVessel.imo && (
                  <><span className="text-slate-500">IMO</span><span className="text-slate-300 font-mono text-right">{selectedVessel.imo}</span></>
                )}
                <span className="text-slate-500">Status</span>
                <span className="text-slate-300 text-right flex items-center justify-end gap-1">
                  {selectedDetail.isMoving ? <Navigation className="h-2.5 w-2.5 text-emerald-400" /> : <Anchor className="h-2.5 w-2.5 text-slate-500" />}
                  {selectedDetail.navLabel}
                </span>
                <span className="text-slate-500">Speed</span><span className="text-slate-300 text-right">{(selectedVessel.speed ?? 0).toFixed(1)} kn</span>
                <span className="text-slate-500">Course</span><span className="text-slate-300 text-right">{(selectedVessel.course ?? 0).toFixed(0)}&deg;</span>
                <span className="text-slate-500">Heading</span><span className="text-slate-300 text-right">{(selectedVessel.heading ?? 0).toFixed(0)}&deg;</span>
                <span className="text-slate-500">Position</span>
                <span className="text-slate-300 text-right font-mono text-[10px]">
                  {selectedVessel.latitude.toFixed(4)}, {selectedVessel.longitude.toFixed(4)}
                </span>
                {selectedVessel.destination && (
                  <><span className="text-slate-500">Destination</span><span className="text-slate-300 text-right truncate">{selectedVessel.destination}</span></>
                )}
                {selectedVessel.draught != null && selectedVessel.draught > 0 && (
                  <><span className="text-slate-500">Draught</span><span className="text-slate-300 text-right">{selectedVessel.draught.toFixed(1)} m</span></>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[9px] text-slate-600 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{selectedVessel.received_at ? new Date(selectedVessel.received_at).toLocaleTimeString() : "--"}</span>
                <span className="text-[9px] text-slate-600">{selectedVessel.source_name || "Unknown source"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
