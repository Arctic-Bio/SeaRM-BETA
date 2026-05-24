import type { SourceTypeInfo } from "./types"

// Complete source type registry with connection fields for each provider
export const SOURCE_TYPES: SourceTypeInfo[] = [
  {
    value: "aishub",
    label: "AISHub",
    description: "Free community AIS data sharing network. Provides global vessel positions via REST API. Requires a free account and contributing an AIS receiver.",
    color: "#22c55e",
    docs_url: "https://www.aishub.net/api",
    response_format: "JSON array of AIS messages",
    fields: [
      { key: "username", label: "AISHub Username", type: "text", required: true, placeholder: "Your AISHub username", description: "Your registered AISHub account username" },
      { key: "api_url", label: "API Endpoint", type: "url", required: true, placeholder: "https://data.aishub.net/ws.php", default: "https://data.aishub.net/ws.php", description: "AISHub data endpoint" },
      { key: "format", label: "Response Format", type: "select", default: "1", options: [{ value: "1", label: "JSON" }, { value: "0", label: "XML" }], description: "API response format" },
      { key: "lat_min", label: "Min Latitude", type: "number", placeholder: "-90", description: "Southern boundary of area filter" },
      { key: "lat_max", label: "Max Latitude", type: "number", placeholder: "90", description: "Northern boundary of area filter" },
      { key: "lon_min", label: "Min Longitude", type: "number", placeholder: "-180", description: "Western boundary of area filter" },
      { key: "lon_max", label: "Max Longitude", type: "number", placeholder: "180", description: "Eastern boundary of area filter" },
    ],
  },
  {
    value: "marinetraffic",
    label: "MarineTraffic",
    description: "Premium AIS intelligence platform. Provides detailed vessel data including photos, port calls, and historical tracks via REST API. Requires a paid API subscription.",
    color: "#0ea5e9",
    docs_url: "https://www.marinetraffic.com/en/ais-api-services",
    response_format: "JSON array of vessel objects",
    fields: [
      { key: "api_key", label: "API Key", type: "password", required: true, placeholder: "Your MarineTraffic API key" },
      { key: "api_url", label: "API Base URL", type: "url", required: true, placeholder: "https://services.marinetraffic.com/api/exportvessels/v:8", default: "https://services.marinetraffic.com/api/exportvessels/v:8", description: "PS01 (Vessel Positions) endpoint" },
      { key: "time_span", label: "Time Span (minutes)", type: "number", default: 60, description: "Return positions received in the last N minutes" },
      { key: "msg_type", label: "Message Type", type: "select", default: "simple", options: [{ value: "simple", label: "Simple" }, { value: "full", label: "Full" }, { value: "extended", label: "Extended" }], description: "Detail level of returned data" },
    ],
  },
  {
    value: "vesselfinder",
    label: "VesselFinder",
    description: "Global AIS tracking platform with satellite AIS coverage. REST API provides positions, voyage info, and vessel particulars. Requires API key.",
    color: "#f59e0b",
    docs_url: "https://api.vesselfinder.com/docs",
    response_format: "JSON with AIS array",
    fields: [
      { key: "api_key", label: "API Key", type: "password", required: true, placeholder: "Your VesselFinder API key" },
      { key: "api_url", label: "API URL", type: "url", required: true, placeholder: "https://api.vesselfinder.com/vessels", default: "https://api.vesselfinder.com/vessels", description: "VesselFinder vessels endpoint" },
      { key: "interval", label: "Update Interval", type: "select", default: "300", options: [{ value: "60", label: "1 min" }, { value: "300", label: "5 min" }, { value: "600", label: "10 min" }], description: "Minimum seconds between requests" },
    ],
  },
  {
    value: "aisstream",
    label: "AIS Stream (WebSocket)",
    description: "Real-time global AIS data via WebSocket from aisstream.io. Streams Class A (cargo/tanker) and Class B (fishing/pleasure/small craft) position reports plus static data. Free API key required.",
    color: "#8b5cf6",
    docs_url: "https://aisstream.io/documentation",
    response_format: "WebSocket JSON messages (MessageType + MetaData + Message)",
    fields: [
      { key: "api_key", label: "API Key", type: "password", required: true, placeholder: "Your aisstream.io API key", description: "Sign in at aisstream.io to generate a free API key" },
      { key: "ws_url", label: "WebSocket URL", type: "url", required: false, placeholder: "wss://stream.aisstream.io/v0/stream", default: "wss://stream.aisstream.io/v0/stream", description: "AIS Stream WebSocket endpoint (default is correct for most users)" },
      { key: "bounding_boxes", label: "Bounding Boxes (JSON)", type: "text", required: false, placeholder: "[[[25,-80],[45,-60]]]", description: "JSON array of bounding boxes: [[[lat_min,lon_min],[lat_max,lon_max]],...]. Leave blank if using mission watch zones. Do NOT use world-wide [[-90,-180],[90,180]] as it loads 17K+ vessels." },
      { key: "filter_mmsi", label: "MMSI Filter (optional)", type: "text", placeholder: "368207620,367719770", description: "Comma-separated MMSIs to track (max 50). Leave blank for all vessels in the bounding boxes." },
      { key: "filter_message_types", label: "Message Type Filter", type: "text", default: "PositionReport,StandardClassBPositionReport,ExtendedClassBPositionReport,ShipStaticData", placeholder: "PositionReport,StandardClassBPositionReport,ShipStaticData", description: "Comma-separated AIS types. Class A = PositionReport, Class B (fishing/small) = StandardClassBPositionReport + ExtendedClassBPositionReport, Static = ShipStaticData + StaticDataReport." },
      { key: "collect_seconds", label: "Collection Window (seconds)", type: "number", default: 8, placeholder: "8", description: "How many seconds to keep the WebSocket open per fetch cycle (3-30). Shorter = faster but fewer vessels." },
    ],
  },
  {
    value: "custom_api",
    label: "Custom REST API",
    description: "Connect any REST API that returns vessel position data. Configure the endpoint, auth headers, and field mappings to normalize the response into SeaRM's vessel format.",
    color: "#ec4899",
    response_format: "User-defined JSON",
    fields: [
      { key: "api_url", label: "API URL", type: "url", required: true, placeholder: "https://your-api.com/vessels" },
      { key: "api_key", label: "Auth Token / API Key", type: "password", placeholder: "Bearer token or API key" },
      { key: "auth_header", label: "Auth Header Name", type: "text", default: "Authorization", placeholder: "Authorization", description: "HTTP header name for the auth token" },
      { key: "auth_prefix", label: "Auth Prefix", type: "text", default: "Bearer", placeholder: "Bearer", description: "Prefix before the key (e.g., Bearer, Token, ApiKey)" },
      { key: "data_path", label: "Data JSON Path", type: "text", default: "data", placeholder: "data.vessels", description: "Dot path to the vessel array in the JSON response (e.g. 'data', 'results.vessels')" },
      { key: "field_map", label: "Field Mapping (JSON)", type: "text", default: '{"lat":"latitude","lon":"longitude","name":"vessel_name","mmsi":"mmsi"}', description: "JSON object mapping your API fields to SeaRM fields: lat, lon, name, mmsi, imo, speed, course, heading, ship_type, flag" },
      { key: "method", label: "HTTP Method", type: "select", default: "GET", options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }] },
    ],
  },
  {
    value: "internal_fleet",
    label: "Internal Fleet",
    description: "Uses ships already registered in your SeaRM database. Assigns simulated or manually-entered positions to your own fleet vessels for tracking alongside external AIS data.",
    color: "#06b6d4",
    response_format: "SeaRM ships table",
    fields: [
      { key: "default_status", label: "Default Nav Status", type: "select", default: "5", options: [{ value: "0", label: "Under way" }, { value: "1", label: "At anchor" }, { value: "5", label: "Moored" }, { value: "8", label: "Sailing" }], description: "Default AIS nav status for fleet vessels" },
    ],
  },
]

export function getSourceTypeInfo(type: string) {
  return SOURCE_TYPES.find(s => s.value === type)
}
