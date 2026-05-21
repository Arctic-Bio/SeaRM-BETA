import type { ParsedVessel, SourceType, TrackingSource } from "./types"

// ─── Parser registry ───
// Each source type has a parser that normalizes the raw API response
// into an array of ParsedVessel objects.

type Parser = (source: TrackingSource, rawData: any) => ParsedVessel[]

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj)
}

// AISHub returns: [{ MMSI, LONGITUDE, LATITUDE, SPEED, COURSE, HEADING, ... }]
const parseAISHub: Parser = (_source, raw) => {
  const arr = Array.isArray(raw) ? raw : raw?.data || raw?.result || []
  return arr.map((d: any) => ({
    mmsi: String(d.MMSI || d.mmsi || ""),
    imo: d.IMO ? String(d.IMO) : undefined,
    vessel_name: d.NAME || d.SHIPNAME || d.name || undefined,
    callsign: d.CALLSIGN || d.callsign || undefined,
    ship_type: d.TYPE_NAME || d.TYPENAME || d.type || undefined,
    flag: d.FLAG || d.flag || undefined,
    latitude: parseFloat(d.LATITUDE || d.latitude || d.lat || 0),
    longitude: parseFloat(d.LONGITUDE || d.longitude || d.lon || 0),
    course: parseFloat(d.COG || d.COURSE || d.course || 0) || undefined,
    speed: parseFloat(d.SOG || d.SPEED || d.speed || 0) || undefined,
    heading: parseFloat(d.HEADING || d.heading || 0) || undefined,
    nav_status: d.NAVSTAT != null ? String(d.NAVSTAT) : undefined,
    destination: d.DESTINATION || d.destination || undefined,
    eta: d.ETA || d.eta || undefined,
    draught: parseFloat(d.DRAUGHT || d.draught || 0) || undefined,
    dimension_a: parseInt(d.A) || undefined,
    dimension_b: parseInt(d.B) || undefined,
    dimension_c: parseInt(d.C) || undefined,
    dimension_d: parseInt(d.D) || undefined,
    position_timestamp: d.TIME || d.TIMESTAMP || d.timestamp || undefined,
  })).filter((v: ParsedVessel) => v.latitude && v.longitude)
}

// MarineTraffic returns: [{ MMSI, LAT, LON, SPEED, COURSE, STATUS, SHIPNAME, ... }]
const parseMarineTraffic: Parser = (_source, raw) => {
  const arr = Array.isArray(raw) ? raw : raw?.data || []
  return arr.map((d: any) => ({
    mmsi: String(d.MMSI || ""),
    imo: d.IMO ? String(d.IMO) : undefined,
    vessel_name: d.SHIPNAME || d.SHIP_NAME || undefined,
    callsign: d.CALLSIGN || undefined,
    ship_type: d.SHIPTYPE || d.TYPE_NAME || undefined,
    flag: d.FLAG || undefined,
    latitude: parseFloat(d.LAT || 0),
    longitude: parseFloat(d.LON || 0),
    course: parseFloat(d.COURSE || 0) || undefined,
    speed: parseFloat(d.SPEED || 0) || undefined,
    heading: parseFloat(d.HEADING || 0) || undefined,
    nav_status: d.STATUS != null ? String(d.STATUS) : undefined,
    destination: d.DESTINATION || undefined,
    eta: d.ETA || d.ETA_CALC || undefined,
    draught: parseFloat(d.DRAUGHT || 0) || undefined,
    position_timestamp: d.TIMESTAMP || d.LAST_POS || undefined,
  })).filter((v: ParsedVessel) => v.latitude && v.longitude)
}

