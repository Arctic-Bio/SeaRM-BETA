"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Cloud, Plus, Trash2, ExternalLink, Eye, EyeOff, Key, ChevronDown, ChevronRight, X,
} from "lucide-react"
import {
  WEATHER_PROVIDERS, getWeatherProvider,
  type WeatherSource, type WeatherLayerDef, type WeatherProviderDef,
} from "@/lib/map/weather-config"

const inputCls = "w-full h-7 text-xs rounded-md border px-2 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
const labelCls = "block text-[10px] text-slate-400 mb-0.5"

export interface WeatherState {
  sources: WeatherSource[]
  globalOpacity: number
}

interface WeatherPanelProps {
  weatherState: WeatherState
  onWeatherChange: (state: WeatherState) => void
}

export default function WeatherPanel({ weatherState, onWeatherChange }: WeatherPanelProps) {
  const [adding, setAdding] = useState(false)
  const [newProviderId, setNewProviderId] = useState("")
  const [newApiKey, setNewApiKey] = useState("")
  const [newCustomUrl, setNewCustomUrl] = useState("")
  const [newCustomLabel, setNewCustomLabel] = useState("")
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  const { sources } = weatherState

  // Add a weather source
  const addSource = useCallback(() => {
    if (!newProviderId) return
    const provider = getWeatherProvider(newProviderId)
    if (!provider) return

    if (provider.requiresKey && !newApiKey.trim()) {
      toast.error(`${provider.label} requires an API key`)
      return
    }

    if (sources.some(s => s.providerId === newProviderId && newProviderId !== "custom_weather")) {
      toast.error(`${provider.label} is already added`)
      return
    }

    const newSource: WeatherSource = {
      providerId: newProviderId,
      apiKey: newApiKey.trim() || undefined,
      enabledLayers: [],
    }

    // For custom weather, add the user-defined layer
    if (newProviderId === "custom_weather" && newCustomUrl.trim()) {
      newSource.customLayers = [{
        id: `custom_${Date.now()}`,
        label: newCustomLabel || "Custom Layer",
        description: "User-provided weather tile layer",
        unit: "",
        tileUrl: newCustomUrl.trim(),
        opacity: 0.6,
      }]
    }

    onWeatherChange({ ...weatherState, sources: [...sources, newSource] })
    toast.success(`${provider.label} added`)
    setAdding(false)
    setNewProviderId("")
    setNewApiKey("")
    setNewCustomUrl("")
    setNewCustomLabel("")
  }, [newProviderId, newApiKey, newCustomUrl, newCustomLabel, sources, weatherState, onWeatherChange])

  // Remove a weather source
  const removeSource = (providerId: string) => {
    onWeatherChange({ ...weatherState, sources: sources.filter(s => s.providerId !== providerId) })
    toast.success("Weather source removed")
  }

  // Toggle a layer on/off for a given source
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

  // Update API key for a source
  const updateApiKey = (providerId: string, key: string) => {
    onWeatherChange({
      ...weatherState,
      sources: sources.map(s => s.providerId === providerId ? { ...s, apiKey: key } : s),
    })
  }

  // Get all layers for a source (provider default + custom)
  const getSourceLayers = (source: WeatherSource): WeatherLayerDef[] => {
    const provider = getWeatherProvider(source.providerId)
    if (!provider) return source.customLayers || []
    return [...provider.layers, ...(source.customLayers || [])]
  }

  // Count total active layers
  const totalActive = sources.reduce((n, s) => n + s.enabledLayers.length, 0)

  // Providers not yet added (except custom which can be added multiple times)
  const availableProviders = WEATHER_PROVIDERS.filter(p => p.id === "custom_weather" || !sources.some(s => s.providerId === p.id))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Cloud className="h-3.5 w-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Weather</h3>
          {totalActive > 0 && <Badge variant="outline" className="text-[8px] h-3.5 border-blue-600 text-blue-400">{totalActive} layer{totalActive !== 1 ? "s" : ""}</Badge>}
        </div>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-400 hover:text-white" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : <><Plus className="h-3 w-3 mr-1" />Add</>}
        </Button>
      </div>

      {/* ─── Global opacity slider ─── */}
      {totalActive > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500 shrink-0">Opacity</label>
          <input type="range" min="0" max="100" value={weatherState.globalOpacity * 100}
            onChange={e => onWeatherChange({ ...weatherState, globalOpacity: parseInt(e.target.value) / 100 })}
            className="flex-1 h-1 accent-blue-500" />
          <span className="text-[10px] text-slate-400 w-7 text-right">{Math.round(weatherState.globalOpacity * 100)}%</span>
        </div>
      )}

      {/* ─── Add Provider Form ─── */}
      {adding && (
        <Card className="p-3 bg-slate-800/80 border-slate-700 flex flex-col gap-2.5">
          <label className={labelCls}>Weather Provider</label>
          <div className="grid grid-cols-2 gap-1.5">
            {availableProviders.map(p => (
              <button key={p.id} onClick={() => setNewProviderId(p.id)}
                className={`p-2 rounded-md border text-left transition-all ${newProviderId === p.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-[10px] font-medium text-slate-200">{p.label}</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2">{p.description.split(".")[0]}</p>
                {p.requiresKey && <Badge variant="outline" className="text-[7px] h-3 mt-1 border-amber-700 text-amber-400">Key Required</Badge>}
                {!p.requiresKey && <Badge variant="outline" className="text-[7px] h-3 mt-1 border-green-700 text-green-400">Free</Badge>}
              </button>
            ))}
          </div>

          {newProviderId && (() => {
            const provider = getWeatherProvider(newProviderId) as WeatherProviderDef
            return (
              <>
                {provider.requiresKey && (
                  <div>
                    <label className={labelCls}>API Key <span className="text-red-400">*</span></label>
                    <input className={inputCls} type="password" placeholder={provider.keyPlaceholder || "API key"} value={newApiKey} onChange={e => setNewApiKey(e.target.value)} />
                    {provider.keyDescription && <p className="text-[9px] text-slate-400/70 mt-0.5">{provider.keyDescription}</p>}
                  </div>
                )}

                {newProviderId === "custom_weather" && (
                  <>
                    <div>
                      <label className={labelCls}>Tile URL Template <span className="text-red-400">*</span></label>
                      <input className={inputCls} placeholder="https://tiles.example.com/{z}/{x}/{y}.png?key={apikey}" value={newCustomUrl} onChange={e => setNewCustomUrl(e.target.value)} />
                      <p className="text-[9px] text-slate-400/70 mt-0.5">{"Use {z}, {x}, {y} for tile coords. Use {apikey} if your server needs a key."}</p>
                    </div>
                    <div>
                      <label className={labelCls}>Layer Name</label>
                      <input className={inputCls} placeholder="Wind / Waves / Custom" value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>API Key (optional)</label>
                      <input className={inputCls} type="password" placeholder="If your tile server requires a key" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Available layers preview */}
                {provider.layers.length > 0 && (
                  <div>
                    <label className={labelCls}>Available Layers</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {provider.layers.map(l => (
                        <Badge key={l.id} variant="outline" className="text-[8px] h-4 border-slate-600 text-slate-400">{l.label}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {provider.signupUrl && (
                  <a href={provider.signupUrl} target="_blank" rel="noopener" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                    <ExternalLink className="h-2.5 w-2.5" />{provider.label} Documentation
                  </a>
                )}

                <Button size="sm" className="h-7 text-xs" onClick={addSource}
                  disabled={provider.requiresKey && !newApiKey.trim()}>
                  Add {provider.label}
                </Button>
              </>
            )
          })()}
        </Card>
      )}

      {/* ─── Configured Sources ─── */}
      <div className="flex flex-col gap-1.5">
        {sources.length === 0 && !adding && (
          <p className="text-[11px] text-slate-500 text-center py-4">No weather sources. Add OpenWeatherMap, RainViewer, or a custom tile server.</p>
        )}
        {sources.map(src => {
          const provider = getWeatherProvider(src.providerId)
          if (!provider) return null
          const layers = getSourceLayers(src)
          const isExpanded = expandedProvider === src.providerId
          const activeCount = src.enabledLayers.length

          return (
            <Card key={src.providerId} className="bg-slate-800/60 border-slate-700/80 overflow-hidden">
              {/* Header */}
              <button className="w-full p-2.5 flex items-center gap-2 text-left" onClick={() => setExpandedProvider(isExpanded ? null : src.providerId)}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: activeCount > 0 ? provider.color : "#475569" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate">{provider.label}</span>
                    {activeCount > 0 && <Badge variant="outline" className="text-[8px] h-3.5 border-blue-600 text-blue-400">{activeCount} on</Badge>}
                    {!provider.requiresKey && <Badge variant="outline" className="text-[7px] h-3 border-green-800 text-green-500">Free</Badge>}
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />}
              </button>

              {/* Expanded: layers + settings */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                  {/* Layer toggles */}
                  {layers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {layers.filter(l => l.tileUrl).map(layer => {
                        const isOn = src.enabledLayers.includes(layer.id)
                        return (
                          <div key={layer.id} className="flex items-center justify-between py-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isOn ? <Eye className="h-3 w-3 text-blue-400" /> : <EyeOff className="h-3 w-3 text-slate-600" />}
                                <Label className="text-[11px] text-slate-300">{layer.label}</Label>
                                {layer.unit && <span className="text-[9px] text-slate-600">{layer.unit}</span>}
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5 ml-4">{layer.description}</p>
                            </div>
                            <Switch checked={isOn} onCheckedChange={() => toggleLayer(src.providerId, layer.id)} />
                          </div>
                        )
                      })}
                      {/* Show point-only layers with a note */}
                      {layers.filter(l => !l.tileUrl).map(layer => (
                        <div key={layer.id} className="flex items-center justify-between py-1 opacity-60">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <Cloud className="h-3 w-3 text-slate-600" />
                              <Label className="text-[11px] text-slate-500">{layer.label}</Label>
                              <Badge variant="outline" className="text-[7px] h-3 border-slate-700 text-slate-500">Point data</Badge>
                            </div>
                            <p className="text-[9px] text-slate-600 mt-0.5 ml-4">{layer.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500">No layers available for this provider.</p>
                  )}

                  {/* API Key management */}
                  {(provider.requiresKey || src.apiKey) && (
                    <div className="bg-slate-900/30 rounded-md p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Key className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[10px] text-slate-400 font-medium">API Key</span>
                      </div>
                      <input className={inputCls} type="password" value={src.apiKey || ""} placeholder={provider.keyPlaceholder || "API key"}
                        onChange={e => updateApiKey(src.providerId, e.target.value)} />
                    </div>
                  )}

                  {/* Remove button */}
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
                      onClick={() => removeSource(src.providerId)}>
                      <Trash2 className="h-3 w-3 mr-1" />Remove
                    </Button>
                    {provider.signupUrl && (
                      <a href={provider.signupUrl} target="_blank" rel="noopener"
                        className="flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400 hover:underline ml-auto">
                        <ExternalLink className="h-2.5 w-2.5" />Docs
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
