"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TILE_LAYERS } from "@/components/map/vessel-map"

interface LayersPanelProps {
  tileLayer: string
  setTileLayer: (v: string) => void
  showTrails: boolean
  setShowTrails: (v: boolean) => void
  showLabels: boolean
  setShowLabels: (v: boolean) => void
}

export default function LayersPanel({ tileLayer, setTileLayer, showTrails, setShowTrails, showLabels, setShowLabels }: LayersPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Base Map</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TILE_LAYERS).map(([key, tl]) => (
            <button key={key} onClick={() => setTileLayer(key)}
              className={`p-2.5 rounded-lg border text-center transition-all ${tileLayer === key ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"}`}>
              <div className="w-full h-8 rounded-md mb-1.5 overflow-hidden" style={{
                background: key === "dark" ? "#1a1a2e" : key === "satellite" ? "#2d4a2d" : key === "nautical" ? "#4a90d9" : "#e2e8f0"
              }} />
              <span className="text-[10px] font-medium text-slate-300">{tl.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Overlays</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-slate-300">Vessel Trails</Label>
              <p className="text-[9px] text-slate-500">Show position history as dotted lines</p>
            </div>
            <Switch checked={showTrails} onCheckedChange={setShowTrails} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-slate-300">Vessel Labels</Label>
              <p className="text-[9px] text-slate-500">Show vessel names on the map</p>
            </div>
            <Switch checked={showLabels} onCheckedChange={setShowLabels} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Legend</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Cargo", color: "#22c55e" },
            { label: "Tanker", color: "#ef4444" },
            { label: "Passenger", color: "#3b82f6" },
            { label: "Fishing", color: "#f59e0b" },
            { label: "Tug/Supply", color: "#8b5cf6" },
            { label: "Military", color: "#64748b" },
            { label: "Sailing", color: "#06b6d4" },
            { label: "SAR", color: "#f97316" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path d="M12 2 L4 20 L12 16 L20 20 Z" fill={item.color} stroke="#0f172a" strokeWidth="2" />
              </svg>
              <span className="text-[10px] text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