// VesselFinder returns: { AIS: [{ MMSI, LATITUDE, LONGITUDE, ... }] }
const parseVesselFinder: Parser = (_source, raw) => {
  const arr = raw?.AIS || raw?.data || (Array.isArray(raw) ? raw : [])
  return arr.map((d: any) => ({
    mmsi: String(d.MMSI || ""),
    imo: d.IMO ? String(d.IMO) : undefined,
    vessel_name: d.NAME || d.SHIPNAME || undefined,
    callsign: d.CALLSIGN || undefined,
    ship_type: d.TYPE || undefined,
    flag: d.FLAG || undefined,
    latitude: parseFloat(d.LATITUDE || d.A_LATITUDE || 0),
    longitude: parseFloat(d.LONGITUDE || d.A_LONGITUDE || 0),
    course: parseFloat(d.COURSE || d.COG || 0) || undefined,
    speed: parseFloat(d.SPEED || d.SOG || 0) || undefined,
    heading: parseFloat(d.HEADING || 0) || undefined,
    nav_status: d.NAVSTAT != null ? String(d.NAVSTAT) : undefined,
    destination: d.DESTINATION || undefined,
    eta: d.ETA || undefined,
    draught: parseFloat(d.DRAUGHT || 0) || undefined,
    position_timestamp: d.TIMESTAMP || undefined,
  })).filter((v: ParsedVessel) => v.latitude && v.longitude)
}

// AIS Stream WebSocket messages -- normalized from the batch collected by /api/map/aisstream.
// Each raw message follows the aisstream.io documented format:
// {
//   MessageType: "PositionReport" | "ShipStaticData" | "StandardClassBPositionReport" | ...,
//   MetaData: { MMSI, ShipName, latitude, longitude, time_utc },
//   Message: { [MessageType]: { UserID, Latitude, Longitude, Cog, Sog, TrueHeading, NavigationalStatus, ... } }
// }
const parseAISStream: Parser = (_source, raw) => {
  const arr = Array.isArray(raw) ? raw : raw?.messages || raw?.data || []
  const vesselMap = new Map<string, ParsedVessel>()

  for (const msg of arr) {
    const msgType = msg.MessageType || ""
    const meta = msg.MetaData || {}
    const body = msg.Message?.[msgType] || {}

    const mmsi = String(meta.MMSI || body.UserID || "")
    if (!mmsi) continue

    // Extract position -- priority: body fields > meta fields
    const lat = body.Latitude ?? meta.latitude ?? null
    const lon = body.Longitude ?? meta.longitude ?? null

    // For non-position message types (like ShipStaticData), use metadata lat/lon
    const latitude = lat != null ? parseFloat(lat) : (meta.latitude != null ? parseFloat(meta.latitude) : 0)
    const longitude = lon != null ? parseFloat(lon) : (meta.longitude != null ? parseFloat(meta.longitude) : 0)
    if (!latitude && !longitude) continue

    // Build vessel data -- merge with existing if we have multiple messages for same MMSI
    const existing = vesselMap.get(mmsi)

    // Extract ship static data if this is a ShipStaticData message
    const shipName = meta.ShipName?.trim() || body.Name?.trim() || existing?.vessel_name || undefined
    const shipType = body.Type != null ? String(body.Type) : (body.ShipType != null ? String(body.ShipType) : existing?.ship_type)
    const callsign = body.CallSign?.trim() || existing?.callsign || undefined
    const destination = body.Destination?.trim() || existing?.destination || undefined
    const eta = body.Eta || existing?.eta || undefined
    const imo = body.ImoNumber ? String(body.ImoNumber) : existing?.imo || undefined
    const draught = body.MaximumStaticDraught != null ? parseFloat(body.MaximumStaticDraught) / 10 : existing?.draught

    // Extract dimensions from ShipStaticData
    const dimA = body.Dimension?.A ?? existing?.dimension_a
    const dimB = body.Dimension?.B ?? existing?.dimension_b
    const dimC = body.Dimension?.C ?? existing?.dimension_c
    const dimD = body.Dimension?.D ?? existing?.dimension_d

    const vessel: ParsedVessel = {
      mmsi,
      imo,
      vessel_name: shipName,
      callsign,
      ship_type: shipType,
      flag: existing?.flag || undefined,
      latitude,
      longitude,
      course: body.Cog != null ? parseFloat(body.Cog) : existing?.course,
      speed: body.Sog != null ? parseFloat(body.Sog) : existing?.speed,
      heading: body.TrueHeading != null ? parseFloat(body.TrueHeading) : existing?.heading,
      nav_status: body.NavigationalStatus != null ? String(body.NavigationalStatus) : existing?.nav_status,
      destination,
      eta,
      draught,
      dimension_a: dimA != null ? parseInt(dimA) : undefined,
      dimension_b: dimB != null ? parseInt(dimB) : undefined,
      dimension_c: dimC != null ? parseInt(dimC) : undefined,
      dimension_d: dimD != null ? parseInt(dimD) : undefined,
      position_timestamp: meta.time_utc || undefined,
      extra: { ais_message_type: msgType },
    }

    vesselMap.set(mmsi, vessel)
  }

  return Array.from(vesselMap.values()).filter(v => v.latitude && v.longitude)
}

