"use client"

import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react"

interface MapStatusBarProps {
  totalVessels: number
  activeSources: number
  fleetCount: number
  liveCount: number
  autoRefresh: boolean
  countdown: number
  isValidating: boolean
  onToggleAutoRefresh: () => void
  onManualRefresh: () => void
  onClearLive: () => void
}

export default function MapStatusBar({
  totalVessels,
  activeSources,
  fleetCount,
  liveCount,
  autoRefresh,
  countdown,
  isValidating,
  onToggleAutoRefresh,
  onManualRefresh,
  onClearLive,
}: MapStatusBarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
      <div className="flex items-center gap-1.5">
        {autoRefresh ? (
          <Wifi className="h-3 w-3 text-emerald-400" />
        ) : (
          <WifiOff className="h-3 w-3 text-slate-500" />
        )}
        <span className="text-[10px] text-slate-400 font-medium tabular-nums">
          {totalVessels} vessels &middot; {activeSources} source
          {activeSources !== 1 ? "s" : ""}
          {fleetCount > 0 && (
            <span className="text-emerald-400">
              {" "}
              &middot; {fleetCount} fleet
            </span>
          )}
          {liveCount > 0 && (
            <span className="text-cyan-400">
              {" "}
              &middot; {liveCount} live
            </span>
          )}
        </span>
        {liveCount > 0 && (
          <button
            onClick={onClearLive}
            className="text-[9px] text-cyan-400 hover:text-cyan-300 underline ml-1"
          >
            clear
          </button>
        )}
      </div>
      <div className="w-px h-3 bg-slate-700" />
      <button
        onClick={onToggleAutoRefresh}
        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors tabular-nums ${
          autoRefresh
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        {autoRefresh ? `${countdown}s` : "Paused"}
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="h-5 w-5 p-0 text-slate-400 hover:text-white"
        onClick={onManualRefresh}
        disabled={isValidating}
      >
        {isValidating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
