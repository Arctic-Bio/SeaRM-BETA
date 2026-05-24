"use client"

import React, { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Plus, Trash2, Power, PowerOff, RefreshCw, Loader2, ChevronDown, ChevronRight,
  ExternalLink, AlertTriangle, Pencil, Save, X,
} from "lucide-react"
import { SOURCE_TYPES, getSourceTypeInfo } from "@/lib/map/source-config"
import type { TrackingSource } from "@/lib/map/types"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Shared input class -- white text on dark background so it's always readable
const inputCls = "w-full h-7 text-xs rounded-md border px-2 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
const selectCls = "w-full h-7 text-xs rounded-md border px-2 bg-slate-900 border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
const labelCls = "block text-[10px] text-slate-400 mb-0.5"

// Renders the config fields for a source type
function ConfigFields({ typeInfo, config, onChange }: { typeInfo: ReturnType<typeof getSourceTypeInfo>; config: Record<string, any>; onChange: (key: string, val: any) => void }) {
  if (!typeInfo) return null
  return (
    <>
      {typeInfo.fields.map(f => (
        <div key={f.key}>
          <label className={labelCls}>{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
          {f.type === "select" ? (
            <select className={selectCls} value={config[f.key] ?? f.default ?? ""} onChange={e => onChange(f.key, e.target.value)}>
              {!config[f.key] && !f.default && <option value="">Select...</option>}
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input className={inputCls}
              type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"}
              placeholder={f.placeholder || ""} value={config[f.key] ?? f.default ?? ""}
              onChange={e => onChange(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />
          )}
          {f.description && <p className="text-[9px] text-slate-400 mt-0.5">{f.description}</p>}
        </div>
      ))}
    </>
  )
}

interface SourcePanelProps {
  onPassthroughVessels?: (vessels: any[], sourceName: string) => void
  missionBoundingBoxes?: number[][][]
  missionMMSIs?: string[]
  }
  
export default function SourcePanel({ onPassthroughVessels, missionBoundingBoxes, missionMMSIs }: SourcePanelProps) {
  const { data: sources = [], mutate } = useSWR<TrackingSource[]>("/api/map/sources", fetcher, { refreshInterval: 10000 })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editConfig, setEditConfig] = useState<Record<string, any>>({})
  const [editName, setEditName] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [fetching, setFetching] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newSource, setNewSource] = useState({ name: "", slug: "", source_type: "", config: {} as Record<string, any> })

  const handleAdd = async () => {
    if (!newSource.name || !newSource.source_type) return
    const slug = newSource.slug || newSource.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const typeInfo = getSourceTypeInfo(newSource.source_type)
    const apiUrl = newSource.config.api_url || newSource.config.ws_url || typeInfo?.fields.find(f => f.key === "api_url" || f.key === "ws_url")?.default || null
    const apiKey = newSource.config.api_key || null

    const res = await fetch("/api/map/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newSource, slug, api_url: apiUrl, api_key: apiKey, config: newSource.config }),
    })
    if (res.ok) {
      toast.success(`Source "${newSource.name}" added`)
      setAdding(false)
      setNewSource({ name: "", slug: "", source_type: "", config: {} })
      mutate()
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to add source")
    }
  }

  const startEdit = (src: TrackingSource) => {
    setEditingId(src.id)
    setEditName(src.name)
    const cfg = { ...(typeof src.config === "object" && src.config !== null ? src.config as Record<string, any> : {}) }
    if (src.api_key && !cfg.api_key) cfg.api_key = src.api_key
    if (src.api_url && !cfg.api_url && !cfg.ws_url) {
      const typeInfo = getSourceTypeInfo(src.source_type)
      const isWs = typeInfo?.fields.some(f => f.key === "ws_url")
      if (isWs) cfg.ws_url = src.api_url
      else cfg.api_url = src.api_url
    }
    setEditConfig(cfg)
    setExpandedId(src.id)
  }

  const saveEdit = async (src: TrackingSource) => {
    setSaving(true)
    const typeInfo = getSourceTypeInfo(src.source_type)
    const apiUrl = editConfig.api_url || editConfig.ws_url || typeInfo?.fields.find(f => f.key === "api_url" || f.key === "ws_url")?.default || src.api_url
    const apiKey = editConfig.api_key || src.api_key

    const res = await fetch("/api/map/sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: src.id, name: editName, api_url: apiUrl, api_key: apiKey, config: editConfig }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`"${editName}" updated`)
      setEditingId(null)
      mutate()
    } else {
      const err = await res.json().catch(() => ({ error: "Failed to update" }))
      toast.error(err.error || "Failed to update")
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditConfig({})
    setEditName("")
  }

  const toggleActive = async (src: TrackingSource) => {
    try {
      const res = await fetch("/api/map/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: src.id, is_active: !src.is_active }),
      })
      if (res.ok) {
        mutate()
        toast.success(`${src.name} ${src.is_active ? "deactivated" : "activated"}`)
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(err.error || "Failed to toggle source")
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle source")
    }
  }

  const deleteSource = async (id: number, name: string) => {
    await fetch(`/api/map/sources?id=${id}`, { method: "DELETE" })
    mutate()
    if (editingId === id) cancelEdit()
    toast.success(`"${name}" deleted`)
  }

  const fetchNow = async (src: TrackingSource) => {
    setFetching(src.id)
    const payload = {
      source_id: src.id,
      ...(missionBoundingBoxes?.length ? { missionBoundingBoxes } : {}),
      ...(src.source_type === "aisstream" && missionMMSIs?.length ? { missionMMSIs } : {}),
    }
    try {
      const res = await fetch("/api/map/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      mutate()
      if (res.ok) {
        const isExternal = src.source_type !== "internal_fleet"
        if (isExternal && onPassthroughVessels && result.vessels) {
          onPassthroughVessels(result.vessels, src.name)
          toast.success(`${result.fetched} vessels loaded from ${src.name} (live, not saved)`)
        } else {
          toast.success(`Fetched ${result.fetched} vessels from ${src.name}${result.inserted != null ? ` (${result.inserted} saved)` : ""}`)
        }
      } else {
        toast.error(result.error || "Fetch failed")
      }
    } catch (e: any) {
      toast.error(e.message || "Fetch failed")
    }
    setFetching(null)
  }

  const newTypeInfo = getSourceTypeInfo(newSource.source_type)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Data Sources</h3>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-400 hover:text-white" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : <><Plus className="h-3 w-3 mr-1" />Add</>}
        </Button>
      </div>

      {/* ─── Add New Source Form ─── */}
      {adding && (
        <Card className="p-3 bg-slate-800/80 border-slate-700 flex flex-col gap-2.5">
          <div>
            <label className={labelCls}>Source Type</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {SOURCE_TYPES.map(st => (
                <button key={st.value} onClick={() => setNewSource(prev => ({ ...prev, source_type: st.value, config: {} }))}
                  className={`p-2 rounded-md border text-left transition-all ${newSource.source_type === st.value ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                    <span className="text-[10px] font-medium text-slate-200">{st.label}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{st.description.split(".")[0]}</p>
                </button>
              ))}
            </div>
          </div>

          {newSource.source_type && (
            <>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={newSource.name}
                  onChange={e => setNewSource(prev => ({ ...prev, name: e.target.value }))} placeholder={newTypeInfo?.label || "Source name"} />
              </div>

              <ConfigFields typeInfo={newTypeInfo} config={newSource.config}
                onChange={(key, val) => setNewSource(prev => ({ ...prev, config: { ...prev.config, [key]: val } }))} />

              {newTypeInfo?.docs_url && (
                <a href={newTypeInfo.docs_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                  <ExternalLink className="h-2.5 w-2.5" />API Documentation
                </a>
              )}

              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newSource.name}>Add Source</Button>
            </>
          )}
        </Card>
      )}

      {/* ─── Existing Sources ─── */}
      <div className="flex flex-col gap-1.5">
        {(!Array.isArray(sources) || sources.length === 0) && !adding && (
          <p className="text-[11px] text-slate-500 text-center py-4">No data sources configured. Add one to start tracking vessels.</p>
        )}
        {Array.isArray(sources) && sources.map(src => {
          const stInfo = getSourceTypeInfo(src.source_type)
          const isExpanded = expandedId === src.id
          const isEditing = editingId === src.id
          return (
            <Card key={src.id} className="bg-slate-800/60 border-slate-700/80 overflow-hidden">
              {/* Source header row */}
              <button className="w-full p-2.5 flex items-center gap-2 text-left" onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : src.id) }}>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: src.is_active ? (stInfo?.color || "#3b82f6") : "#475569" }} />
                  {src.is_active && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate">{src.name}</span>
                    <Badge variant="outline" className="text-[8px] h-3.5 border-slate-600 text-slate-400">{stInfo?.label || src.source_type}</Badge>
                    {src.is_active && <Badge variant="outline" className="text-[8px] h-3.5 border-green-700 text-green-400">Active</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{src.vessel_count} vessels</span>
                    {src.last_fetched_at && <span className="text-[10px] text-slate-500">&middot; {new Date(src.last_fetched_at).toLocaleTimeString()}</span>}
                    {src.last_error && <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />}
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                  {/* Error display */}
                  {src.last_error && (
                    <div className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-2 py-1.5 flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span className="break-all">{src.last_error}</span>
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2 bg-slate-900/50 rounded-md p-2.5 border border-slate-700/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Pencil className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Edit Source</span>
                      </div>
                      <div>
                        <label className={labelCls}>Name</label>
                        <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <ConfigFields typeInfo={stInfo} config={editConfig}
                        onChange={(key, val) => setEditConfig(prev => ({ ...prev, [key]: val }))} />
                      <div className="flex gap-1.5 mt-1">
                        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => saveEdit(src)} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white gap-1" onClick={cancelEdit}>
                          <X className="h-3 w-3" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View mode -- config summary */
                    <div className="bg-slate-900/30 rounded-md p-2 text-[10px]">
                      <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                        <span className="text-slate-500">Type</span>
                        <span className="text-slate-300">{stInfo?.label || src.source_type}</span>
                        {src.api_url && (
                          <React.Fragment key="src-url">
                            <span className="text-slate-500">URL</span>
                            <span className="text-slate-300 font-mono truncate">{src.api_url}</span>
                          </React.Fragment>
                        )}
                        {src.api_key && (
                          <React.Fragment key="src-key">
                            <span className="text-slate-500">API Key</span>
                            <span className="text-slate-300 font-mono">{"*".repeat(8)}...{src.api_key.slice(-4)}</span>
                          </React.Fragment>
                        )}
                        <span className="text-slate-500">Vessels</span>
                        <span className="text-slate-300">{src.vessel_count}</span>
                        <span className="text-slate-500">Status</span>
                        <span className={src.is_active ? "text-green-400" : "text-slate-500"}>{src.is_active ? "Active" : "Inactive"}</span>
                        {src.last_fetched_at && (
                          <React.Fragment key="src-fetch">
                            <span className="text-slate-500">Last fetch</span>
                            <span className="text-slate-300">{new Date(src.last_fetched_at).toLocaleString()}</span>
                          </React.Fragment>
                        )}
                        {/* Show extra config values */}
                        {typeof src.config === "object" && src.config !== null && Object.entries(src.config as Record<string, any>).filter(([k]) => !["api_key","api_url","ws_url"].includes(k)).map(([k, v]) => (
                          <React.Fragment key={`cfg-${k}`}>
                            <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
                            <span className="text-slate-300 truncate">{String(v)}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
                      onClick={() => toggleActive(src)}>
                      {src.is_active ? <><PowerOff className="h-3 w-3 mr-1" />Deactivate</> : <><Power className="h-3 w-3 mr-1" />Activate</>}
                    </Button>
                    {!isEditing && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300"
                        onClick={() => startEdit(src)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white gap-0.5"
                      onClick={() => fetchNow(src)} disabled={fetching === src.id} title={src.source_type === "internal_fleet" ? "Fetch & save to DB" : "Fetch live data"}>
                      {fetching === src.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span>{src.source_type === "internal_fleet" ? "Fetch" : "Load"}</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
                      onClick={() => deleteSource(src.id, src.name)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {stInfo?.docs_url && (
                    <a href={stInfo.docs_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400 hover:underline">
                      <ExternalLink className="h-2.5 w-2.5" />{stInfo.label} Documentation
                    </a>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
