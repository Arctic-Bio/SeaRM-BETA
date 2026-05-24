"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff,
  Zap, WifiOff, Radio, LogIn, LogOut, TrendingUp, Anchor, Activity,
  Shield, MapPin, Settings2, AlertTriangle, Square, Check,
  Target, Signal, Wifi, Play, RefreshCw, Search, Navigation, ExternalLink, Loader2,
} from "lucide-react"
import type { VesselPosition, TrackingSource } from "@/lib/map/types"
import { categorizeShipType, SHIP_TYPE_CATEGORIES } from "@/lib/map/types"
import type {
  MissionState, WatchlistEntry, AnomalyType, AnomalyRules,
} from "@/lib/map/mission-types"
import {
  ANOMALY_META, SEVERITY_COLORS, WATCHLIST_COLORS,
} from "@/lib/map/mission-types"
import type { StreamStatus } from "@/hooks/use-ais-stream"
import SourcePanel from "@/components/map/source-panel"

const fetcher = (url: string) => fetch(url).then(r => r.json())
const ANOMALY_ICONS: Record<string, any> = { Zap, WifiOff, Radio, LogIn, LogOut, TrendingUp, Anchor, Activity, MapPin }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

interface OperationsPanelProps {
  mission: MissionState
  onMissionChange: (m: MissionState) => void
  vessels: VesselPosition[]
  onDrawZone: () => void
  isDrawingZone: boolean
  onPassthroughVessels: (v: VesselPosition[], name: string) => void
  missionBoundingBoxes?: number[][][]
  missionMMSIs?: string[]
  streamStatus: StreamStatus
  streamEnabled: boolean
  onToggleStream: (v: boolean) => void
  streamSourceId: number | null
  onSelectSource: (id: number | null) => void
  streamLiveCount: number
  onClearLive: () => void
}

type Section = "lookup" | "stream" | "sources" | "zones" | "watchlist" | "anomalies" | "rules"

interface LookupResult {
  source: string
  source_type: string
  vessel: any | null
  error?: string
  method?: string
}
interface LookupResponse {
  query: { type: string; identifier: string }
  results: LookupResult[]
  all_results?: LookupResult[]
  total_sources_checked: number
  found: boolean
}

