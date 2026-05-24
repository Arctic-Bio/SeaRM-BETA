"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Cloud, Plus, Trash2, ExternalLink, Eye, EyeOff, Key,
  ChevronDown, ChevronRight, Layers, Palette,
} from "lucide-react"
import { TILE_LAYERS } from "@/components/map/vessel-map"
import {
  WEATHER_PROVIDERS, getWeatherProvider,
  type WeatherSource, type WeatherLayerDef, type WeatherProviderDef,
} from "@/lib/map/weather-config"
import type { WeatherState } from "@/components/map/weather-panel"

const inputCls = "w-full h-7 text-xs rounded-md border px-2 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
const labelCls = "block text-[10px] text-slate-400 mb-0.5"

interface DisplaySettingsPanelProps {
  tileLayer: string
  setTileLayer: (v: string) => void
  showTrails: boolean
  setShowTrails: (v: boolean) => void
  showLabels: boolean
  setShowLabels: (v: boolean) => void
  weatherState: WeatherState
  onWeatherChange: (state: WeatherState) => void
}

export default function DisplaySettingsPanel({
  tileLayer, setTileLayer, showTrails, setShowTrails, showLabels, setShowLabels,
  weatherState, onWeatherChange,
}: DisplaySettingsPanelProps) {
  const [adding, setAdding] = useState(false)
  const [newProviderId, setNewProviderId] = useState("")
  const [newApiKey, setNewApiKey] = useState("")
  const [newCustomUrl, setNewCustomUrl] = useState("")
  const [newCustomLabel, setNewCustomLabel] = useState("")
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [showWeather, setShowWeather] = useState(true)

  const { sources } = weatherState
  const totalActive = sources.reduce((n, s) => n + s.enabledLayers.length, 0)
  const availableProviders = WEATHER_PROVIDERS.filter(p => p.id === "custom_weather" || !sources.some(s => s.providerId === p.id))

  const addSource = useCallback(() => {
    if (!newProviderId) return
    const provider = getWeatherProvider(newProviderId)
    if (!provider) return
    if (provider.requiresKey && !newApiKey.trim()) { toast.error(`${provider.label} requires an API key`); return }
    if (sources.some(s => s.providerId === newProviderId && newProviderId !== "custom_weather")) { toast.error(`Already added`); return }
    const newSource: WeatherSource = { providerId: newProviderId, apiKey: newApiKey.trim() || undefined, enabledLayers: [] }
    if (newProviderId === "custom_weather" && newCustomUrl.trim()) {
      newSource.customLayers = [{ id: `custom_${Date.now()}`, label: newCustomLabel || "Custom Layer", description: "Custom tile layer", unit: "", tileUrl: newCustomUrl.trim(), opacity: 0.6 }]
    }
    onWeatherChange({ ...weatherState, sources: [...sources, newSource] })
    toast.success(`${provider.label} added`)
    setAdding(false); setNewProviderId(""); setNewApiKey(""); setNewCustomUrl(""); setNewCustomLabel("")
  }, [newProviderId, newApiKey, newCustomUrl, newCustomLabel, sources, weatherState, onWeatherChange])

  const toggleLayer = (providerId: string, layerId: string) => {
    onWeatherChange({
      ...weatherState,
      sources: sources.map(s => {
        if (s.providerId !== providerId) return s
        const has = s.enabledLayers.includes(layerId)
        return { ...s, enabledLayers: has ? s.enabledLayers.filter(l => l !== layerId) : [...s.enabledLayers, layerId] }
      }),
    })
  }

  const getSourceLayers = (source: WeatherSource): WeatherLayerDef[] => {
    const provider = getWeatherProvider(source.providerId)
    if (!provider) return source.customLayers || []
    return [...provider.layers, ...(source.customLayers || [])]
  }

  return (
    <div className="flex flex-col">
      {/* ─── Map Style ─── */}
      <div className="px-3 py-2 border-b border-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-3 w-3 text-slate-500" />
          <span className="text-[11px] font-medium text-slate-300">Map Style</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(TILE_LAYERS).map(([key, tl]) => (
            <button key={key} onClick={() => setTileLayer(key)}
              className={`p-1.5 rounded-md border text-center transition-all ${tileLayer === key ? "border-blue-500 bg-blue-500/10" : "border-slate-700/50 hover:border-slate-600 bg-slate-800/30"}`}>
              <div className="w-full h-5 rounded mb-1" style={{
                background: key === "dark" ? "#1a1a2e" : key === "satellite" ? "#2d4a2d" : key === "nautical" ? "#4a90d9" : "#e2e8f0"
              }} />
              <span className="text-[8px] font-medium text-slate-400">{tl.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overlays ─── */}
      <div className="px-3 py-2 border-b border-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3 w-3 text-slate-500" />
          <span className="text-[11px] font-medium text-slate-300">Overlays</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-slate-400">Vessel Trails</Label>
            <Switch checked={showTrails} onCheckedChange={setShowTrails} className="scale-[0.65]" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-slate-400">Vessel Labels</Label>
            <Switch checked={showLabels} onCheckedChange={setShowLabels} className="scale-[0.65]" />
          </div>
        </div>
      </div>

      {/* ─── Legend ─── */}
      <div className="px-3 py-2 border-b border-slate-800/50">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Legend</span>
        <div className="grid grid-cols-4 gap-1 mt-1.5">
          {[
            { label: "Cargo", color: "#22c55e" },
            { label: "Tanker", color: "#ef4444" },
            { label: "Passenger", color: "#3b82f6" },
            { label: "Fishing", color: "#f59e0b" },
            { label: "Tug", color: "#8b5cf6" },
            { label: "Military", color: "#64748b" },
            { label: "Sailing", color: "#06b6d4" },
            { label: "SAR", color: "#f97316" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" width="8" height="8">
                <path d="M12 2 L4 20 L12 16 L20 20 Z" fill={item.color} stroke="#0f172a" strokeWidth="2" />
              </svg>
              <span className="text-[8px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Weather ─── */}
      <div className="px-3 py-2">
        <div className="w-full flex items-center justify-between mb-2">
          <button onClick={() => setShowWeather(!showWeather)} className="flex items-center gap-2">
            <Cloud className="h-3 w-3 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-300">Weather Layers</span>
            {totalActive > 0 && <Badge variant="outline" className="text-[8px] h-3.5 border-blue-600 text-blue-400">{totalActive}</Badge>}
            {showWeather ? <ChevronDown className="h-2.5 w-2.5 text-slate-600" /> : <ChevronRight className="h-2.5 w-2.5 text-slate-600" />}
          </button>
          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-slate-500 hover:text-white" onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : <><Plus className="h-2.5 w-2.5 mr-0.5" />Add</>}
          </Button>
        </div>

        {showWeather && (
          <div className="space-y-2">
            {/* Opacity */}
            {totalActive > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-[9px] text-slate-500 shrink-0">Opacity</label>
                <input type="range" min="0" max="100" value={weatherState.globalOpacity * 100}
                  onChange={e => onWeatherChange({ ...weatherState, globalOpacity: parseInt(e.target.value) / 100 })}
                  className="flex-1 h-1 accent-blue-500" />
                <span className="text-[9px] text-slate-500 w-7 text-right tabular-nums">{Math.round(weatherState.globalOpacity * 100)}%</span>
              </div>
            )}

            {/* Add form */}
            {adding && (
              <Card className="p-2.5 bg-slate-800/60 border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  {availableProviders.map(p => (
                    <button key={p.id} onClick={() => setNewProviderId(p.id)}
                      className={`p-1.5 rounded border text-left transition-all ${newProviderId === p.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"}`}>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-[9px] font-medium text-slate-200">{p.label}</span>
                      </div>
                      {p.requiresKey ? <Badge variant="outline" className="text-[7px] h-3 mt-0.5 border-amber-700 text-amber-400">Key</Badge>
                        : <Badge variant="outline" className="text-[7px] h-3 mt-0.5 border-green-700 text-green-400">Free</Badge>}
                    </button>
                  ))}
                </div>
                {newProviderId && (() => {
                  const provider = getWeatherProvider(newProviderId) as WeatherProviderDef
                  return (
                    <div className="space-y-1.5">
                      {provider.requiresKey && <input className={inputCls} type="password" placeholder={provider.keyPlaceholder || "API key"} value={newApiKey} onChange={e => setNewApiKey(e.target.value)} />}
                      {newProviderId === "custom_weather" && (
                        <>
                          <input className={inputCls} placeholder="Tile URL template..." value={newCustomUrl} onChange={e => setNewCustomUrl(e.target.value)} />
                          <input className={inputCls} placeholder="Layer name" value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} />
                        </>
                      )}
                      <Button size="sm" className="w-full h-7 text-[10px]" onClick={addSource} disabled={provider.requiresKey && !newApiKey.trim()}>Add {provider.label}</Button>
                    </div>
                  )
                })()}
              </Card>
            )}

            {/* Configured sources */}
            {sources.map(src => {
              const provider = getWeatherProvider(src.providerId)
              if (!provider) return null
              const layers = getSourceLayers(src)
              const isExpanded = expandedProvider === src.providerId
              const activeCount = src.enabledLayers.length
              return (
                <div key={src.providerId} className="rounded-md border border-slate-700/50 bg-slate-800/30 overflow-hidden">
                  <button className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left" onClick={() => setExpandedProvider(isExpanded ? null : src.providerId)}>
                    <div className="w-2 h-2 rounded-full" style={{ background: activeCount > 0 ? provider.color : "#475569" }} />
                    <span className="text-[10px] font-medium text-slate-200 flex-1">{provider.label}</span>
                    {activeCount > 0 && <Badge variant="outline" className="text-[7px] h-3 border-blue-600 text-blue-400">{activeCount}</Badge>}
                    {isExpanded ? <ChevronDown className="h-2.5 w-2.5 text-slate-600" /> : <ChevronRight className="h-2.5 w-2.5 text-slate-600" />}
                  </button>
                  {isExpanded && (
                    <div className="px-2.5 pb-2 space-y-1 border-t border-slate-700/30 pt-1.5">
                      {layers.filter(l => l.tileUrl).map(layer => (
                        <div key={layer.id} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-1.5">
                            {src.enabledLayers.includes(layer.id) ? <Eye className="h-2.5 w-2.5 text-blue-400" /> : <EyeOff className="h-2.5 w-2.5 text-slate-600" />}
                            <Label className="text-[10px] text-slate-300">{layer.label}</Label>
                          </div>
                          <Switch checked={src.enabledLayers.includes(layer.id)} onCheckedChange={() => toggleLayer(src.providerId, layer.id)} className="scale-[0.55]" />
                        </div>
                      ))}
                      {(provider.requiresKey || src.apiKey) && (
                        <div className="bg-slate-900/30 rounded p-1.5 flex items-center gap-1.5">
                          <Key className="h-2.5 w-2.5 text-amber-500" />
                          <input className={`${inputCls} flex-1`} type="password" value={src.apiKey || ""}
                            onChange={e => onWeatherChange({ ...weatherState, sources: sources.map(s => s.providerId === src.providerId ? { ...s, apiKey: e.target.value } : s) })} />
                        </div>
                      )}
                      <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px] text-red-400 hover:text-red-300" onClick={() => { onWeatherChange({ ...weatherState, sources: sources.filter(s => s.providerId !== src.providerId) }); toast.success("Removed") }}>
                        <Trash2 className="h-2.5 w-2.5 mr-1" />Remove
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {sources.length === 0 && !adding && <p className="text-[10px] text-slate-500 text-center py-2">No weather sources configured.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
