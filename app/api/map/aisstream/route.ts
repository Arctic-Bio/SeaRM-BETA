import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import WebSocket from "ws"
import type { TrackingSource } from "@/lib/map/types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * AISstream.io WebSocket Consumer
 *
 * Follows the official API reference: https://aisstream.io/documentation
 *
 * Protocol summary:
 * 1. Open WSS connection to wss://stream.aisstream.io/v0/stream
 * 2. Send subscription JSON within 3 seconds:
 *    { "APIKey": "...", "BoundingBoxes": [[[lat1,lon1],[lat2,lon2]]], "FiltersShipMMSI": [...], "FilterMessageTypes": [...] }
 * 3. Receive messages in format:
 *    { "MessageType": "PositionReport", "MetaData": { MMSI, ShipName, latitude, longitude, time_utc }, "Message": { "PositionReport": { ... } } }
 * 4. Close connection after collection window.
 *
 * Supported message types for position data:
 * - PositionReport (Class A, msg 1/2/3)
 * - StandardClassBPositionReport (Class B, msg 18)
 * - ExtendedClassBPositionReport (Class B, msg 19)
 * - ShipStaticData (msg 5 -- vessel name, IMO, dimensions, destination)
 * - StaticDataReport (msg 24 -- Class B static data)
 * - BaseStationReport (msg 4)
 * - AidsToNavigationReport (msg 21)
 * - StandardSearchAndRescueAircraftReport (msg 9)
 * - LongRangeAisBroadcastMessage (msg 27)
 *
 * Mission mode:
 * - Client can pass `missionBoundingBoxes` to override the source config bounding boxes
 *   with watch zone boundaries drawn on the mission dashboard.
 * - Client can pass `missionMMSIs` to add specific MMSI filters from the watchlist.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { source_id, missionBoundingBoxes, missionMMSIs } = body
    if (!source_id) return NextResponse.json({ error: "source_id required" }, { status: 400 })

    const sources = await sql`SELECT * FROM vessel_tracking_sources WHERE id = ${source_id}`
    if (!sources.length) return NextResponse.json({ error: "Source not found" }, { status: 404 })
    const source = sources[0] as unknown as TrackingSource

    if (source.source_type !== "aisstream") {
      return NextResponse.json({ error: "Source is not an aisstream type" }, { status: 400 })
    }

    const config = source.config || {}
    const apiKey = config.api_key || source.api_key
    if (!apiKey) {
      await sql`UPDATE vessel_tracking_sources SET last_error = ${"No API key configured"}, updated_at = NOW() WHERE id = ${source_id}`
      return NextResponse.json({ error: "No API key configured for AISstream" }, { status: 400 })
    }

    // ─── Bounding Boxes ───
    // Priority: mission zones (when active) > source config
    // AISstream format: [[[lat_min, lon_min], [lat_max, lon_max]], ...]
    // NEVER fall back to world-wide -- that causes 17K+ vessels and extremely slow loads.
    let boundingBoxes: number[][][] | null = null
    let bboxSource = "none"

    if (Array.isArray(missionBoundingBoxes) && missionBoundingBoxes.length > 0) {
      // Mission dashboard watch zones override -- use ONLY the drawn zones
      boundingBoxes = missionBoundingBoxes
      bboxSource = "mission"
    } else {
      // Fall back to source config bounding boxes
      try {
        const raw = config.bounding_boxes
        const parsed = typeof raw === "string" ? JSON.parse(raw.trim()) : raw
        if (Array.isArray(parsed) && parsed.length > 0) {
          boundingBoxes = parsed
          bboxSource = "source_config"
        }
      } catch {
        // Invalid bounding_boxes config -- skip
      }
    }

    // ─── World-wide bbox rejection ───
    // Reject bounding boxes that cover an unreasonably large area (> ~25% of the globe)
    // to prevent accidentally loading tens of thousands of vessels.
    if (boundingBoxes && boundingBoxes.length > 0) {
      const filtered = boundingBoxes.filter(box => {
        if (!box || box.length < 2) return false
        const [sw, ne] = box
        const latSpan = Math.abs(ne[0] - sw[0])
        const lonSpan = Math.abs(ne[1] - sw[1])
        const areaPct = (latSpan * lonSpan) / (180 * 360) * 100
        if (areaPct > 25) return false
        return true
      })
      if (filtered.length === 0) {
        boundingBoxes = null
      } else {
        boundingBoxes = filtered
      }
    }

    if (!boundingBoxes || boundingBoxes.length === 0) {
      const errMsg = bboxSource === "none"
        ? "No bounding box configured. Draw a mission watch zone or configure a bounding box in source settings."
        : "Bounding box is too large (covers the whole world). Draw a smaller mission watch zone or reduce the bounding box in source settings."
      await sql`UPDATE vessel_tracking_sources SET last_error = ${errMsg}, updated_at = NOW() WHERE id = ${source_id}`
      return NextResponse.json({
        error: errMsg,
        messages: [],
        count: 0,
      }, { status: 400 })
    }

    // ─── MMSI Filter ───
    // Merge source config MMSIs + mission watchlist MMSIs (max 50 per AISstream docs)
    const mmsiSet = new Set<string>()
    if (config.filter_mmsi) {
      String(config.filter_mmsi).split(",").map(s => s.trim()).filter(Boolean).forEach(m => mmsiSet.add(m))
    }
    if (Array.isArray(missionMMSIs)) {
      missionMMSIs.forEach((m: string) => mmsiSet.add(String(m)))
    }
    const filtersShipMMSI = mmsiSet.size > 0 ? Array.from(mmsiSet).slice(0, 50) : undefined

    // ─── Message Type Filter ───
    // Default to ALL position-relevant types for full live coverage (not just port data)
    let filterMessageTypes: string[] | undefined
    if (config.filter_message_types) {
      const types = String(config.filter_message_types).split(",").map(s => s.trim()).filter(Boolean)
      if (types.length > 0) filterMessageTypes = types
    }
    // If no filter configured, request all position + static types for maximum live data
    if (!filterMessageTypes) {
      filterMessageTypes = [
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
        "ShipStaticData",
        "StaticDataReport",
        "BaseStationReport",
        "AidsToNavigationReport",
        "LongRangeAisBroadcastMessage",
      ]
    }

    // Collection window -- how long to keep the socket open (3-30 seconds)
    // Shorter window = faster response. The zone-filtering means we get fewer but more relevant messages.
    const collectSeconds = Math.min(30, Math.max(3, parseInt(config.collect_seconds) || 8))
    // Max messages to collect before closing early (prevents memory issues on busy zones)
    const maxMessages = parseInt(config.max_messages) || 2000

    // Collect messages from the WebSocket
    const messages = await collectAISStreamMessages({
      apiKey,
      boundingBoxes,
      filtersShipMMSI,
      filterMessageTypes,
      collectSeconds,
      maxMessages,
    })

    // Update source metadata
    await sql`
      UPDATE vessel_tracking_sources
      SET last_fetched_at = NOW(), last_error = NULL, vessel_count = ${messages.length}, updated_at = NOW()
      WHERE id = ${source_id}
    `

    return NextResponse.json({
      messages,
      count: messages.length,
      source_type: "aisstream",
      collect_seconds: collectSeconds,
      bounding_boxes_used: boundingBoxes,
      message_types_requested: filterMessageTypes,
      mmsi_filter_count: filtersShipMMSI?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

interface CollectOptions {
  apiKey: string
  boundingBoxes: number[][][]
  filtersShipMMSI?: string[]
  filterMessageTypes?: string[]
  collectSeconds: number
  maxMessages: number
}

function collectAISStreamMessages(opts: CollectOptions): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const messages: any[] = []
    let resolved = false

    const finish = () => {
      if (resolved) return
      resolved = true
      try { ws.close() } catch { /* ignore */ }
      resolve(messages)
    }

    // Connect directly -- wss handles TLS natively
    // Use rejectUnauthorized: false to work around AISstream's expired SSL certificate
    // (TODO: remove once AISstream renews their cert)
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream", {
      rejectUnauthorized: false,
    })

    // Safety timeout -- always resolve even if something hangs
    // Per docs: subscription must be sent within 3 seconds or connection closes
    const timeout = setTimeout(finish, (opts.collectSeconds + 10) * 1000)

    ws.on("open", () => {
      // Build subscription per AISstream API docs:
      // { "APIKey": "...", "BoundingBoxes": [...], "FiltersShipMMSI": [...], "FilterMessageTypes": [...] }
      const subscription: Record<string, any> = {
        APIKey: opts.apiKey,
        BoundingBoxes: opts.boundingBoxes,
      }
      if (opts.filtersShipMMSI && opts.filtersShipMMSI.length > 0) {
        subscription.FiltersShipMMSI = opts.filtersShipMMSI
      }
      if (opts.filterMessageTypes && opts.filterMessageTypes.length > 0) {
        subscription.FilterMessageTypes = opts.filterMessageTypes
      }

      ws.send(JSON.stringify(subscription))

      // Close after the collection window
      setTimeout(finish, opts.collectSeconds * 1000)
    })

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())

        // Handle error messages from AISstream (e.g. "Api Key Is Not Valid")
        if (msg.error) {
          clearTimeout(timeout)
          resolved = true
          try { ws.close() } catch { /* ignore */ }
          reject(new Error(`AISstream error: ${msg.error}`))
          return
        }

        // Accept messages that follow the documented format:
        // { "MessageType": "...", "MetaData": { ... }, "Message": { ... } }
        // Docs use "MetaData" but some responses may have "Metadata" (lowercase d)
        const meta = msg.MetaData || msg.Metadata
        if (msg.MessageType && meta) {
          // Normalize to "MetaData" (capital D) for consistent parsing
          msg.MetaData = meta
          messages.push(msg)

          // Early close if we've collected enough messages
          if (messages.length >= opts.maxMessages) {
            finish()
            return
          }
        }
      } catch { /* skip malformed messages */ }
    })

    ws.on("error", (err: Error) => {
      clearTimeout(timeout)
      if (!resolved) {
        resolved = true
        reject(new Error(`AISstream WebSocket error: ${err.message}`))
      }
    })

    ws.on("close", () => {
      clearTimeout(timeout)
      finish()
    })
  })
}