// Custom API with user-defined field mapping
const parseCustomAPI: Parser = (source, raw) => {
  const config = source.config || {}
  const dataPath = config.data_path || ""
  let fieldMap: Record<string, string> = {}
  try { fieldMap = typeof config.field_map === "string" ? JSON.parse(config.field_map) : (config.field_map || {}) } catch { /* */ }

  const data = dataPath ? getByPath(raw, dataPath) : raw
  const arr = Array.isArray(data) ? data : []

  return arr.map((d: any) => ({
    mmsi: String(d[fieldMap.mmsi || "mmsi"] || ""),
    imo: d[fieldMap.imo || "imo"] ? String(d[fieldMap.imo || "imo"]) : undefined,
    vessel_name: d[fieldMap.name || "name"] || d[fieldMap.vessel_name || "vessel_name"] || undefined,
    callsign: d[fieldMap.callsign || "callsign"] || undefined,
    ship_type: d[fieldMap.ship_type || "ship_type"] || d[fieldMap.type || "type"] || undefined,
    flag: d[fieldMap.flag || "flag"] || undefined,
    latitude: parseFloat(d[fieldMap.lat || "lat"] || d[fieldMap.latitude || "latitude"] || 0),
    longitude: parseFloat(d[fieldMap.lon || "lon"] || d[fieldMap.longitude || "longitude"] || 0),
    course: parseFloat(d[fieldMap.course || "course"] || d[fieldMap.cog || "cog"] || 0) || undefined,
    speed: parseFloat(d[fieldMap.speed || "speed"] || d[fieldMap.sog || "sog"] || 0) || undefined,
    heading: parseFloat(d[fieldMap.heading || "heading"] || 0) || undefined,
    nav_status: d[fieldMap.nav_status || "nav_status"] || d[fieldMap.status || "status"] || undefined,
    destination: d[fieldMap.destination || "destination"] || undefined,
    position_timestamp: d[fieldMap.timestamp || "timestamp"] || d[fieldMap.time || "time"] || undefined,
  })).filter((v: ParsedVessel) => v.latitude && v.longitude)
}

// Internal fleet: reads from the ships API
const parseInternalFleet: Parser = (_source, raw) => {
  const arr = Array.isArray(raw) ? raw : raw?.data || []
  return arr.map((ship: any) => ({
    mmsi: ship.mmsi || undefined,
    imo: ship.imo_number || undefined,
    vessel_name: ship.name || undefined,
    ship_type: ship.type || undefined,
    flag: ship.flag || undefined,
    latitude: parseFloat(ship.latitude || ship.last_latitude || 0),
    longitude: parseFloat(ship.longitude || ship.last_longitude || 0),
    speed: parseFloat(ship.speed || 0) || undefined,
    course: parseFloat(ship.course || 0) || undefined,
    heading: parseFloat(ship.heading || 0) || undefined,
    nav_status: ship.status === "active" ? "0" : "5",
    destination: ship.home_port || undefined,
    extra: { internal: true, ship_id: ship.id },
  })).filter((v: ParsedVessel) => v.latitude && v.longitude)
}

// Parser registry
const parsers: Record<SourceType, Parser> = {
  aishub: parseAISHub,
  marinetraffic: parseMarineTraffic,
  vesselfinder: parseVesselFinder,
  aisstream: parseAISStream,
  custom_api: parseCustomAPI,
  internal_fleet: parseInternalFleet,
}

export function parseSourceResponse(source: TrackingSource, rawData: any): ParsedVessel[] {
  const parser = parsers[source.source_type]
  if (!parser) return []
  try {
    return parser(source, rawData)
  } catch {
    return []
  }
}
