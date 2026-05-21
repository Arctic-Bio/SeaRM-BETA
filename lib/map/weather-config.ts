// ─── Weather Provider & Layer Registry ───
// Each provider can have multiple layers (wind, temp, waves, etc.)
// Some providers are free (open), others require API keys.

export interface WeatherLayerDef {
  id: string
  label: string
  description: string
  unit: string
  /** Tile URL template. Use {apikey}, {z}, {x}, {y}, {time} as placeholders */
  tileUrl: string
  /** Some layers use a different tile URL for the legend */
  legendUrl?: string
  opacity: number
  minZoom?: number
  maxZoom?: number
}

export interface WeatherProviderDef {
  id: string
  label: string
  description: string
  color: string
  requiresKey: boolean
  keyPlaceholder?: string
  keyDescription?: string
  signupUrl?: string
  layers: WeatherLayerDef[]
}

// ─── Built-in Providers ───

export const WEATHER_PROVIDERS: WeatherProviderDef[] = [
  {
    id: "rainviewer",
    label: "RainViewer",
    description: "Free global precipitation radar with near-real-time data. No API key required. Updated every 10 minutes.",
    color: "#22c55e",
    requiresKey: false,
    signupUrl: "https://www.rainviewer.com/api.html",
    layers: [
      { id: "rv_radar", label: "Precipitation Radar", description: "Global radar mosaic -- near-realtime precipitation", unit: "dBZ", tileUrl: "https://tilecache.rainviewer.com{rv_radar_path}/256/{z}/{x}/{y}/2/1_1.png", opacity: 0.7 },
    ],
  },
  {
    id: "openweathermap",
    label: "OpenWeatherMap",
    description: "Global weather tile layers including precipitation, clouds, wind, temperature, and pressure. Free tier: 1000 calls/day.",
    color: "#f97316",
    requiresKey: true,
    keyPlaceholder: "Your OpenWeatherMap API key",
    keyDescription: "Get a free key at openweathermap.org/api. The free tier supports weather map layers.",
    signupUrl: "https://openweathermap.org/api",
    layers: [
      { id: "owm_precipitation", label: "Precipitation", description: "Rain and snow intensity", unit: "mm/h", tileUrl: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid={apikey}", opacity: 0.6 },
      { id: "owm_clouds", label: "Cloud Cover", description: "Cloud density percentage", unit: "%", tileUrl: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid={apikey}", opacity: 0.5 },
      { id: "owm_wind", label: "Wind Speed", description: "Surface wind speed", unit: "m/s", tileUrl: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid={apikey}", opacity: 0.6 },
      { id: "owm_temp", label: "Temperature", description: "Surface air temperature", unit: "°C", tileUrl: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid={apikey}", opacity: 0.5 },
      { id: "owm_pressure", label: "Sea Level Pressure", description: "Atmospheric pressure at sea level", unit: "hPa", tileUrl: "https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid={apikey}", opacity: 0.4 },
    ],
  },
  {
    id: "gebco",
    label: "Ocean Depth (GEBCO/NCEI)",
    description: "Global ocean bathymetry and seafloor topography via ESRI GEBCO/NCEI basemap. Free, no API key required.",
    color: "#0ea5e9",
    requiresKey: false,
    signupUrl: "https://www.gebco.net/",
    layers: [
      { id: "gebco_bathymetry", label: "Ocean Depth", description: "Bathymetric basemap showing seafloor depth, trenches, ridges, and continental shelves", unit: "meters", tileUrl: "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/{z}/{y}/{x}", opacity: 0.6 },
    ],
  },
  {
    id: "noaa",
    label: "NOAA / Iowa State Radar",
    description: "Real-time NEXRAD radar from Iowa State Mesonet (IEM). Free, no API key, updated every 5 minutes. US-focused.",
    color: "#7c3aed",
    requiresKey: false,
    signupUrl: "https://mesonet.agron.iastate.edu/",
    layers: [
      { id: "noaa_nexrad", label: "NEXRAD Radar (N0Q)", description: "NEXRAD Level III base reflectivity composite -- real-time US precipitation", unit: "dBZ", tileUrl: "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png", opacity: 0.7 },
    ],
  },
  {
    id: "custom_weather",
    label: "Custom Weather API",
    description: "Bring your own weather tile server. Provide a tile URL template with {z}/{x}/{y} placeholders and optionally {apikey}.",
    color: "#a855f7",
    requiresKey: false,
    keyPlaceholder: "Optional API key for your tile server",
    layers: [],
  },
]

// ─── Stored weather source (user-configured with keys) ───
export interface WeatherSource {
  providerId: string
  apiKey?: string
  enabledLayers: string[]
  /** For custom providers, user-defined layers */
  customLayers?: WeatherLayerDef[]
}

export function getWeatherProvider(id: string) {
  return WEATHER_PROVIDERS.find(p => p.id === id)
}

// ─── RainViewer path helper ───
// RainViewer v2 API returns hash-based paths, not just timestamps.
// The response has { radar: { past: [{ time, path }] } }
// We need the `path` field (e.g. "/v2/radar/06c7c840529d") to construct tile URLs.
export interface RainViewerPaths {
  radarPath: string | null
}

export async function fetchRainViewerPaths(): Promise<RainViewerPaths> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json")
    if (!res.ok) return { radarPath: null }
    const data = await res.json()
    const radarFrames = data?.radar?.past || []
    // Use the most recent frame's path
    const radarPath = radarFrames.length > 0 ? radarFrames[radarFrames.length - 1].path : null
    return { radarPath }
  } catch {
    return { radarPath: null }
  }
}
