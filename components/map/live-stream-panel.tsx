"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Radio, Wifi, WifiOff, Play, Square, RefreshCw,
  MapPin, Activity, Clock, Zap, Eye, EyeOff, Plus,
  Trash2, ChevronDown, ChevronUp, Signal, AlertTriangle,
} from "lucide-react"
import type { StreamStatus } from "@/hooks/use-ais-stream"
import type { WatchZone } from "@/lib/map/mission-types"
import type { TrackingSource } from "@/lib/map/types"
import { ZONE_COLORS } from "@/lib/map/mission-types"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface LiveStreamPanelProps {
  streamStatus: StreamStatus
  streamEnabled: boolean
  onToggleStream: (enabled: boolean) => void
  selectedSourceId: number | null
  onSelectSource: (id: number | null) => void
  liveVesselCount: number
  watchZones: WatchZone[]
  onDrawZone: () => void
  isDrawingZone: boolean
  onToggleZone: (id: string) => void
  onRemoveZone: (id: string) => void
  onClearLiveVessels: () => void
}

// Stream phase color/label mapping
const PHASE_META: Record<string, { color: string; label: string; pulse: boolean }> = {
  idle: { color: "#64748b", label: "Idle", pulse: false },
  connecting: { color: "#f59e0b", label: "Connecting", pulse: true },
  streaming: { color: "#22c55e", label: "Live", pulse: true },
  reconnecting: { color: "#f97316", label: "Reconnecting", pulse: true },
  disconnected: { color: "#ef4444", label: "Disconnected", pulse: false },
  timeout: { color: "#ef4444", label: "Timed Out", pulse: false },
  error: { color: "#ef4444", label: "Error", pulse: false },
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export default function LiveStreamPanel({
  streamStatus,
  streamEnabled,
  onToggleStream,
  selectedSourceId,
  onSelectSource,
  liveVesselCount,
  watchZones,
  onDrawZone,
  isDrawingZone,
  onToggleZone,
  onRemoveZone,
  onClearLiveVessels,
}: LiveStreamPanelProps) {
  const [showZones, setShowZones] = useState(true)
  const { data: sources = [] } = useSWR<TrackingSource[]>("/api/map/sources", fetcher, { refreshInterval: 15000 })

  // Filter to only AISstream sources
  const aisSources = useMemo(() => {
    if (!Array.isArray(sources)) return []
    return sources.filter(s => s.source_type === "aisstream" && s.is_active)
  }, [sources])

  const phaseMeta = PHASE_META[streamStatus.phase] || PHASE_META.idle
  const enabledZones = watchZones.filter(z => z.enabled)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Signal className="h-3 w-3" />
          Live Stream
        </h3>
        <Badge variant="outline" className="text-[9px] h-4 gap-1" style={{
          borderColor: phaseMeta.color,
          color: phaseMeta.color,
        }}>
          <div className="relative flex items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: phaseMeta.color }} />
            {phaseMeta.pulse && (
              <div className="absolute w-1.5 h-1.5 rounded-full animate-ping" style={{ background: phaseMeta.color, opacity: 0.6 }} />
            )}
          </div>
          {phaseMeta.label}
        </Badge>
      </div>

      {/* Connection Control */}
      <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {streamStatus.connected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-500" />
            )}
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {streamStatus.connected ? "Connected" : streamStatus.phase === "connecting" ? "Connecting..." : "Disconnected"}
              </div>
              <div className="text-[9px] text-slate-500">
                AISstream WebSocket
              </div>
            </div>
          </div>
          <Switch
            checked={streamEnabled}
            onCheckedChange={onToggleStream}
            className="scale-75"
          />
        </div>

        {/* Source Selector */}
        <div className="mb-3">
          <label className="block text-[10px] text-slate-400 mb-1">Source</label>
          {aisSources.length === 0 ? (
            <div className="text-[10px] text-amber-400/80 bg-amber-500/10 rounded px-2 py-1.5 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>No active AISstream sources. Add one in the Sources tab.</span>
            </div>
          ) : (
            <select
              className="w-full h-7 text-xs rounded-md border px-2 bg-slate-900 border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedSourceId ?? ""}
              onChange={e => onSelectSource(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select source...</option>
              {aisSources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Stream Button */}
        {selectedSourceId && (
          <Button
            size="sm"
            className={`w-full h-8 text-xs gap-1.5 ${
              streamEnabled
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
            }`}
            variant="ghost"
            onClick={() => onToggleStream(!streamEnabled)}
            disabled={!selectedSourceId || (enabledZones.length === 0 && !streamEnabled)}
          >
            {streamEnabled ? (
              <><Square className="h-3 w-3" /> Stop Stream</>
            ) : (
              <><Play className="h-3 w-3" /> Start Live Stream</>
            )}
          </Button>
        )}
      </div>

      {/* Live Stats */}
      {(streamEnabled || streamStatus.messageCount > 0) && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-800/40 rounded-md px-2.5 py-2 border border-slate-700/30">
            <div className="flex items-center gap-1 mb-0.5">
              <Activity className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Messages</span>
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {streamStatus.messageCount.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 tabular-nums">
              {streamStatus.messagesPerSecond.toFixed(1)}/s
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-md px-2.5 py-2 border border-slate-700/30">
            <div className="flex items-center gap-1 mb-0.5">
              <MapPin className="h-2.5 w-2.5 text-blue-400" />
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Vessels</span>
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {liveVesselCount.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500">
              unique tracked
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-md px-2.5 py-2 border border-slate-700/30">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="h-2.5 w-2.5 text-amber-400" />
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Uptime</span>
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {formatUptime(streamStatus.uptime)}
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-md px-2.5 py-2 border border-slate-700/30">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="h-2.5 w-2.5 text-cyan-400" />
              <span className="text-[8px] text-slate-500 uppercase tracking-wider">Zones</span>
            </div>
            <div className="text-sm font-bold text-slate-100 tabular-nums">
              {enabledZones.length}
            </div>
            <div className="text-[9px] text-slate-500">
              active
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {streamStatus.error && (
        <div className="text-[10px] text-red-400 bg-red-500/10 rounded-md px-2.5 py-2 flex items-start gap-1.5 border border-red-500/20">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span className="break-words">{streamStatus.error}</span>
        </div>
      )}

      {/* Live Activity Bar (animated) */}
      {streamStatus.connected && (
        <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `linear-gradient(90deg, transparent, ${phaseMeta.color}88, transparent)`,
              animation: "streamPulse 2s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Zone Management */}
      <div className="border-t border-slate-700/50 pt-3">
        <button
          onClick={() => setShowZones(!showZones)}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Stream Zones</span>
            {enabledZones.length > 0 && (
              <Badge variant="outline" className="text-[8px] h-3.5 border-blue-500/30 text-blue-400">
                {enabledZones.length}
              </Badge>
            )}
          </div>
          {showZones ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
        </button>

        {showZones && (
          <div className="space-y-2">
            <Button
              size="sm"
              variant={isDrawingZone ? "default" : "outline"}
              className={`w-full h-7 text-[10px] gap-1 ${!isDrawingZone ? "border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" : ""}`}
              onClick={onDrawZone}
            >
              {isDrawingZone ? (
                <><MapPin className="h-3 w-3 animate-pulse" /> Click two corners on map...</>
              ) : (
                <><Plus className="h-3 w-3" /> Add Watch Zone</>
              )}
            </Button>

            {watchZones.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-3">
                Draw watch zones on the map to define streaming areas. Each zone becomes a bounding box filter for AISstream.
              </p>
            ) : (
              <div className="space-y-1">
                {watchZones.map(zone => (
                  <div
                    key={zone.id}
                    className="flex items-center gap-2 bg-slate-800/40 rounded-md px-2 py-1.5 border border-slate-700/20"
                  >
                    <div
                      className="h-3 w-3 rounded-sm shrink-0 border"
                      style={{
                        background: zone.enabled ? zone.color : "transparent",
                        borderColor: zone.color,
                        opacity: zone.enabled ? 1 : 0.4,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-slate-200 truncate">{zone.name}</div>
                      <div className="text-[8px] text-slate-500 font-mono tabular-nums">
                        {zone.bounds.south.toFixed(1)},{zone.bounds.west.toFixed(1)} to {zone.bounds.north.toFixed(1)},{zone.bounds.east.toFixed(1)}
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleZone(zone.id)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {zone.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => onRemoveZone(zone.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear live vessels */}
      {liveVesselCount > 0 && (
        <div className="border-t border-slate-700/50 pt-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-[10px] text-slate-400 hover:text-white gap-1"
            onClick={onClearLiveVessels}
          >
            <RefreshCw className="h-3 w-3" />
            Clear {liveVesselCount} live vessels
          </Button>
        </div>
      )}
    </div>
  )
}
