import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import WebSocket from "ws"
import https from "https"
import type { TrackingSource } from "@/lib/map/types"

const sql = neon(process.env.DATABASE_URL!)

/**
 * AIS Stream WebSocket Consumer
 *
 * Opens a server-side WebSocket to wss://stream.aisstream.io/v0/stream,
 * sends the subscription message (API key + bounding boxes + filters),
 * collects messages for a configurable duration, then closes the socket
 * and returns the batch to the caller for parsing and upserting.
 *
 * This runs server-side because aisstream.io blocks CORS / browser connections
 * by design -- API keys must never be exposed to the client.
 *
 * Docs: https://aisstream.io/documentation
 */
export async function POST(req: Request) {
  try {
    const { source_id } = await req.json()
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
      return NextResponse.json({ error: "No API key configured for AIS Stream" }, { status: 400 })
    }

    const wsUrl = config.ws_url || "wss://stream.aisstream.io/v0/stream"

    // Parse bounding boxes from config -- default to entire world
    let boundingBoxes: number[][][] = [[[-90, -180], [90, 180]]]
    try {
      const parsed = typeof config.bounding_boxes === "string"
        ? JSON.parse(config.bounding_boxes)
        : config.bounding_boxes
      if (Array.isArray(parsed) && parsed.length > 0) boundingBoxes = parsed
    } catch { /* use default */ }

    // Parse optional MMSI filter (max 50 per aisstream docs)
    let filtersShipMMSI: string[] | undefined
    if (config.filter_mmsi) {
      const mmsis = String(config.filter_mmsi).split(",").map(s => s.trim()).filter(Boolean)
      if (mmsis.length > 0) filtersShipMMSI = mmsis.slice(0, 50)
    }

    // Parse optional message type filter
    let filterMessageTypes: string[] | undefined
    if (config.filter_message_types) {
      const types = String(config.filter_message_types).split(",").map(s => s.trim()).filter(Boolean)
      if (types.length > 0) filterMessageTypes = types
    }

    // Collection window -- how long to keep the socket open (5-60 seconds)
    const collectSeconds = Math.min(60, Math.max(5, parseInt(config.collect_seconds) || 15))

    // Collect messages from the WebSocket
    const messages = await collectAISStreamMessages({
      wsUrl,
      apiKey,
      boundingBoxes,
      filtersShipMMSI,
      filterMessageTypes,
      collectSeconds,
    })

    // Update source metadata
    await sql`
      UPDATE vessel_tracking_sources
      SET last_fetched_at = NOW(), last_error = NULL, vessel_count = ${messages.length}, updated_at = NOW()
      WHERE id = ${source_id}
    `

    return NextResponse.json({ messages, count: messages.length, source_type: "aisstream", collect_seconds: collectSeconds })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

interface CollectOptions {
  wsUrl: string
  apiKey: string
  boundingBoxes: number[][][]
  filtersShipMMSI?: string[]
  filterMessageTypes?: string[]
  collectSeconds: number
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

    // Allow expired / self-signed certs from aisstream.io
    const agent = new https.Agent({ rejectUnauthorized: false })
    const ws = new WebSocket(opts.wsUrl, { agent })

    // Safety timeout -- always resolve even if something hangs
    const timeout = setTimeout(finish, (opts.collectSeconds + 5) * 1000)

    ws.on("open", () => {
      // Must send subscription within 3 seconds per aisstream docs
      const subscription: Record<string, any> = {
        APIKey: opts.apiKey,
        BoundingBoxes: opts.boundingBoxes,
      }
      if (opts.filtersShipMMSI?.length) {
        subscription.FiltersShipMMSI = opts.filtersShipMMSI
      }
      if (opts.filterMessageTypes?.length) {
        subscription.FilterMessageTypes = opts.filterMessageTypes
      }

      ws.send(JSON.stringify(subscription))

      // Close after the collection window
      setTimeout(finish, opts.collectSeconds * 1000)
    })

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())
        // Skip error messages from aisstream
        if (msg.error) {
          clearTimeout(timeout)
          resolved = true
          try { ws.close() } catch { /* ignore */ }
          reject(new Error(`AIS Stream error: ${msg.error}`))
          return
        }
        // Only collect messages that have the expected structure
        if (msg.MessageType && msg.MetaData) {
          messages.push(msg)
        }
      } catch { /* skip malformed messages */ }
    })

    ws.on("error", (err: Error) => {
      clearTimeout(timeout)
      if (!resolved) {
        resolved = true
        reject(new Error(`WebSocket error: ${err.message}`))
      }
    })

    ws.on("close", () => {
      clearTimeout(timeout)
      finish()
    })
  })
}
