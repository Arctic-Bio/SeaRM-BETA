"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff, Search,
  Zap, WifiOff, Radio, LogIn, LogOut, TrendingUp, Anchor, Activity,
  Shield, MapPin, Settings2, AlertTriangle, Flame, Square, Check,
  Ship, BarChart3, Target,
} from "lucide-react"
import type { VesselPosition } from "@/lib/map/types"
import { categorizeShipType, SHIP_TYPE_CATEGORIES } from "@/lib/map/types"
import type {
  MissionState, WatchZone, WatchlistEntry, Anomaly, AnomalyType, AnomalyRules,
} from "@/lib/map/mission-types"
import {
  ANOMALY_META, SEVERITY_COLORS, ZONE_COLORS, WATCHLIST_COLORS,
} from "@/lib/map/mission-types"

// ─── Icon mapping for anomaly types ───
const ANOMALY_ICONS: Record<string, any> = {
  Zap, WifiOff, Radio, LogIn, LogOut, TrendingUp, Anchor, Activity, MapPin,
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface MissionPanelProps {
  mission: MissionState
  onMissionChange: (m: MissionState) => void
  vessels: VesselPosition[]
  onDrawZone: () => void
  isDrawingZone: boolean
}

type Section = "stats" | "zones" | "watchlist" | "anomalies" | "hotspots" | "rules"

export default function MissionPanel({
  mission, onMissionChange, vessels, onDrawZone, isDrawingZone,
}: MissionPanelProps) {
  const [expanded, setExpanded] = useState<Section | null>("stats")
  const [newWatchType, setNewWatchType] = useState<WatchlistEntry["identifierType"]>("mmsi")
  const [newWatchId, setNewWatchId] = useState("")
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | "all">("all")

  const toggle = (s: Section) => setExpanded(expanded === s ? null : s)
  const update = useCallback((partial: Partial<MissionState>) => onMissionChange({ ...mission, ...partial }), [mission, onMissionChange])

  // ─── Watch Zones ───
  const removeZone = (id: string) => update({ watchZones: mission.watchZones.filter(z => z.id !== id) })
  const toggleZone = (id: string) => update({
    watchZones: mission.watchZones.map(z => z.id === id ? { ...z, enabled: !z.enabled } : z),
  })

  // ─── Watchlist ───
  const addWatchlistEntry = () => {
    if (!newWatchId.trim()) return
    const entry: WatchlistEntry = {
      id: uid(), identifier: newWatchId.trim(), identifierType: newWatchType,
      label: newWatchId.trim(), color: WATCHLIST_COLORS[mission.watchlist.length % WATCHLIST_COLORS.length],
      notes: "", enabled: true, addedAt: new Date().toISOString(),
    }
    update({ watchlist: [...mission.watchlist, entry] })
    setNewWatchId("")
  }
  const removeWatchEntry = (id: string) => update({ watchlist: mission.watchlist.filter(e => e.id !== id) })
  const toggleWatchEntry = (id: string) => update({
    watchlist: mission.watchlist.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e),
  })

  // ─── Anomalies ───
  const filteredAnomalies = useMemo(() => {
    let list = mission.anomalies
    if (anomalyFilter !== "all") list = list.filter(a => a.type === anomalyFilter)
    return list.slice(-100).reverse()
  }, [mission.anomalies, anomalyFilter])

  const unacknowledgedCount = mission.anomalies.filter(a => !a.acknowledged).length
  const acknowledgeAll = () => update({
    anomalies: mission.anomalies.map(a => ({ ...a, acknowledged: true })),
  })
  const clearAnomalies = () => update({ anomalies: [] })
  const acknowledgeOne = (id: string) => update({
    anomalies: mission.anomalies.map(a => a.id === id ? { ...a, acknowledged: true } : a),
  })

  // ─── Rules ───
  const updateRule = <K extends keyof AnomalyRules>(key: K, value: AnomalyRules[K]) => {
    update({ rules: { ...mission.rules, [key]: value } })
  }
  const toggleDetectionType = (type: AnomalyType) => {
    const types = mission.rules.enabledTypes
    const next = types.includes(type) ? types.filter(t => t !== type) : [...types, type]
    updateRule("enabledTypes", next)
  }

  // ─── Vessel Class Breakdown ───
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of vessels) {
      const cat = categorizeShipType(v.ship_type)
      counts[cat] = (counts[cat] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
  }, [vessels])

  const movingCount = useMemo(() => vessels.filter(v => (v.speed ?? 0) > 0.5).length, [vessels])

  // ─── Vessel count in zones ───
  const vesselsInZones = useMemo(() => {
    const map: Record<string, number> = {}
    for (const zone of mission.watchZones) {
      if (!zone.enabled) continue
      let count = 0
      for (const v of vessels) {
        if (v.latitude >= zone.bounds.south && v.latitude <= zone.bounds.north &&
            v.longitude >= zone.bounds.west && v.longitude <= zone.bounds.east) {
          count++
        }
      }
      map[zone.id] = count
    }
    return map
  }, [mission.watchZones, vessels])

  // ─── Matched watchlist vessels ───
  const watchlistMatches = useMemo(() => {
    const map: Record<string, number> = {}
    for (const entry of mission.watchlist) {
      if (!entry.enabled) continue
      let count = 0
      const id = entry.identifier.toLowerCase()
      for (const v of vessels) {
        const match =
          (entry.identifierType === "mmsi" && v.mmsi?.toLowerCase() === id) ||
          (entry.identifierType === "imo" && v.imo?.toLowerCase() === id) ||
          (entry.identifierType === "name" && v.vessel_name?.toLowerCase().includes(id)) ||
          (entry.identifierType === "callsign" && v.callsign?.toLowerCase() === id)
        if (match) count++
      }
      map[entry.id] = count
    }
    return map
  }, [mission.watchlist, vessels])

  // ─── Shared styles ───
  const inputCls = "h-7 text-[10px] bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
  const outlineBtnCls = "border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
  const selectContentCls = "bg-slate-800 border-slate-700 text-slate-200"
  const selectItemCls = "text-slate-200 focus:bg-slate-700 focus:text-white"

  const sectionHeader = (section: Section, label: string, Icon: any, badgeCount?: number, badgeColor?: string) => (
    <button
      onClick={() => toggle(section)}
      className="w-full flex items-center justify-between px-2 py-2 hover:bg-slate-800/50 rounded-md transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-200">{label}</span>
        {badgeCount != null && badgeCount > 0 && (
          <Badge className="h-4 px-1.5 text-[9px] border-0" style={{
            background: `${badgeColor || "#ef4444"}20`,
            color: badgeColor || "#ef4444",
          }}>{badgeCount}</Badge>
        )}
      </div>
      {expanded === section ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
    </button>
  )

  return (
    <div className="flex flex-col gap-0.5">
      {/* ─── Mission Stats ─── */}
      <div className="grid grid-cols-3 gap-1.5 px-1 mb-1">
          <div className="bg-slate-800/40 rounded-md px-2 py-1.5 text-center border border-slate-700/30">
            <div className="text-lg font-bold text-slate-100">{vessels.length}</div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider">Vessels</div>
          </div>
          <div className="bg-slate-800/40 rounded-md px-2 py-1.5 text-center border border-slate-700/30">
            <div className="text-lg font-bold text-emerald-400">{movingCount}</div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider">Moving</div>
          </div>
          <div className="bg-slate-800/40 rounded-md px-2 py-1.5 text-center border border-slate-700/30">
            <div className="text-lg font-bold" style={{ color: unacknowledgedCount > 0 ? "#ef4444" : "#94a3b8" }}>{unacknowledgedCount}</div>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider">Alerts</div>
          </div>
        </div>

      {/* ─── Vessel Class Breakdown ─── */}
      {sectionHeader("stats", "Vessel Classes", Ship, classCounts.length, "#3b82f6")}
      {expanded === "stats" && (
        <div className="px-2 pb-2 space-y-1.5">
          {classCounts.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No vessels loaded. Fetch data from a source first.</p>
          ) : (
            <>
              {classCounts.map(([cat, count]) => {
                const meta = SHIP_TYPE_CATEGORIES[cat] || SHIP_TYPE_CATEGORIES.unknown
                const pct = vessels.length > 0 ? (count / vessels.length * 100) : 0
                return (
                  <div key={cat} className="flex items-center gap-2 bg-slate-800/30 rounded-md px-2 py-1 border border-slate-700/20">
                    <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-200">{meta.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-300">{count}</span>
                          <span className="text-[8px] text-slate-500">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-700/50 rounded-full mt-0.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Legend note */}
              <p className="text-[8px] text-slate-600 text-center pt-1">
                Classified by AIS ship type code (ITU-R M.1371-5)
              </p>
            </>
          )}
        </div>
      )}

      {/* ─── Watch Zones ─── */}
      {sectionHeader("zones", "Watch Zones", Square, mission.watchZones.filter(z => z.enabled).length, "#3b82f6")}
      {expanded === "zones" && (
        <div className="px-2 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isDrawingZone ? "default" : "outline"}
              className={`flex-1 h-7 text-[10px] gap-1 ${!isDrawingZone ? outlineBtnCls : ""}`}
              onClick={onDrawZone}
            >
              {isDrawingZone ? (
                <><MapPin className="h-3 w-3 animate-pulse" /> Drawing... click map corners</>
              ) : (
                <><Plus className="h-3 w-3" /> Draw Zone on Map</>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Switch checked={mission.showZones} onCheckedChange={v => update({ showZones: v })} className="scale-75" />
            <Label className="text-[10px] text-slate-400">Show zones on map</Label>
          </div>

          {mission.watchZones.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No watch zones. Click &quot;Draw Zone&quot; and click two corners on the map.</p>
          ) : (
            <div className="space-y-1.5">
              {mission.watchZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2 bg-slate-800/40 rounded-md px-2 py-1.5 border border-slate-700/20">
                  <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: zone.color, opacity: zone.enabled ? 1 : 0.3 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-slate-200 truncate">{zone.name}</div>
                    <div className="text-[9px] text-slate-500">
                      <span className="text-emerald-400">{vesselsInZones[zone.id] ?? 0}</span> vessels
                      {zone.alertOnEntry && " | Entry"}
                      {zone.alertOnExit && " | Exit"}
                    </div>
                  </div>
                  <button onClick={() => toggleZone(zone.id)} className="text-slate-500 hover:text-white transition-colors">
                    {zone.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button onClick={() => removeZone(zone.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Vessel Watchlist ─── */}
      {sectionHeader("watchlist", "Vessel Watchlist", Target, mission.watchlist.filter(e => e.enabled).length, "#22d3ee")}
      {expanded === "watchlist" && (
        <div className="px-2 pb-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <Select value={newWatchType} onValueChange={(v) => setNewWatchType(v as any)}>
              <SelectTrigger className={`h-7 w-20 text-[10px] ${inputCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="mmsi" className={selectItemCls}>MMSI</SelectItem>
                <SelectItem value="imo" className={selectItemCls}>IMO</SelectItem>
                <SelectItem value="name" className={selectItemCls}>Name</SelectItem>
                <SelectItem value="callsign" className={selectItemCls}>Callsign</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newWatchId}
              onChange={e => setNewWatchId(e.target.value)}
              placeholder="Enter identifier..."
              className={inputCls}
              onKeyDown={e => e.key === "Enter" && addWatchlistEntry()}
            />
            <Button size="sm" variant="outline" className={`h-7 w-7 p-0 shrink-0 ${outlineBtnCls}`} onClick={addWatchlistEntry}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Switch checked={mission.showWatchlistHighlights} onCheckedChange={v => update({ showWatchlistHighlights: v })} className="scale-75" />
            <Label className="text-[10px] text-slate-400">Highlight on map</Label>
          </div>

          {mission.watchlist.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No vessels being tracked. Add by MMSI, IMO, name, or callsign.</p>
          ) : (
            <div className="space-y-1.5">
              {mission.watchlist.map(entry => (
                <div key={entry.id} className="flex items-center gap-2 bg-slate-800/40 rounded-md px-2 py-1.5 border border-slate-700/20">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: entry.color, opacity: entry.enabled ? 1 : 0.3 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-slate-200 truncate">
                      {entry.label}
                      <span className="text-slate-500 ml-1 font-normal">({entry.identifierType.toUpperCase()})</span>
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {(watchlistMatches[entry.id] ?? 0) > 0
                        ? <span className="text-emerald-400">{watchlistMatches[entry.id]} match{(watchlistMatches[entry.id] ?? 0) !== 1 ? "es" : ""} found</span>
                        : "Not found in current data"
                      }
                    </div>
                  </div>
                  <button onClick={() => toggleWatchEntry(entry.id)} className="text-slate-500 hover:text-white transition-colors">
                    {entry.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button onClick={() => removeWatchEntry(entry.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Anomaly Feed ─── */}
      {sectionHeader("anomalies", "Anomaly Feed", AlertTriangle, unacknowledgedCount)}
      {expanded === "anomalies" && (
        <div className="px-2 pb-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <Select value={anomalyFilter} onValueChange={(v) => setAnomalyFilter(v as any)}>
              <SelectTrigger className={`h-7 flex-1 text-[10px] ${inputCls}`}>
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="all" className={selectItemCls}>All Types</SelectItem>
                {(Object.keys(ANOMALY_META) as AnomalyType[]).map(type => (
                  <SelectItem key={type} value={type} className={selectItemCls}>
                    {ANOMALY_META[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unacknowledgedCount > 0 && (
              <Button size="sm" variant="outline" className={`h-7 text-[10px] gap-1 shrink-0 ${outlineBtnCls}`} onClick={acknowledgeAll}>
                <Check className="h-3 w-3" /> Ack All
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-slate-500 shrink-0" onClick={clearAnomalies}>
              Clear
            </Button>
          </div>

          {filteredAnomalies.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-3">
              No anomalies detected yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
              {filteredAnomalies.map(anomaly => {
                const meta = ANOMALY_META[anomaly.type]
                const IconComp = ANOMALY_ICONS[meta.icon] || AlertTriangle
                return (
                  <div
                    key={anomaly.id}
                    className={`flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors border ${
                      anomaly.acknowledged
                        ? "bg-slate-800/20 opacity-50 border-transparent"
                        : "bg-slate-800/40 border-slate-700/20"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <IconComp className="h-3 w-3" style={{ color: SEVERITY_COLORS[anomaly.severity] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="h-3.5 px-1 text-[8px] border-0" style={{
                          background: `${meta.color}20`, color: meta.color,
                        }}>
                          {meta.label}
                        </Badge>
                        <Badge className="h-3.5 px-1 text-[8px] border-0" style={{
                          background: `${SEVERITY_COLORS[anomaly.severity]}20`,
                          color: SEVERITY_COLORS[anomaly.severity],
                        }}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">{anomaly.message}</p>
                      <span className="text-[8px] text-slate-600">{new Date(anomaly.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {!anomaly.acknowledged && (
                      <button onClick={() => acknowledgeOne(anomaly.id)} className="text-slate-500 hover:text-emerald-400 mt-0.5 shrink-0 transition-colors">
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Hotspot Anomalies ─── */}
      {sectionHeader("hotspots", "Hotspot Anomalies", Flame, mission.hotspots.length, "#f97316")}
      {expanded === "hotspots" && (
        <div className="px-2 pb-2 space-y-2">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Heatmap overlay showing where anomalies cluster. Beacon shutoffs, speed violations, and other events accumulate
            over time to reveal patterns and suspicious areas.
          </p>

          <div className="flex items-center gap-2">
            <Switch checked={mission.showHeatmap} onCheckedChange={v => update({ showHeatmap: v })} className="scale-75" />
            <Label className="text-[10px] text-slate-300">Show heatmap overlay</Label>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-slate-800/40 rounded-md p-2 border border-slate-700/20">
              <div className="text-slate-500 mb-0.5">Total Points</div>
              <div className="text-slate-200 font-bold text-sm">{mission.hotspots.length}</div>
            </div>
            <div className="bg-slate-800/40 rounded-md p-2 border border-slate-700/20">
              <div className="text-slate-500 mb-0.5">Beacon-Off</div>
              <div className="text-red-400 font-bold text-sm">{mission.hotspots.filter(h => h.beaconOff).length}</div>
            </div>
          </div>

          {mission.hotspots.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-medium">Top anomaly types:</div>
              {Object.entries(
                mission.hotspots.reduce((acc, h) => {
                  acc[h.type] = (acc[h.type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([type, count]) => {
                  const meta = ANOMALY_META[type as AnomalyType]
                  return (
                    <div key={type} className="flex items-center justify-between bg-slate-800/30 rounded px-2 py-1 border border-slate-700/20">
                      <span className="text-[10px]" style={{ color: meta?.color }}>{meta?.label || type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{count}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {mission.hotspots.length > 0 && (
            <Button
              size="sm" variant="ghost"
              className="w-full h-7 text-[10px] text-slate-500"
              onClick={() => update({ hotspots: [] })}
            >
              Clear Hotspot Data
            </Button>
          )}
        </div>
      )}

      {/* ─── Detection Rules ─── */}
      {sectionHeader("rules", "Detection Rules", Settings2, undefined, "#8b5cf6")}
      {expanded === "rules" && (
        <div className="px-2 pb-2 space-y-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-400">Rules apply in real-time -- changes take effect immediately</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-400 font-medium mb-1">Enabled Detections</div>
            {(Object.keys(ANOMALY_META) as AnomalyType[]).map(type => {
              const meta = ANOMALY_META[type]
              const enabled = mission.rules.enabledTypes.includes(type)
              return (
                <div key={type} className="flex items-center justify-between bg-slate-800/30 rounded-md px-2 py-1 border border-slate-700/20">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full transition-opacity" style={{ background: meta.color, opacity: enabled ? 1 : 0.2 }} />
                    <span className={`text-[10px] transition-colors ${enabled ? "text-slate-200" : "text-slate-500"}`}>{meta.label}</span>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => toggleDetectionType(type)} className="scale-[0.6]" />
                </div>
              )
            })}
          </div>

          <div className="border-t border-slate-800 pt-2 space-y-2">
            <div className="text-[10px] text-slate-400 font-medium">Thresholds</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "maxSpeedKnots" as const, label: "Max Speed (kn)", desc: "Flag vessels above this speed" },
                { key: "speedChangeThreshold" as const, label: "Speed Delta (kn)", desc: "Sudden acceleration/deceleration" },
                { key: "beaconOffSeconds" as const, label: "Beacon Off (sec)", desc: "Time before flagging lost signal" },
                { key: "stationaryMinutes" as const, label: "Stationary (min)", desc: "No movement for this duration" },
                { key: "courseDeviationDegrees" as const, label: "Course Dev (deg)", desc: "Heading change threshold" },
                { key: "beaconBlinkCount" as const, label: "Blink Count", desc: "On/off toggles to flag" },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="space-y-0.5">
                  <Label className="text-[9px] text-slate-500">{label}</Label>
                  <Input
                    type="number"
                    value={mission.rules[key]}
                    onChange={e => updateRule(key, Number(e.target.value))}
                    className={inputCls}
                  />
                  <p className="text-[7px] text-slate-600 leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
