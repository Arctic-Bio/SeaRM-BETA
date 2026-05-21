"use client"

import { useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { VesselPosition } from "@/lib/map/types"
import { categorizeShipType, SHIP_TYPE_CATEGORIES, NAV_STATUS_LABELS } from "@/lib/map/types"
import { getWeatherProvider, type WeatherSource, type WeatherLayerDef, type RainViewerPaths } from "@/lib/map/weather-config"

// ─── Tile layer presets ───
const TILE_LAYERS: Record<string, { url: string; attribution: string; label: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: "Dark Ocean",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    label: "Satellite",
  },
  nautical: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: "Nautical",
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: "Light",
  },
}

// ─── Max markers rendered at any one time (viewport-limited) ───
const MAX_VIEWPORT_MARKERS = 800

interface VesselMapProps {
  vessels: VesselPosition[]
  selectedVessel: VesselPosition | null
  onSelectVessel: (v: VesselPosition | null) => void
  tileLayer: string
  showTrails: boolean
  showLabels: boolean
  weatherSources?: WeatherSource[]
  weatherOpacity?: number
  rainViewerPaths?: RainViewerPaths
}

function vesselKey(v: VesselPosition) {
  return v.mmsi || `pos-${v.id}`
}

function createVesselIcon(vessel: VesselPosition, isSelected: boolean): L.DivIcon {
  const category = categorizeShipType(vessel.ship_type)
  const meta = SHIP_TYPE_CATEGORIES[category] || SHIP_TYPE_CATEGORIES.unknown
  const color = meta.color
  const rotation = vessel.heading ?? vessel.course ?? 0
  const isMoving = (vessel.speed ?? 0) > 0.5
  const isInternal = vessel.extra && (vessel.extra as any).internal
  const isPassthrough = vessel.extra && (vessel.extra as any).passthrough

  const size = isSelected ? 28 : 20
  const borderWidth = isSelected ? 3 : 2
  const strokeColor = isInternal ? "#06b6d4" : isPassthrough ? "#22d3ee" : "#0f172a"
  const glow = isSelected ? `0 0 12px ${color}88, 0 0 24px ${color}44` : `0 0 6px ${color}44`

  return L.divIcon({
    className: "vessel-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `
      <div style="width:${size}px;height:${size}px;transform:rotate(${rotation}deg);transition:transform .3s ease;">
        <svg viewBox="0 0 24 24" width="${size}" height="${size}">
          <path d="M12 2 L4 20 L12 16 L20 20 Z" fill="${color}" stroke="${strokeColor}" stroke-width="${borderWidth}" filter="drop-shadow(0 1px 2px rgba(0,0,0,.5))"/>
          ${isMoving ? `<circle cx="12" cy="12" r="2" fill="white" opacity=".9"/>` : ""}
        </svg>
      </div>
      <div style="position:absolute;inset:-2px;border-radius:50%;box-shadow:${glow};pointer-events:none;"></div>
    `,
  })
}

function buildPopup(v: VesselPosition): string {
  const cat = categorizeShipType(v.ship_type)
  const catMeta = SHIP_TYPE_CATEGORIES[cat] || SHIP_TYPE_CATEGORIES.unknown
  const navLabel = NAV_STATUS_LABELS[v.nav_status || ""] || v.nav_status || "Unknown"
  return `
    <div style="font-family:system-ui;min-width:200px;font-size:12px;line-height:1.5">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#e2e8f0">${v.vessel_name || "Unknown Vessel"}</div>
      <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap">
        <span style="background:${catMeta.color}22;color:${catMeta.color};padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${catMeta.label}</span>
        ${v.flag ? `<span style="background:#334155;padding:1px 6px;border-radius:4px;font-size:10px;color:#94a3b8">${v.flag}</span>` : ""}
        ${v.source_name ? `<span style="background:#1e293b;padding:1px 6px;border-radius:4px;font-size:9px;color:#64748b">${v.source_name}</span>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;color:#cbd5e1">
        ${v.mmsi ? `<tr><td style="padding:2px 0;color:#64748b">MMSI</td><td style="text-align:right;font-family:monospace">${v.mmsi}</td></tr>` : ""}
        ${v.imo ? `<tr><td style="padding:2px 0;color:#64748b">IMO</td><td style="text-align:right;font-family:monospace">${v.imo}</td></tr>` : ""}
        <tr><td style="padding:2px 0;color:#64748b">Status</td><td style="text-align:right">${navLabel}</td></tr>
        <tr><td style="padding:2px 0;color:#64748b">Speed</td><td style="text-align:right">${(v.speed ?? 0).toFixed(1)} kn</td></tr>
        <tr><td style="padding:2px 0;color:#64748b">Course</td><td style="text-align:right">${(v.course ?? 0).toFixed(0)}&deg;</td></tr>
        <tr><td style="padding:2px 0;color:#64748b">Position</td><td style="text-align:right;font-family:monospace;font-size:10px">${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}</td></tr>
        ${v.destination ? `<tr><td style="padding:2px 0;color:#64748b">Dest</td><td style="text-align:right">${v.destination}</td></tr>` : ""}
        ${v.callsign ? `<tr><td style="padding:2px 0;color:#64748b">Callsign</td><td style="text-align:right;font-family:monospace">${v.callsign}</td></tr>` : ""}
      </table>
      <div style="margin-top:6px;font-size:10px;color:#475569">${v.source_name || "Unknown source"}</div>
    </div>
  `
}

export default function VesselMap({ vessels, selectedVessel, onSelectVessel, tileLayer, showTrails, showLabels, weatherSources = [], weatherOpacity = 0.6, rainViewerPaths }: VesselMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const tileRef = useRef<L.TileLayer | null>(null)
  const labelsRef = useRef<Map<string, L.Tooltip>>(new Map())
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map())
  const prevPositions = useRef<Map<string, { lat: number; lng: number }[]>>(new Map())
  const vesselsRef = useRef<VesselPosition[]>([])
  const selectedRef = useRef<VesselPosition | null>(null)
  const showTrailsRef = useRef(showTrails)
  const showLabelsRef = useRef(showLabels)
  const rafId = useRef<number | null>(null)
  const onSelectRef = useRef(onSelectVessel)
  const weatherLayersRef = useRef<Map<string, L.TileLayer>>(new Map())

  // Keep refs in sync
  vesselsRef.current = vessels
  selectedRef.current = selectedVessel
  showTrailsRef.current = showTrails
  showLabelsRef.current = showLabels
  onSelectRef.current = onSelectVessel

  // ─── Core render function: only draw vessels visible in the current viewport ───
  const renderViewport = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    const allVessels = vesselsRef.current
    const selected = selectedRef.current

    // Filter vessels to those within viewport bounds
    let visible = allVessels.filter(v =>
      v.latitude >= bounds.getSouth() && v.latitude <= bounds.getNorth() &&
      v.longitude >= bounds.getWest() && v.longitude <= bounds.getEast()
    )

    // At low zoom levels with many vessels, prioritize: selected > internal > moving > rest
    if (visible.length > MAX_VIEWPORT_MARKERS) {
      const selectedKey = selected ? vesselKey(selected) : null
      const internal: VesselPosition[] = []
      const moving: VesselPosition[] = []
      const rest: VesselPosition[] = []

      for (const v of visible) {
        if (vesselKey(v) === selectedKey) continue // selected always included
        if (v.extra && (v.extra as any).internal) internal.push(v)
        else if ((v.speed ?? 0) > 0.5) moving.push(v)
        else rest.push(v)
      }

      const selectedVessels = selected && visible.some(v => vesselKey(v) === selectedKey)
        ? [visible.find(v => vesselKey(v) === selectedKey)!]
        : []

      visible = [
        ...selectedVessels,
        ...internal.slice(0, MAX_VIEWPORT_MARKERS),
        ...moving.slice(0, MAX_VIEWPORT_MARKERS - internal.length),
        ...rest.slice(0, Math.max(0, MAX_VIEWPORT_MARKERS - internal.length - moving.length)),
      ].slice(0, MAX_VIEWPORT_MARKERS)
    }

    const visibleKeys = new Set<string>()

    for (const v of visible) {
      const key = vesselKey(v)
      visibleKeys.add(key)
      const isSelected = selected?.mmsi === v.mmsi && v.mmsi != null
      const icon = createVesselIcon(v, isSelected)

      // Track trail positions
      if (showTrailsRef.current) {
        const trail = prevPositions.current.get(key) || []
        const lastPos = trail[trail.length - 1]
        if (!lastPos || lastPos.lat !== v.latitude || lastPos.lng !== v.longitude) {
          trail.push({ lat: v.latitude, lng: v.longitude })
          if (trail.length > 20) trail.shift()
          prevPositions.current.set(key, trail)
        }
      }

      const existing = markersRef.current.get(key)
      if (existing) {
        existing.setLatLng([v.latitude, v.longitude])
        existing.setIcon(icon)
      } else {
        const marker = L.marker([v.latitude, v.longitude], { icon, interactive: true })
        const currentV = v // capture in closure
        marker.on("click", () => onSelectRef.current(currentV))
        marker.bindPopup(buildPopup(v), { className: "vessel-popup", maxWidth: 280 })
        marker.addTo(map)
        markersRef.current.set(key, marker)
      }

      // Labels
      if (showLabelsRef.current && v.vessel_name) {
        if (!labelsRef.current.has(key)) {
          const marker = markersRef.current.get(key)
          if (marker) {
            const tooltip = L.tooltip({ permanent: true, direction: "right", offset: [12, 0], className: "vessel-label" })
            tooltip.setContent(v.vessel_name)
            marker.bindTooltip(tooltip)
            labelsRef.current.set(key, tooltip)
          }
        }
      } else if (labelsRef.current.has(key)) {
        const marker = markersRef.current.get(key)
        if (marker) marker.unbindTooltip()
        labelsRef.current.delete(key)
      }

      // Trails
      if (showTrailsRef.current) {
        const trail = prevPositions.current.get(key)
        if (trail && trail.length > 1) {
          const cat = categorizeShipType(v.ship_type)
          const color = SHIP_TYPE_CATEGORIES[cat]?.color || "#94a3b8"
          const existingTrail = trailsRef.current.get(key)
          if (existingTrail) {
            existingTrail.setLatLngs(trail.map(p => [p.lat, p.lng]))
          } else {
            const polyline = L.polyline(trail.map(p => [p.lat, p.lng] as L.LatLngExpression), {
              color, weight: 2, opacity: 0.4, dashArray: "6,4",
            }).addTo(map)
            trailsRef.current.set(key, polyline)
          }
        }
      }
    }

    // Remove markers outside viewport
    markersRef.current.forEach((marker, key) => {
      if (!visibleKeys.has(key)) {
        marker.remove()
        markersRef.current.delete(key)
        if (labelsRef.current.has(key)) { labelsRef.current.delete(key) }
        const trail = trailsRef.current.get(key)
        if (trail) { trail.remove(); trailsRef.current.delete(key) }
      }
    })

    // Remove all trails if disabled
    if (!showTrailsRef.current) {
      trailsRef.current.forEach(t => t.remove())
      trailsRef.current.clear()
    }
  }, [])

  // Debounced render via requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(renderViewport)
  }, [renderViewport])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [30, -20],
      zoom: 3,
      zoomControl: false,
      attributionControl: true,
      maxBounds: [[-90, -200], [90, 200]],
    })

    L.control.zoom({ position: "topright" }).addTo(map)

    const tl = TILE_LAYERS[tileLayer] || TILE_LAYERS.dark
    tileRef.current = L.tileLayer(tl.url, { attribution: tl.attribution, maxZoom: 18, noWrap: false }).addTo(map)

    // Re-render markers on pan/zoom
    map.on("moveend", scheduleRender)
    map.on("zoomend", scheduleRender)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update tile layer
  useEffect(() => {
    if (!mapRef.current) return
    const tl = TILE_LAYERS[tileLayer] || TILE_LAYERS.dark
    if (tileRef.current) tileRef.current.remove()
    tileRef.current = L.tileLayer(tl.url, { attribution: tl.attribution, maxZoom: 18, noWrap: false }).addTo(mapRef.current)
  }, [tileLayer])

  // Pan to selected vessel
  useEffect(() => {
    if (!mapRef.current || !selectedVessel) return
    mapRef.current.flyTo([selectedVessel.latitude, selectedVessel.longitude], Math.max(mapRef.current.getZoom(), 8), { duration: 1 })
  }, [selectedVessel])

  // Re-render when data, labels, or trails change
  useEffect(() => { scheduleRender() }, [vessels, selectedVessel, showTrails, showLabels, scheduleRender])

  // ─── Weather tile layers ───
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Build desired set of weather layers from all sources
    const desiredLayers = new Map<string, { url: string; opacity: number; zIndex: number }>()

    for (const src of weatherSources) {
      const provider = getWeatherProvider(src.providerId)
      if (!provider) continue

      const allLayers: WeatherLayerDef[] = [...provider.layers, ...(src.customLayers || [])]

      for (const layer of allLayers) {
        if (!src.enabledLayers.includes(layer.id)) continue
        if (!layer.tileUrl) continue // skip point-only layers

        let url = layer.tileUrl
        // Replace {apikey} with the configured key
        if (src.apiKey) url = url.replace(/\{apikey\}/g, src.apiKey)

        // Replace RainViewer radar path placeholder with actual API path
        if (url.includes("{rv_radar_path}")) {
          if (!rainViewerPaths?.radarPath) continue // skip until paths are loaded
          url = url.replace(/\{rv_radar_path\}/g, rainViewerPaths.radarPath)
        }

        desiredLayers.set(layer.id, { url, opacity: layer.opacity * weatherOpacity, zIndex: 400 })
      }
    }

    // Remove layers no longer desired
    weatherLayersRef.current.forEach((tileLayer, layerId) => {
      if (!desiredLayers.has(layerId)) {
        tileLayer.remove()
        weatherLayersRef.current.delete(layerId)
      }
    })

    // Add or update desired layers
    desiredLayers.forEach(({ url, opacity, zIndex }, layerId) => {
      const existing = weatherLayersRef.current.get(layerId)
      if (existing) {
        existing.setOpacity(opacity)
        existing.setZIndex(zIndex)
        // If URL changed (e.g. new RainViewer frame), remove old and add fresh
        const currentUrl = (existing as any)._url as string | undefined
        if (currentUrl !== url) {
          existing.remove()
          const fresh = L.tileLayer(url, { opacity, maxZoom: 18, zIndex, attribution: "" })
          fresh.addTo(map)
          weatherLayersRef.current.set(layerId, fresh)
        }
      } else {
        const newLayer = L.tileLayer(url, { opacity, maxZoom: 18, zIndex, attribution: "" })
        newLayer.addTo(map)
        weatherLayersRef.current.set(layerId, newLayer)
      }
    })
  }, [weatherSources, weatherOpacity, rainViewerPaths])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <style jsx global>{`
        .vessel-marker { background: none !important; border: none !important; }
        .vessel-popup .leaflet-popup-content-wrapper {
          background: #1e293b !important; color: #e2e8f0 !important;
          border: 1px solid #334155 !important; border-radius: 8px !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
        }
        .vessel-popup .leaflet-popup-tip { background: #1e293b !important; border-color: #334155 !important; }
        .vessel-label {
          background: #0f172aCC !important; color: #e2e8f0 !important;
          border: 1px solid #334155 !important; border-radius: 4px !important;
          padding: 1px 6px !important; font-size: 10px !important;
          font-weight: 600 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
        }
        .vessel-label::before { border-right-color: #334155 !important; }
        .leaflet-control-zoom a {
          background: #1e293b !important; color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover { background: #334155 !important; }
        .leaflet-control-attribution { background: #0f172aCC !important; color: #64748b !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: #94a3b8 !important; }
      `}</style>
    </>
  )
}

export { TILE_LAYERS }