export default function OperationsPanel({
  mission, onMissionChange, vessels, onDrawZone, isDrawingZone,
  onPassthroughVessels, missionBoundingBoxes, missionMMSIs,
  streamStatus, streamEnabled, onToggleStream, streamSourceId, onSelectSource,
  streamLiveCount, onClearLive,
}: OperationsPanelProps) {
  const [expanded, setExpanded] = useState<Section | null>("stream")
  const [newWatchType, setNewWatchType] = useState<WatchlistEntry["identifierType"]>("mmsi")
  const [newWatchId, setNewWatchId] = useState("")
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | "all">("all")

  const toggle = (s: Section) => setExpanded(expanded === s ? null : s)
  const update = useCallback((partial: Partial<MissionState>) => onMissionChange({ ...mission, ...partial }), [mission, onMissionChange])

  // Vessel lookup
  const [lookupType, setLookupType] = useState<"mmsi" | "imo">("mmsi")
  const [lookupId, setLookupId] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResults, setLookupResults] = useState<LookupResponse | null>(null)

  const runLookup = useCallback(async () => {
    const id = lookupId.trim()
    if (!id) return
    setLookupLoading(true)
    setLookupResults(null)

    // 1) Check vessels already on the map (includes passthrough / live stream)
    const localMatch = vessels.find(v =>
      lookupType === "mmsi"
        ? v.mmsi === id
        : (v.imo === id)
    )
    if (localMatch) {
      const localResult: LookupResponse = {
        query: { type: lookupType, identifier: id },
        results: [{
          source: `Map (${localMatch.source_name || "live"})`,
          source_type: localMatch.source_type || "local",
          vessel: {
            mmsi: localMatch.mmsi, imo: localMatch.imo,
            vessel_name: localMatch.vessel_name, callsign: localMatch.callsign,
            ship_type: localMatch.ship_type, flag: localMatch.flag,
            latitude: localMatch.latitude, longitude: localMatch.longitude,
            course: localMatch.course, speed: localMatch.speed,
            heading: localMatch.heading, nav_status: localMatch.nav_status,
            destination: localMatch.destination, eta: localMatch.eta,
            draught: localMatch.draught, position_timestamp: localMatch.position_timestamp,
          },
        }],
        total_sources_checked: 1,
        found: true,
      }
      setLookupResults(localResult)
      toast.success(`Found "${localMatch.vessel_name || localMatch.mmsi}" (already on map)`)
      setLookupLoading(false)
      return
    }

    // 2) Query server-side lookup across all active sources
    try {
      const res = await fetch(`/api/map/vessel/lookup?type=${lookupType}&identifier=${encodeURIComponent(id)}`)
      const data: LookupResponse = await res.json()
      setLookupResults(data)
      if (data.found && data.results.length > 0) {
        const best = data.results[0]
        if (best.vessel) {
          const v = best.vessel
          onPassthroughVessels([{
            id: 0, source_id: 0,
            mmsi: v.mmsi || "", imo: v.imo || null,
            vessel_name: v.vessel_name || null, callsign: v.callsign || null,
            ship_type: v.ship_type || null, flag: v.flag || null,
            latitude: v.latitude, longitude: v.longitude,
            course: v.course || null, speed: v.speed || null,
            heading: v.heading || null, nav_status: v.nav_status || null,
            destination: v.destination || null, eta: v.eta || null,
            draught: v.draught || null,
            dimension_a: v.dimension_a || null, dimension_b: v.dimension_b || null,
            dimension_c: v.dimension_c || null, dimension_d: v.dimension_d || null,
            extra: v.extra || {},
            received_at: v.position_timestamp || new Date().toISOString(),
            position_timestamp: v.position_timestamp || null,
            source_name: best.source, source_type: best.source_type, source_slug: null,
          }], `Lookup: ${best.source}`)
          toast.success(`Found "${v.vessel_name || v.mmsi}" via ${best.source}`)
        }
      } else {
        toast.error(`No vessel found for ${lookupType.toUpperCase()} ${id}`)
      }
    } catch (e: any) {
      toast.error(e.message || "Lookup failed")
    }
    setLookupLoading(false)
  }, [lookupType, lookupId, vessels, onPassthroughVessels])

  const addLookupToWatchlist = useCallback(() => {
    if (!lookupId.trim()) return
    update({ watchlist: [...mission.watchlist, {
      id: uid(), identifier: lookupId.trim(), identifierType: lookupType,
      label: lookupResults?.results[0]?.vessel?.vessel_name || lookupId.trim(),
      color: WATCHLIST_COLORS[mission.watchlist.length % WATCHLIST_COLORS.length],
      notes: "", enabled: true, addedAt: new Date().toISOString(),
    }] })
    toast.success(`Added ${lookupType.toUpperCase()} ${lookupId.trim()} to watchlist`)
  }, [lookupId, lookupType, lookupResults, mission.watchlist, update])

  // Sources data
  const { data: sources = [] } = useSWR<TrackingSource[]>("/api/map/sources", fetcher, { refreshInterval: 30000 })
  const activeSources = useMemo(() => Array.isArray(sources) ? sources.filter(s => s.is_active) : [], [sources])
  const aisSources = useMemo(() => activeSources.filter(s => s.source_type === "aisstream"), [activeSources])

  // Source fetching is handled by the embedded SourcePanel component

  // Zones
  const removeZone = (id: string) => update({ watchZones: mission.watchZones.filter(z => z.id !== id) })
  const toggleZone = (id: string) => update({ watchZones: mission.watchZones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z) })
  const enabledZones = mission.watchZones.filter(z => z.enabled)

  // Watchlist
  const addWatchEntry = () => {
    if (!newWatchId.trim()) return
    update({ watchlist: [...mission.watchlist, {
      id: uid(), identifier: newWatchId.trim(), identifierType: newWatchType,
      label: newWatchId.trim(), color: WATCHLIST_COLORS[mission.watchlist.length % WATCHLIST_COLORS.length],
      notes: "", enabled: true, addedAt: new Date().toISOString(),
    }] })
    setNewWatchId("")
  }

  // Anomalies
  const filteredAnomalies = useMemo(() => {
    let list = mission.anomalies
    if (anomalyFilter !== "all") list = list.filter(a => a.type === anomalyFilter)
    return list.slice(-80).reverse()
  }, [mission.anomalies, anomalyFilter])
  const unackCount = mission.anomalies.filter(a => !a.acknowledged).length

  // Rules
  const updateRule = <K extends keyof AnomalyRules>(k: K, v: AnomalyRules[K]) => update({ rules: { ...mission.rules, [k]: v } })
  const toggleType = (t: AnomalyType) => {
    const types = mission.rules.enabledTypes
    updateRule("enabledTypes", types.includes(t) ? types.filter(x => x !== t) : [...types, t])
  }

  // Zone vessel counts
  const zoneVesselCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const zone of mission.watchZones) {
      if (!zone.enabled) continue
      map[zone.id] = vessels.filter(v =>
        v.latitude >= zone.bounds.south && v.latitude <= zone.bounds.north &&
        v.longitude >= zone.bounds.west && v.longitude <= zone.bounds.east
      ).length
    }
    return map
  }, [mission.watchZones, vessels])

  // Styles
  const inputCls = "h-7 text-[10px] bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
  const selectContentCls = "bg-slate-800 border-slate-700 text-slate-200"
  const selectItemCls = "text-slate-200 focus:bg-slate-700 focus:text-white"

  const sectionBtn = (section: Section, label: string, Icon: any, badgeCount?: number, badgeColor?: string) => (
    <button onClick={() => toggle(section)} className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="h-3 w-3 text-slate-500" />
        <span className="text-[11px] font-medium text-slate-300">{label}</span>
        {badgeCount != null && badgeCount > 0 && (
          <Badge className="h-3.5 px-1 text-[8px] border-0" style={{ background: `${badgeColor || "#ef4444"}20`, color: badgeColor || "#ef4444" }}>{badgeCount}</Badge>
        )}
      </div>
      {expanded === section ? <ChevronUp className="h-2.5 w-2.5 text-slate-600" /> : <ChevronDown className="h-2.5 w-2.5 text-slate-600" />}
    </button>
  )

    return (
    <div className="flex flex-col">
      {/* ─── Vessel Lookup ─── */}
      {sectionBtn("lookup", "Vessel Lookup", Search, lookupResults?.found ? lookupResults.results.length : undefined, "#06b6d4")}
      {expanded === "lookup" && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[9px] text-slate-500 leading-relaxed">
            Search all active sources directly by MMSI or IMO. Only fetches the specific vessel without loading everything.
          </p>
          <div className="flex items-center gap-1">
            <Select value={lookupType} onValueChange={(v) => setLookupType(v as "mmsi" | "imo")}>
              <SelectTrigger className={`h-7 w-[72px] text-[10px] ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="mmsi" className={selectItemCls}>MMSI</SelectItem>
                <SelectItem value="imo" className={selectItemCls}>IMO</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              placeholder={lookupType === "mmsi" ? "e.g. 367719770" : "e.g. 9175717"}
              className={`flex-1 ${inputCls}`}
              onKeyDown={e => e.key === "Enter" && runLookup()}
            />
            <Button
              size="sm" variant="outline"
              className="h-7 px-2 text-[10px] border-slate-700 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 gap-1"
              onClick={runLookup}
              disabled={lookupLoading || !lookupId.trim()}
            >
              {lookupLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Search className="h-2.5 w-2.5" />}
              Find
            </Button>
          </div>

          {/* Results */}
          {lookupResults && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-500">
                  Searched {lookupResults.total_sources_checked} source{lookupResults.total_sources_checked !== 1 && "s"}
                </span>
                {lookupResults.found && (
                  <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-cyan-400 hover:text-cyan-300" onClick={addLookupToWatchlist}>
                    <Plus className="h-2 w-2 mr-0.5" /> Add to watchlist
                  </Button>
                )}
              </div>

              {!lookupResults.found ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-amber-400/80 bg-amber-500/10 rounded px-2 py-1.5 text-center border border-amber-500/20">
                    No vessel found for {lookupResults.query.type.toUpperCase()} {lookupResults.query.identifier}
                  </div>
                  {lookupResults.all_results && lookupResults.all_results.length > 0 && (
                    <div className="bg-slate-800/30 rounded px-2 py-1.5 space-y-1 border border-slate-700/20">
                      <span className="text-[8px] text-slate-500 uppercase font-medium">Sources checked:</span>
                      {lookupResults.all_results.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-600 mt-1 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[9px] text-slate-400">{r.source}</span>
                            {r.method && <span className="text-[8px] text-slate-600 block truncate">{r.method}</span>}
                            {r.error && <span className="text-[8px] text-red-400/70 block">{r.error}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                lookupResults.results.map((r, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-lg border border-slate-700/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-700/20">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-medium text-slate-200 flex-1 truncate">
                        {r.vessel?.vessel_name || r.vessel?.mmsi || "Unknown"}
                      </span>
                      <Badge variant="outline" className="text-[7px] h-3.5 border-slate-600 text-slate-400">
                        {r.source_type}
                      </Badge>
                    </div>
                    {r.vessel && (
                      <div className="px-2.5 py-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {[
                          { label: "MMSI", value: r.vessel.mmsi },
                          { label: "IMO", value: r.vessel.imo },
                          { label: "Speed", value: r.vessel.speed != null ? `${r.vessel.speed} kn` : null },
                          { label: "Course", value: r.vessel.course != null ? `${r.vessel.course.toFixed(1)}\u00b0` : null },
                          { label: "Type", value: r.vessel.ship_type },
                          { label: "Flag", value: r.vessel.flag },
                          { label: "Dest", value: r.vessel.destination },
                          { label: "Source", value: r.source },
                        ].filter(f => f.value).map(f => (
                          <div key={f.label} className="flex items-baseline gap-1">
                            <span className="text-[8px] text-slate-600 uppercase shrink-0">{f.label}</span>
                            <span className="text-[9px] text-slate-300 truncate">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-2.5 py-1 border-t border-slate-700/20 flex items-center justify-between">
                      <span className="text-[8px] text-slate-600 truncate flex-1">
                        {r.vessel?.latitude?.toFixed(4)}, {r.vessel?.longitude?.toFixed(4)}
                        {r.method && <> &middot; {r.method}</>}
                      </span>
                      <span className="text-[8px] text-emerald-400/70 flex items-center gap-0.5 shrink-0 ml-1">
                        <Navigation className="h-2 w-2" /> On map
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Live Stream ─── */}
      {sectionBtn("stream", "Live Stream", Signal, streamEnabled ? streamLiveCount : undefined, "#22c55e")}
      {expanded === "stream" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            {aisSources.length > 0 ? (
              <select
                className="flex-1 h-7 text-[10px] rounded-md border px-2 bg-slate-800/50 border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={streamSourceId ?? ""}
                onChange={e => onSelectSource(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select source...</option>
                {aisSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : (
              <span className="flex-1 text-[10px] text-amber-400/70">No AISstream sources configured</span>
            )}
            {streamSourceId && (
              <Button
                size="sm" variant="ghost"
                className={`h-7 px-2 text-[10px] gap-1 border ${streamEnabled ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                onClick={() => onToggleStream(!streamEnabled)}
                disabled={!streamSourceId || (enabledZones.length === 0 && !streamEnabled)}
              >
                {streamEnabled ? <><Square className="h-2.5 w-2.5" /> Stop</> : <><Play className="h-2.5 w-2.5" /> Start</>}
              </Button>
            )}
          </div>

          {streamEnabled && streamStatus.connected && (
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "Vessels", value: streamLiveCount, color: "text-blue-400" },
                { label: "Msg/s", value: streamStatus.messagesPerSecond.toFixed(1), color: "text-emerald-400" },
                { label: "Total", value: streamStatus.messageCount.toLocaleString(), color: "text-slate-300" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/30 rounded px-2 py-1 text-center border border-slate-700/20">
                  <div className={`text-xs font-bold tabular-nums ${s.color}`}>{s.value}</div>
                  <div className="text-[7px] text-slate-600 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {streamStatus.error && (
            <div className="text-[9px] text-red-400 bg-red-500/10 rounded px-2 py-1 flex items-start gap-1">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              <span className="break-words line-clamp-2">{streamStatus.error}</span>
            </div>
          )}

          {streamLiveCount > 0 && (
            <Button size="sm" variant="ghost" className="w-full h-6 text-[9px] text-slate-500" onClick={onClearLive}>
              <RefreshCw className="h-2.5 w-2.5 mr-1" /> Clear {streamLiveCount} live vessels
            </Button>
          )}
        </div>
      )}

      {/* ─── Data Sources (full CRUD) ─── */}
      {sectionBtn("sources", "Data Sources", Radio, activeSources.length, "#3b82f6")}
      {expanded === "sources" && (
        <div className="px-3 pb-3">
          <SourcePanel
            onPassthroughVessels={onPassthroughVessels}
            missionBoundingBoxes={missionBoundingBoxes}
            missionMMSIs={missionMMSIs}
          />
        </div>
      )}

      {/* ─── Watch Zones ─── */}
      {sectionBtn("zones", "Watch Zones", Square, enabledZones.length, "#3b82f6")}
      {expanded === "zones" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isDrawingZone ? "default" : "outline"}
              className={`flex-1 h-7 text-[10px] gap-1 ${!isDrawingZone ? "border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" : ""}`}
              onClick={onDrawZone}
            >
              {isDrawingZone ? <><MapPin className="h-3 w-3 animate-pulse" /> Click corners...</> : <><Plus className="h-3 w-3" /> Draw Zone</>}
            </Button>
            <Switch checked={mission.showZones} onCheckedChange={v => update({ showZones: v })} className="scale-[0.6]" />
          </div>

          {mission.watchZones.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">Draw zones on the map to filter AIS data to specific areas.</p>
          ) : (
            <div className="space-y-1">
              {mission.watchZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2 bg-slate-800/30 rounded px-2 py-1.5 border border-slate-700/20">
                  <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: zone.color, opacity: zone.enabled ? 1 : 0.3 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-slate-200 truncate">{zone.name}</div>
                    <div className="text-[8px] text-slate-500">
                      <span className="text-emerald-400">{zoneVesselCounts[zone.id] ?? 0}</span> vessels
                    </div>
                  </div>
                  <button onClick={() => toggleZone(zone.id)} className="text-slate-500 hover:text-white transition-colors">
                    {zone.enabled ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                  </button>
                  <button onClick={() => removeZone(zone.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Vessel Watchlist ─── */}
      {sectionBtn("watchlist", "Watchlist", Target, mission.watchlist.filter(e => e.enabled).length, "#22d3ee")}
      {expanded === "watchlist" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-1">
            <Select value={newWatchType} onValueChange={(v) => setNewWatchType(v as any)}>
              <SelectTrigger className={`h-7 w-[70px] text-[10px] ${inputCls}`}><SelectValue /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                {["mmsi","imo","name","callsign"].map(t => <SelectItem key={t} value={t} className={selectItemCls}>{t.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={newWatchId} onChange={e => setNewWatchId(e.target.value)} placeholder="Identifier..." className={`flex-1 ${inputCls}`} onKeyDown={e => e.key === "Enter" && addWatchEntry()} />
            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-700 text-slate-400" onClick={addWatchEntry}><Plus className="h-3 w-3" /></Button>
          </div>
          {mission.watchlist.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 bg-slate-800/30 rounded px-2 py-1 border border-slate-700/20">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.color, opacity: entry.enabled ? 1 : 0.3 }} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-200 truncate">{entry.label}</span>
                <span className="text-[8px] text-slate-600 ml-1">({entry.identifierType.toUpperCase()})</span>
              </div>
              <button onClick={() => update({ watchlist: mission.watchlist.map(e => e.id === entry.id ? { ...e, enabled: !e.enabled } : e) })} className="text-slate-500 hover:text-white">
                {entry.enabled ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              </button>
              <button onClick={() => update({ watchlist: mission.watchlist.filter(e => e.id !== entry.id) })} className="text-slate-500 hover:text-red-400">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Anomaly Feed ─── */}
      {sectionBtn("anomalies", "Anomalies", AlertTriangle, unackCount)}
      {expanded === "anomalies" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-1">
            <Select value={anomalyFilter} onValueChange={(v) => setAnomalyFilter(v as any)}>
              <SelectTrigger className={`h-7 flex-1 text-[10px] ${inputCls}`}><SelectValue placeholder="Filter..." /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="all" className={selectItemCls}>All Types</SelectItem>
                {(Object.keys(ANOMALY_META) as AnomalyType[]).map(type => (
                  <SelectItem key={type} value={type} className={selectItemCls}>{ANOMALY_META[type].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unackCount > 0 && <Button size="sm" variant="outline" className="h-7 text-[9px] border-slate-700 text-slate-400" onClick={() => update({ anomalies: mission.anomalies.map(a => ({ ...a, acknowledged: true })) })}><Check className="h-2.5 w-2.5 mr-1" /> Ack</Button>}
            <Button size="sm" variant="ghost" className="h-7 text-[9px] text-slate-500" onClick={() => update({ anomalies: [] })}>Clear</Button>
          </div>
          {filteredAnomalies.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No anomalies detected.</p>
          ) : (
            <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-thin">
              {filteredAnomalies.map(a => {
                const meta = ANOMALY_META[a.type]
                const Icon = ANOMALY_ICONS[meta.icon] || AlertTriangle
                return (
                  <div key={a.id} className={`flex items-start gap-1.5 rounded px-2 py-1 transition-colors ${a.acknowledged ? "opacity-40" : "bg-slate-800/30 border border-slate-700/20"}`}>
                    <Icon className="h-2.5 w-2.5 mt-0.5 shrink-0" style={{ color: SEVERITY_COLORS[a.severity] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-300 leading-tight line-clamp-2">{a.message}</p>
                      <span className="text-[7px] text-slate-600">{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {!a.acknowledged && (
                      <button onClick={() => update({ anomalies: mission.anomalies.map(x => x.id === a.id ? { ...x, acknowledged: true } : x) })} className="text-slate-500 hover:text-emerald-400 mt-0.5"><Check className="h-2.5 w-2.5" /></button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Detection Rules ─── */}
      {sectionBtn("rules", "Detection Rules", Settings2, undefined, "#8b5cf6")}
      {expanded === "rules" && (
        <div className="px-3 pb-3 space-y-2">
          <div className="space-y-0.5">
            {(Object.keys(ANOMALY_META) as AnomalyType[]).map(type => {
              const meta = ANOMALY_META[type]
              const on = mission.rules.enabledTypes.includes(type)
              return (
                <div key={type} className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, opacity: on ? 1 : 0.2 }} />
                    <span className={`text-[10px] ${on ? "text-slate-200" : "text-slate-500"}`}>{meta.label}</span>
                  </div>
                  <Switch checked={on} onCheckedChange={() => toggleType(type)} className="scale-[0.55]" />
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-1.5">
            {([
              { key: "maxSpeedKnots" as const, label: "Max Speed (kn)" },
              { key: "speedChangeThreshold" as const, label: "Speed Delta (kn)" },
              { key: "beaconOffSeconds" as const, label: "Beacon Off (s)" },
              { key: "stationaryMinutes" as const, label: "Stationary (min)" },
              { key: "courseDeviationDegrees" as const, label: "Course Dev (deg)" },
              { key: "beaconBlinkCount" as const, label: "Blink Count" },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <Label className="text-[8px] text-slate-600">{label}</Label>
                <Input type="number" value={mission.rules[key]} onChange={e => updateRule(key, Number(e.target.value))} className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
