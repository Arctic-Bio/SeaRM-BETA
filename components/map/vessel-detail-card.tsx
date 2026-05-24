"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Navigation, Anchor, Clock } from "lucide-react"
import type { VesselPosition } from "@/lib/map/types"
import {
  categorizeShipType,
  SHIP_TYPE_CATEGORIES,
  NAV_STATUS_LABELS,
} from "@/lib/map/types"

interface VesselDetailCardProps {
  vessel: VesselPosition
  onClose: () => void
}

export default function VesselDetailCard({
  vessel,
  onClose,
}: VesselDetailCardProps) {
  const detail = useMemo(() => {
    const cat = categorizeShipType(vessel.ship_type)
    const catMeta = SHIP_TYPE_CATEGORIES[cat] || SHIP_TYPE_CATEGORIES.unknown
    const navLabel =
      NAV_STATUS_LABELS[vessel.nav_status || ""] ||
      vessel.nav_status ||
      "Unknown"
    const isMoving = (vessel.speed ?? 0) > 0.5
    const isInternal = vessel.extra && (vessel.extra as any).internal
    return { cat, catMeta, navLabel, isMoving, isInternal }
  }, [vessel])

  return (
    <div className="absolute bottom-4 right-4 z-20 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      <div className="h-1" style={{ background: detail.catMeta.color }} />
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              {vessel.vessel_name || "Unknown Vessel"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant="outline"
                className="text-[8px] h-3.5"
                style={{
                  borderColor: detail.catMeta.color,
                  color: detail.catMeta.color,
                }}
              >
                {detail.catMeta.label}
              </Badge>
              {vessel.flag && (
                <Badge
                  variant="outline"
                  className="text-[8px] h-3.5 border-slate-600 text-slate-400"
                >
                  {vessel.flag}
                </Badge>
              )}
              {detail.isInternal && (
                <Badge
                  variant="outline"
                  className="text-[8px] h-3.5 border-cyan-600 text-cyan-400"
                >
                  FLEET
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xs px-1"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          {vessel.mmsi && (
            <>
              <span className="text-slate-500">MMSI</span>
              <span className="text-slate-300 font-mono text-right">
                {vessel.mmsi}
              </span>
            </>
          )}
          {vessel.imo && (
            <>
              <span className="text-slate-500">IMO</span>
              <span className="text-slate-300 font-mono text-right">
                {vessel.imo}
              </span>
            </>
          )}
          <span className="text-slate-500">Status</span>
          <span className="text-slate-300 text-right flex items-center justify-end gap-1">
            {detail.isMoving ? (
              <Navigation className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Anchor className="h-2.5 w-2.5 text-slate-500" />
            )}
            {detail.navLabel}
          </span>
          <span className="text-slate-500">Speed</span>
          <span className="text-slate-300 text-right tabular-nums">
            {(vessel.speed ?? 0).toFixed(1)} kn
          </span>
          <span className="text-slate-500">Course</span>
          <span className="text-slate-300 text-right tabular-nums">
            {(vessel.course ?? 0).toFixed(0)}&deg;
          </span>
          <span className="text-slate-500">Heading</span>
          <span className="text-slate-300 text-right tabular-nums">
            {(vessel.heading ?? 0).toFixed(0)}&deg;
          </span>
          <span className="text-slate-500">Position</span>
          <span className="text-slate-300 text-right font-mono text-[10px] tabular-nums">
            {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
          </span>
          {vessel.destination && (
            <>
              <span className="text-slate-500">Destination</span>
              <span className="text-slate-300 text-right truncate">
                {vessel.destination}
              </span>
            </>
          )}
          {vessel.draught != null && vessel.draught > 0 && (
            <>
              <span className="text-slate-500">Draught</span>
              <span className="text-slate-300 text-right tabular-nums">
                {vessel.draught.toFixed(1)} m
              </span>
            </>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[9px] text-slate-600 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {vessel.received_at
              ? new Date(vessel.received_at).toLocaleTimeString()
              : "--"}
          </span>
          <span className="text-[9px] text-slate-600">
            {vessel.source_name || "Unknown source"}
          </span>
        </div>
      </div>
    </div>
  )
}
