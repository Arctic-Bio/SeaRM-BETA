"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Search, Navigation, Anchor } from "lucide-react"
import type { VesselPosition } from "@/lib/map/types"
import { categorizeShipType, SHIP_TYPE_CATEGORIES, NAV_STATUS_LABELS } from "@/lib/map/types"

interface VesselListPanelProps {
  vessels: VesselPosition[]
  selectedVessel: VesselPosition | null
  onSelectVessel: (v: VesselPosition) => void
}

export default function VesselListPanel({ vessels, selectedVessel, onSelectVessel }: VesselListPanelProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    vessels.forEach(v => {
      const cat = categorizeShipType(v.ship_type)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [vessels])

  const [renderLimit, setRenderLimit] = useState(100)

  const filtered = useMemo(() => {
    let list = vessels
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        (v.vessel_name?.toLowerCase().includes(q)) ||
        (v.mmsi?.includes(q)) ||
        (v.imo?.toLowerCase().includes(q)) ||
        (v.callsign?.toLowerCase().includes(q)) ||
        (v.destination?.toLowerCase().includes(q)) ||
        (v.flag?.toLowerCase().includes(q)) ||
        (v.source_name?.toLowerCase().includes(q))
      )
    }
    if (typeFilter) {
      list = list.filter(v => categorizeShipType(v.ship_type) === typeFilter)
    }
    // Sort: fleet first, then moving vessels, then alphabetical
    return list.sort((a, b) => {
      const aInternal = a.extra && (a.extra as any).internal ? 0 : 1
      const bInternal = b.extra && (b.extra as any).internal ? 0 : 1
      if (aInternal !== bInternal) return aInternal - bInternal
      const aMoving = (a.speed ?? 0) > 0.5 ? 0 : 1
      const bMoving = (b.speed ?? 0) > 0.5 ? 0 : 1
      if (aMoving !== bMoving) return aMoving - bMoving
      return (a.vessel_name || "").localeCompare(b.vessel_name || "")
    })
  }, [vessels, search, typeFilter])

  const displayed = filtered.slice(0, renderLimit)
  const hasMore = filtered.length > renderLimit

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Vessels</h3>
        <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-400">{vessels.length} tracked</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
        <input
          className="w-full h-7 pl-7 text-xs rounded-md border bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search by name, MMSI, IMO, flag..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setTypeFilter(null)}
          className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${!typeFilter ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500 hover:text-slate-300"}`}>
          All ({vessels.length})
        </button>
        {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const meta = SHIP_TYPE_CATEGORIES[cat]
          return (
            <button key={cat} onClick={() => setTypeFilter(typeFilter === cat ? null : cat)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${typeFilter === cat ? `text-white` : "text-slate-500 hover:text-slate-300"}`}
              style={typeFilter === cat ? { background: `${meta?.color}33`, color: meta?.color } : { background: "#1e293b" }}>
              {meta?.label || cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Vessel count */}
      {search && filtered.length > 0 && (
        <p className="text-[10px] text-slate-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}{hasMore ? `, showing ${renderLimit}` : ""}</p>
      )}

      {/* Vessel list */}
      <div className="flex flex-col gap-0.5 max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-[11px] text-slate-500 text-center py-6">
            {vessels.length === 0 ? "No vessels loaded. Fetch from a data source." : "No vessels match your search."}
          </p>
        )}
        {displayed.map(v => {
          const cat = categorizeShipType(v.ship_type)
          const meta = SHIP_TYPE_CATEGORIES[cat] || SHIP_TYPE_CATEGORIES.unknown
          const isSelected = selectedVessel?.mmsi === v.mmsi && v.mmsi != null
          const isMoving = (v.speed ?? 0) > 0.5
          const isInternal = v.extra && (v.extra as any).internal

          return (
            <button key={v.mmsi || v.id} onClick={() => onSelectVessel(v)}
              className={`w-full text-left p-2 rounded-md transition-all ${isSelected ? "bg-blue-500/15 border border-blue-500/30" : "hover:bg-slate-800/80 border border-transparent"}`}>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                  {isMoving && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-200 truncate">{v.vessel_name || "Unknown"}</span>
                    {isInternal && <Badge variant="outline" className="text-[7px] h-3 border-cyan-600 text-cyan-400">FLEET</Badge>}
                    {v.extra && (v.extra as any).passthrough && !isInternal && <Badge variant="outline" className="text-[7px] h-3 border-cyan-800 text-cyan-500">LIVE</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-slate-500 font-mono">{v.mmsi || "--"}</span>
                    {v.imo && <span className="text-[9px] text-slate-500 font-mono">IMO:{v.imo}</span>}
                    {v.flag && <span className="text-[9px] text-slate-500">{v.flag}</span>}
                    {v.source_name && <span className="text-[9px] text-slate-600">&middot; {v.source_name}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    {isMoving ? <Navigation className="h-2.5 w-2.5" /> : <Anchor className="h-2.5 w-2.5" />}
                    {(v.speed ?? 0).toFixed(1)} kn
                  </div>
                  <span className="text-[9px] text-slate-600">{(v.course ?? 0).toFixed(0)}&deg;</span>
                </div>
              </div>
            </button>
          )
        })}
        {hasMore && (
          <button onClick={() => setRenderLimit(prev => prev + 200)}
            className="w-full py-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-slate-800/50 rounded-md transition-colors">
            Show more ({filtered.length - renderLimit} remaining)
          </button>
        )}
      </div>
    </div>
  )
}
