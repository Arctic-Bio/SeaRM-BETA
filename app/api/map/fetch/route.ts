import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { parseSourceResponse } from "@/lib/map/source-parsers"
import type { TrackingSource } from "@/lib/map/types"

const sql = neon(process.env.DATABASE_URL!)

// POST: Fetch vessel data from a configured source.
// External sources (AIS, MarineTraffic, etc.) NEVER save to the database --
// they always return parsed vessels in the response body for client-side display.
// Only "internal_fleet" sources write positions to the DB (our own ships).
export async function POST(req: Request) {
  try {
    const { source_id } = await req.json()
    if (!source_id) return NextResponse.json({ error: "source_id required" }, { status: 400 })

    const sources = await sql`SELECT * FROM vessel_tracking_sources WHERE id = ${source_id}`
    if (!sources.length) return NextResponse.json({ error: "Source not found" }, { status: 404 })
    const source = sources[0] as unknown as TrackingSource

    // Internal fleet: fetch from our own ships table & persist positions
    if (source.source_type === "internal_fleet") {
      return await fetchInternalFleet(source)
    }

    // AIS Stream: dedicated WebSocket consumer
    if (source.source_type === "aisstream") {
      return await fetchAISStream(source)
    }

    // All other external REST sources
    return await fetchExternalREST(source)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── External REST sources (AISHub, MarineTraffic, VesselFinder, Custom API) ───
// Returns parsed vessels WITHOUT saving to DB.
async function fetchExternalREST(source: TrackingSource) {
  const url = source.api_url || (source.config as any)?.api_url
  if (!url) {
    await sql`UPDATE vessel_tracking_sources SET last_error = 'No API URL configured', updated_at = NOW() WHERE id = ${source.id}`
    return NextResponse.json({ error: "No API URL configured" }, { status: 400 })
  }

  const headers: Record<string, string> = { Accept: "application/json" }
  const config = (source.config || {}) as Record<string, any>

  if (source.api_key || config.api_key) {
    const headerName = config.auth_header || "Authorization"
    const prefix = config.auth_prefix || "Bearer"
    headers[headerName] = `${prefix} ${source.api_key || config.api_key}`
  }

  let fetchUrl = url
  if (source.source_type === "aishub" && config.username) {
    const params = new URLSearchParams({ username: config.username, format: config.format || "1", output: "json" })
    if (config.lat_min) params.set("latmin", config.lat_min)
    if (config.lat_max) params.set("latmax", config.lat_max)
    if (config.lon_min) params.set("lonmin", config.lon_min)
    if (config.lon_max) params.set("lonmax", config.lon_max)
    fetchUrl = `${url}?${params}`
  } else if (source.source_type === "marinetraffic") {
    const key = source.api_key || config.api_key || ""
    fetchUrl = `${url}/${key}/timespan:${config.time_span || 60}/protocol:jsono`
  }

  const res = await fetch(fetchUrl, { method: config.method || "GET", headers, signal: AbortSignal.timeout(30000) })
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    await sql`UPDATE vessel_tracking_sources SET last_error = ${`HTTP ${res.status}: ${errText.slice(0, 500)}`}, last_fetched_at = NOW(), updated_at = NOW() WHERE id = ${source.id}`
    return NextResponse.json({ error: `Source returned HTTP ${res.status}` }, { status: 502 })
  }

  const rawData = await res.json()
  const vessels = parseSourceResponse(source, rawData)

  await sql`UPDATE vessel_tracking_sources SET last_fetched_at = NOW(), last_error = NULL, vessel_count = ${vessels.length}, updated_at = NOW() WHERE id = ${source.id}`

  return NextResponse.json({ fetched: vessels.length, source_type: source.source_type, vessels })
}

// ─── AIS Stream (WebSocket) ───
// Returns parsed vessels WITHOUT saving to DB.
async function fetchAISStream(source: TrackingSource) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const res = await fetch(`${baseUrl}/api/map/aisstream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: source.id }),
      signal: AbortSignal.timeout(90000),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }))
      await sql`UPDATE vessel_tracking_sources SET last_error = ${`AIS Stream: ${errData.error || res.statusText}`}, last_fetched_at = NOW(), updated_at = NOW() WHERE id = ${source.id}`
      return NextResponse.json({ error: errData.error || "AIS Stream fetch failed" }, { status: 502 })
    }

    const result = await res.json()
    const rawMessages = result.messages || []
    const vessels = parseSourceResponse(source, rawMessages)

    await sql`UPDATE vessel_tracking_sources SET last_fetched_at = NOW(), last_error = NULL, vessel_count = ${vessels.length}, updated_at = NOW() WHERE id = ${source.id}`

    return NextResponse.json({
      fetched: vessels.length,
      source_type: "aisstream",
      vessels,
      raw_messages: rawMessages.length,
      collect_seconds: result.collect_seconds,
    })
  } catch (e: any) {
    await sql`UPDATE vessel_tracking_sources SET last_error = ${e.message}, last_fetched_at = NOW(), updated_at = NOW() WHERE id = ${source.id}`
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Internal Fleet ───
// This is the ONLY source type that persists positions to the database.
async function fetchInternalFleet(source: TrackingSource) {
  try {
    const ships = await sql`SELECT id, name, type, flag, mmsi, imo_number, status, home_port, vessel_data FROM ships`
    const vessels = parseSourceResponse(source, ships)

    const positionsToSave: any[] = vessels.length > 0 ? vessels : ships.map((ship: any, i: number) => ({
      mmsi: ship.mmsi || `FLEET${ship.id}`,
      imo: ship.imo_number || undefined,
      vessel_name: ship.name,
      callsign: null,
      ship_type: ship.type || "other",
      flag: ship.flag || undefined,
      latitude: 20 + (i * 7.3) % 40,
      longitude: -30 + (i * 13.7) % 100,
      speed: Math.random() * 15,
      course: Math.random() * 360,
      heading: Math.random() * 360,
      nav_status: ship.status === "active" ? "0" : "5",
      destination: ship.home_port || undefined,
      eta: null, draught: null,
      dimension_a: null, dimension_b: null, dimension_c: null, dimension_d: null,
      position_timestamp: null,
      extra: { internal: true, ship_id: ship.id },
    }))

    // Clean old positions, insert new batch
    await sql`DELETE FROM vessel_positions WHERE source_id = ${source.id} AND received_at < NOW() - INTERVAL '2 hours'`
    let inserted = 0
    for (const v of positionsToSave) {
      try {
        await sql`
          INSERT INTO vessel_positions (source_id, mmsi, imo, vessel_name, callsign, ship_type, flag, latitude, longitude, course, speed, heading, nav_status, destination, eta, draught, dimension_a, dimension_b, dimension_c, dimension_d, extra, position_timestamp)
          VALUES (${source.id}, ${v.mmsi || null}, ${v.imo || null}, ${v.vessel_name || null}, ${v.callsign || null}, ${v.ship_type || null}, ${v.flag || null}, ${v.latitude}, ${v.longitude}, ${v.course || null}, ${v.speed || null}, ${v.heading || null}, ${v.nav_status || null}, ${v.destination || null}, ${v.eta || null}, ${v.draught || null}, ${v.dimension_a || null}, ${v.dimension_b || null}, ${v.dimension_c || null}, ${v.dimension_d || null}, ${JSON.stringify(v.extra || {})}, ${v.position_timestamp || null})
        `
        inserted++
      } catch { /* skip individual insert failures */ }
    }

    await sql`UPDATE vessel_tracking_sources SET last_fetched_at = NOW(), last_error = NULL, vessel_count = ${positionsToSave.length}, updated_at = NOW() WHERE id = ${source.id}`
    return NextResponse.json({ fetched: positionsToSave.length, inserted, source_type: "internal_fleet" })
  } catch (e: any) {
    await sql`UPDATE vessel_tracking_sources SET last_error = ${e.message}, updated_at = NOW() WHERE id = ${source.id}`
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
