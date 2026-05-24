import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import WebSocket from "ws"
import { parseSourceResponse } from "@/lib/map/source-parsers"
import type { TrackingSource, ParsedVessel } from "@/lib/map/types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Direct Vessel Lookup API
 *
 * Each source type uses its **native identifier filter** so we only request
 * the single vessel we need -- never fetches all ships then filters.
 *
 * - VesselFinder:   ?mmsi=X  or  ?imo=X   (REST query param)
 * - MarineTraffic:  /mmsi:X  or  /imo:X   (REST path param, PS07 single-vessel)
 * - AISHub:         ?mmsi=X  or  ?imo=X   (REST query param)
 * - AISstream:      FiltersShipMMSI=[X]    (WebSocket subscription filter -- MMSI only)
 * - Internal Fleet: WHERE mmsi = X         (SQL)
 * - Database:       WHERE mmsi = X         (SQL on vessel_positions)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") as "mmsi" | "imo" | null
    const identifier = searchParams.get("identifier")?.trim()

    if (!type || !identifier || (type !== "mmsi" && type !== "imo")) {
      return NextResponse.json(
        { error: "type (mmsi|imo) and identifier are required" },
        { status: 400 }
      )
    }

    const sources = (await sql`SELECT * FROM vessel_tracking_sources WHERE is_active = true`) as unknown as TrackingSource[]

    // ─── 1. Check our DB first (instant) ───
    const dbRow = type === "mmsi"
      ? await sql`
          SELECT vp.*, vts.name as source_name, vts.source_type
          FROM vessel_positions vp
          JOIN vessel_tracking_sources vts ON vp.source_id = vts.id
          WHERE vp.mmsi = ${identifier}
          ORDER BY vp.received_at DESC LIMIT 1`
      : await sql`
          SELECT vp.*, vts.name as source_name, vts.source_type
          FROM vessel_positions vp
          JOIN vessel_tracking_sources vts ON vp.source_id = vts.id
          WHERE vp.imo = ${identifier}
          ORDER BY vp.received_at DESC LIMIT 1`

    const results: LookupResult[] = []

    if (dbRow.length > 0) {
      const d = dbRow[0] as any
      results.push({
        source: `Database (${d.source_name})`,
        source_type: "database",
        vessel: rowToVessel(d),
      })
    }

    // ─── 2. Query each active source with its native filter ───
    const promises = sources.map(s => lookupSource(s, type, identifier))
    await Promise.race([
      Promise.allSettled(promises),
      new Promise(r => setTimeout(r, 18000)), // 18s global timeout
    ])

    for (const p of promises) {
      try {
        const r = await p
        if (r) results.push(r)
      } catch { /* skip */ }
    }

    // Sort: most-recent position first
    results
      .filter(r => r.vessel)
      .sort((a, b) => {
        const ta = a.vessel?.position_timestamp ? new Date(a.vessel.position_timestamp).getTime() : 0
        const tb = b.vessel?.position_timestamp ? new Date(b.vessel.position_timestamp).getTime() : 0
        return tb - ta
      })

    return NextResponse.json({
      query: { type, identifier },
      results: results.filter(r => r.vessel),
      all_results: results,
      total_sources_checked: sources.length + 1,
      found: results.some(r => r.vessel),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LookupResult {
  source: string
  source_type: string
  vessel: ParsedVessel | null
  error?: string
  method?: string // describes how the lookup was done
}

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

async function lookupSource(
  source: TrackingSource,
  type: "mmsi" | "imo",
  id: string
): Promise<LookupResult | null> {
  const cfg = (source.config || {}) as Record<string, any>

  switch (source.source_type) {
    case "vesselfinder":
      return lookupVesselFinder(source, cfg, type, id)
    case "marinetraffic":
      return lookupMarineTraffic(source, cfg, type, id)
    case "aishub":
      return lookupAISHub(source, cfg, type, id)
    case "aisstream":
      return type === "mmsi"
        ? lookupAISStream(source, cfg, id)
        : { source: source.name, source_type: "aisstream", vessel: null, method: "skipped (AISstream has no IMO filter)" }
    case "internal_fleet":
      return lookupInternalFleet(source, type, id)
    default:
      return null
  }
}

// ─────────────────────────────────────────────
// VesselFinder  --  native ?mmsi=X / ?imo=X
// ─────────────────────────────────────────────

async function lookupVesselFinder(
  source: TrackingSource,
  cfg: Record<string, any>,
  type: "mmsi" | "imo",
  id: string
): Promise<LookupResult> {
  const apiKey = cfg.api_key || source.api_key
  if (!apiKey)
    return { source: source.name, source_type: "vesselfinder", vessel: null, error: "no API key" }

  const base = cfg.api_url || "https://api.vesselfinder.com/vessels"
  // VesselFinder REST API: ?userkey=KEY&mmsi=MMSI  or  ?userkey=KEY&imo=IMO
  const url = `${base}?userkey=${apiKey}&${type}=${id}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok)
      return { source: source.name, source_type: "vesselfinder", vessel: null, error: `HTTP ${res.status}`, method: `GET ?${type}=${id}` }

    const data = await res.json()
    const vessels = parseSourceResponse(source, data)
    return {
      source: source.name,
      source_type: "vesselfinder",
      vessel: vessels[0] ?? null,
      method: `GET ?${type}=${id}`,
    }
  } catch (e: any) {
    return { source: source.name, source_type: "vesselfinder", vessel: null, error: e.message }
  }
}

// ─────────────────────────────────────────────
// MarineTraffic  --  PS07 single-vessel endpoint
//   /exportvessel/v:5/KEY/mmsi:MMSI/protocol:jsono
//   /exportvessel/v:5/KEY/imo:IMO/protocol:jsono
// ─────────────────────────────────────────────

async function lookupMarineTraffic(
  source: TrackingSource,
  cfg: Record<string, any>,
  type: "mmsi" | "imo",
  id: string
): Promise<LookupResult> {
  const apiKey = cfg.api_key || source.api_key
  if (!apiKey)
    return { source: source.name, source_type: "marinetraffic", vessel: null, error: "no API key" }

  // Use PS07 single-vessel endpoint, NOT the PS01 area endpoint
  const base = "https://services.marinetraffic.com/api/exportvessel/v:5"
  const url = `${base}/${apiKey}/${type}:${id}/protocol:jsono`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok)
      return { source: source.name, source_type: "marinetraffic", vessel: null, error: `HTTP ${res.status}`, method: `PS07 /${type}:${id}` }

    const data = await res.json()
    const vessels = parseSourceResponse(source, data)
    return {
      source: source.name,
      source_type: "marinetraffic",
      vessel: vessels[0] ?? null,
      method: `PS07 /${type}:${id}`,
    }
  } catch (e: any) {
    return { source: source.name, source_type: "marinetraffic", vessel: null, error: e.message }
  }
}

// ─────────────────────────────────────────────
// AISHub  --  native ?mmsi=X / ?imo=X
// ─────────────────────────────────────────────

async function lookupAISHub(
  source: TrackingSource,
  cfg: Record<string, any>,
  type: "mmsi" | "imo",
  id: string
): Promise<LookupResult> {
  const username = cfg.username
  if (!username)
    return { source: source.name, source_type: "aishub", vessel: null, error: "no username" }

  const base = cfg.api_url || "https://data.aishub.net/ws.php"
  const params = new URLSearchParams({
    username,
    format: cfg.format || "1",
    output: "json",
    [type]: id,          // native MMSI / IMO filter
  })

  try {
    const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok)
      return { source: source.name, source_type: "aishub", vessel: null, error: `HTTP ${res.status}`, method: `GET ?${type}=${id}` }

    const data = await res.json()
    const raw = Array.isArray(data) && data.length === 2 ? data[1] : data
    const vessels = parseSourceResponse(source, raw)
    return {
      source: source.name,
      source_type: "aishub",
      vessel: vessels[0] ?? null,
      method: `GET ?${type}=${id}`,
    }
  } catch (e: any) {
    return { source: source.name, source_type: "aishub", vessel: null, error: e.message }
  }
}

// ─────────────────────────────────────────────
// AISstream  --  FiltersShipMMSI subscription
//
// Uses the source's own configured bounding boxes (the zones the user
// already set up) so we never send a world-wide bounding box.
// The FiltersShipMMSI param tells AISstream to only relay messages
// from this one vessel -- the server-side filter, not client-side.
// ─────────────────────────────────────────────

async function lookupAISStream(
  source: TrackingSource,
  cfg: Record<string, any>,
  mmsi: string
): Promise<LookupResult> {
  const apiKey = cfg.api_key || source.api_key
  if (!apiKey)
    return { source: source.name, source_type: "aisstream", vessel: null, error: "no API key" }

  // Use the source's configured bounding boxes -- never world-wide
  let bboxes: number[][][] = []
  try {
    const parsed = JSON.parse(cfg.bounding_boxes || "null")
    if (Array.isArray(parsed) && parsed.length > 0) bboxes = parsed
  } catch { /* ignore */ }

  // If the source has no bounding boxes configured, we cannot do a lookup
  // (AISstream requires at least one bounding box)
  if (bboxes.length === 0) {
    return {
      source: source.name,
      source_type: "aisstream",
      vessel: null,
      method: "skipped (no bounding boxes configured on this source)",
    }
  }

  const collectSeconds = Math.min(Math.max(Number(cfg.collect_seconds) || 10, 5), 20)

  try {
    const messages = await new Promise<any[]>((resolve, reject) => {
      const msgs: any[] = []
      let done = false
      const finish = () => {
        if (done) return
        done = true
        try { ws.close() } catch {}
        clearTimeout(safety)
        resolve(msgs)
      }

      const ws = new WebSocket(
        cfg.ws_url || "wss://stream.aisstream.io/v0/stream",
        { rejectUnauthorized: false }
      )

      const safety = setTimeout(finish, (collectSeconds + 5) * 1000)

      ws.on("open", () => {
        // ── The key: FiltersShipMMSI is the SERVER-SIDE filter ──
        // AISstream only sends us messages for this one MMSI.
        // We are NOT downloading all ships -- only this one vessel.
        ws.send(JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: bboxes,
          FiltersShipMMSI: [mmsi],
          FilterMessageTypes: [
            "PositionReport",
            "StandardClassBPositionReport",
            "ExtendedClassBPositionReport",
            "ShipStaticData",
          ],
        }))
        setTimeout(finish, collectSeconds * 1000)
      })

      ws.on("message", (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.error) { finish(); reject(new Error(msg.error)); return }
          if (msg.MessageType && (msg.MetaData || msg.Metadata)) {
            msg.MetaData = msg.MetaData || msg.Metadata
            msgs.push(msg)
          }
        } catch {}
      })

      ws.on("error", (err: Error) => { if (!done) { done = true; reject(err) } })
      ws.on("close", () => finish())
    })

    if (messages.length === 0)
      return {
        source: source.name,
        source_type: "aisstream",
        vessel: null,
        method: `WebSocket FiltersShipMMSI=[${mmsi}], ${bboxes.length} bbox(es), ${collectSeconds}s -- no messages received (vessel may be outside configured zones or not transmitting)`,
      }

    const vessels = parseSourceResponse(source, messages)
    return {
      source: source.name,
      source_type: "aisstream",
      vessel: vessels[0] ?? null,
      method: `WebSocket FiltersShipMMSI=[${mmsi}], ${messages.length} msgs in ${collectSeconds}s`,
    }
  } catch (e: any) {
    return { source: source.name, source_type: "aisstream", vessel: null, error: e.message }
  }
}

// ─────────────────────────────────────────────
// Internal Fleet  --  direct SQL
// ─────────────────────────────────────────────

async function lookupInternalFleet(
  source: TrackingSource,
  type: "mmsi" | "imo",
  id: string
): Promise<LookupResult> {
  try {
    const rows = type === "mmsi"
      ? await sql`SELECT * FROM ships WHERE mmsi = ${id} LIMIT 1`
      : await sql`SELECT * FROM ships WHERE imo_number = ${id} LIMIT 1`

    if (rows.length === 0)
      return { source: source.name, source_type: "internal_fleet", vessel: null, method: `SQL WHERE ${type} = ${id}` }

    const s = rows[0] as any
    return {
      source: source.name,
      source_type: "internal_fleet",
      method: `SQL WHERE ${type} = ${id}`,
      vessel: {
        mmsi: s.mmsi || "",
        imo: s.imo_number || undefined,
        vessel_name: s.name || undefined,
        ship_type: s.type || undefined,
        flag: s.flag || undefined,
        latitude: parseFloat(s.latitude || s.last_latitude || 0),
        longitude: parseFloat(s.longitude || s.last_longitude || 0),
        speed: parseFloat(s.speed || 0) || undefined,
        course: parseFloat(s.course || 0) || undefined,
        heading: parseFloat(s.heading || 0) || undefined,
        nav_status: s.status === "active" ? "0" : "5",
        destination: s.home_port || undefined,
      } as ParsedVessel,
    }
  } catch {
    return null
  }
}

// ─── Helpers ───

function rowToVessel(d: any): ParsedVessel {
  return {
    mmsi: d.mmsi || "",
    imo: d.imo || undefined,
    vessel_name: d.vessel_name || undefined,
    callsign: d.callsign || undefined,
    ship_type: d.ship_type || undefined,
    flag: d.flag || undefined,
    latitude: parseFloat(d.latitude),
    longitude: parseFloat(d.longitude),
    course: d.course ? parseFloat(d.course) : undefined,
    speed: d.speed ? parseFloat(d.speed) : undefined,
    heading: d.heading ? parseFloat(d.heading) : undefined,
    nav_status: d.nav_status || undefined,
    destination: d.destination || undefined,
    eta: d.eta || undefined,
    draught: d.draught ? parseFloat(d.draught) : undefined,
    position_timestamp: d.received_at || undefined,
  }
}
