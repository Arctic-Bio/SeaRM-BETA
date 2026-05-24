"use client"

import { useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PanelLeftClose,
  PanelLeftOpen,
  Ship,
  Settings,
  Crosshair,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"
import VesselListPanel from "@/components/map/vessel-list-panel"
import OperationsPanel from "@/components/map/operations-panel"
import DisplaySettingsPanel from "@/components/map/display-settings-panel"
import VesselDetailCard from "@/components/map/vessel-detail-card"
import { useMapData } from "@/hooks/use-map-data"

const VesselMap = dynamic(() => import("@/components/map/vessel-map"), {
  ssr: false,
})

type PanelTab = "vessels" | "ops" | "display"

export default function LiveMapPage() {
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>("ops")

  const {
    vessels,
    dbVessels,
    passthroughVessels,
    selectedVessel,
    setSelectedVessel,
    handlePassthroughVessels,
    clearPassthrough,
    autoRefresh,
    setAutoRefresh,
    countdown,
    isValidating,
    handleManualRefresh,
    tileLayer,
    setTileLayer,
    showTrails,
    setShowTrails,
    showLabels,
    setShowLabels,
    weatherState,
    setWeatherState,
    rainViewerPaths,
    weatherActiveCount,
    mission,
    setMission,
    isDrawingZone,
    setIsDrawingZone,
    handleZoneDrawn,
    missionBoundingBoxes,
    missionMMSIs,
    missionAnomalyCount,
    stats,
    streamEnabled,
    setStreamEnabled,
    streamSourceId,
    setStreamSourceId,
    streamStatus,
    streamLiveCount,
    clearStreamVessels,
  } = useMapData()

  const panelTabs: { id: PanelTab; label: string; icon: any; badge?: number }[] = useMemo(
    () => [
      { id: "ops", label: "Operations", icon: Crosshair, badge: missionAnomalyCount },
      { id: "vessels", label: "Vessels", icon: Ship, badge: stats.total || undefined },
      { id: "display", label: "Display", icon: Settings, badge: weatherActiveCount || undefined },
    ],
    [missionAnomalyCount, stats.total, weatherActiveCount]
  )

  const handleClearAll = useCallback(() => {
    clearPassthrough()
    clearStreamVessels()
  }, [clearPassthrough, clearStreamVessels])

  return (
    <div className="flex-1 flex relative overflow-hidden bg-slate-950" style={{ height: "calc(100vh - 0px)" }}>
      {/* ─── Side Panel ─── */}
      <div className={`relative z-10 flex flex-col bg-slate-900/95 backdrop-blur-sm border-r border-slate-800 transition-all duration-300 ${panelOpen ? "w-80" : "w-0"} overflow-hidden`}>
        {panelOpen && (
          <div className="flex flex-col h-full min-w-[320px]">
            {/* Compact header with inline stats + controls */}
            <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 tabular-nums">
                    {autoRefresh ? <Wifi className="h-2.5 w-2.5 text-emerald-400" /> : <WifiOff className="h-2.5 w-2.5 text-slate-600" />}
                    <span className="font-medium text-slate-200">{stats.total}</span>
                    <span className="text-slate-600">vessels</span>
                    <span className="text-slate-700">&middot;</span>
                    <span className="text-emerald-400">{stats.moving}</span>
                    <span className="text-slate-600">moving</span>
                    {passthroughVessels.length > 0 && (
                      <>
                        <span className="text-slate-700">&middot;</span>
                        <span className="text-cyan-400">{passthroughVessels.length}</span>
                        <span className="text-slate-600">live</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors tabular-nums ${autoRefresh ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {autoRefresh ? `${countdown}s` : "Paused"}
                  </button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-slate-500 hover:text-white" onClick={handleManualRefresh} disabled={isValidating}>
                    {isValidating ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-slate-500 hover:text-white" onClick={() => setPanelOpen(false)}>
                    <PanelLeftClose className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Stream indicator (only when connected) */}
              {streamStatus.connected && (
                <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                  <div className="relative w-1.5 h-1.5">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                    <div className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-emerald-400">Streaming</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-slate-400 tabular-nums">{streamLiveCount} vessels</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-slate-400 tabular-nums">{streamStatus.messagesPerSecond.toFixed(1)}/s</span>
                </div>
              )}
            </div>

            {/* 3-tab bar */}
            <div className="flex border-b border-slate-800">
              {panelTabs.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setPanelTab(t.id)}
                    className={`flex-1 py-2 text-[10px] font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 -mb-px ${
                      panelTab === t.id
                        ? "text-blue-400 border-blue-400"
                        : "text-slate-500 border-transparent hover:text-slate-300"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {t.label}
                    {t.badge != null && t.badge > 0 && (
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 rounded-full px-1 min-w-[14px] text-center">
                        {t.badge > 99 ? "99+" : t.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {panelTab === "vessels" && (
                <VesselListPanel
                  vessels={vessels}
                  selectedVessel={selectedVessel}
                  onSelectVessel={setSelectedVessel}
                />
              )}
              {panelTab === "ops" && (
                <OperationsPanel
                  mission={mission}
                  onMissionChange={setMission}
                  vessels={vessels}
                  onDrawZone={() => setIsDrawingZone(!isDrawingZone)}
                  isDrawingZone={isDrawingZone}
                  onPassthroughVessels={handlePassthroughVessels}
                  missionBoundingBoxes={missionBoundingBoxes}
                  missionMMSIs={missionMMSIs}
                  streamStatus={streamStatus}
                  streamEnabled={streamEnabled}
                  onToggleStream={setStreamEnabled}
                  streamSourceId={streamSourceId}
                  onSelectSource={setStreamSourceId}
                  streamLiveCount={streamLiveCount}
                  onClearLive={handleClearAll}
                />
              )}
              {panelTab === "display" && (
                <DisplaySettingsPanel
                  tileLayer={tileLayer}
                  setTileLayer={setTileLayer}
                  showTrails={showTrails}
                  setShowTrails={setShowTrails}
                  showLabels={showLabels}
                  setShowLabels={setShowLabels}
                  weatherState={weatherState}
                  onWeatherChange={setWeatherState}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Map Area ─── */}
      <div className="flex-1 relative">
        <VesselMap
          vessels={vessels}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedVessel}
          tileLayer={tileLayer}
          showTrails={showTrails}
          showLabels={showLabels}
          weatherSources={weatherState.sources}
          weatherOpacity={weatherState.globalOpacity}
          rainViewerPaths={rainViewerPaths}
          watchZones={mission.watchZones}
          watchlist={mission.watchlist}
          anomalies={mission.anomalies}
          hotspots={mission.hotspots}
          showZones={mission.showZones}
          showWatchlistHighlights={mission.showWatchlistHighlights}
          showHeatmap={mission.showHeatmap}
          isDrawingZone={isDrawingZone}
          onZoneDrawn={handleZoneDrawn}
        />

        {/* Panel toggle (when closed) */}
        {!panelOpen && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-3 left-3 z-20 h-8 w-8 p-0 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300"
            onClick={() => setPanelOpen(true)}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Selected vessel detail */}
        {selectedVessel && (
          <VesselDetailCard vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
        )}
      </div>
    </div>
  )
}
