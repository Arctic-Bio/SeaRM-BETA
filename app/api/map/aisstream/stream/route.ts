import { neon } from "@neondatabase/serverless"
import WebSocket from "ws"
import type { TrackingSource } from "@/lib/map/types"
import { parseSourceResponse } from "@/lib/map/source-parsers"

const sql = neon(process.env.DATABASE_URL!)

/**
 * AISstream SSE Streaming Endpoint
 *
 * Opens a persistent WebSocket connection to AISstream.io and forwards
 * parsed vessel position updates to the client via Server-Sent Events (SSE).
 *
 * Supports multi-zone: accepts multiple bounding boxes and streams vessels
 * from all zones simultaneously. The client draws watch zones on the map,
 * and this endpoint uses them as the AISstream subscription filter.
 *
 * Query params:
 *   source_id    - Required. The tracking source ID (must be aisstream type)
 *   zones        - Optional JSON-encoded bounding boxes array [[[lat1,lon1],[lat2,lon2]],...]
 *   mmsis        - Optional comma-separated MMSI list for targeted tracking
 *
 * SSE events:
 *   vessel       - A parsed vessel position update (JSON)
 *   batch        - A batch of parsed vessels (JSON array) sent every 2 seconds
 *   status       - Connection status update (JSON: { connected, messageCount, vesselCount, uptime })
 *   error        - Error message (string)
 *   ping         - Keepalive (empty)
 */
export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes max for streaming

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sourceId = url.searchParams.get("source_id")
  const zonesParam = url.searchParams.get("zones")
  const mmsisParam = url.searchParams.get("mmsis")

  if (!sourceId) {
    return new Response("source_id required", { status: 400 })
  }

  // Load source config
  const sources = await sql`SELECT * FROM vessel_tracking_sources WHERE id = ${sourceId}`
  if (!sources.length) {
    return new Response("Source not found", { status: 404 })
  }
  const source = sources[0] as unknown as TrackingSource
  if (source.source_type !== "aisstream") {
    return new Response("Source is not aisstream type", { status: 400 })
  }

  const config = (source.config || {}) as Record<string, any>
  const apiKey = config.api_key || source.api_key
  if (!apiKey) {
    return new Response("No API key configured", { status: 400 })
  }

  // Parse bounding boxes from zones param or source config
  let boundingBoxes: number[][][] = []

  if (zonesParam) {
    try {
      const parsed = JSON.parse(zonesParam)
      if (Array.isArray(parsed) && parsed.length > 0) {
        boundingBoxes = parsed
      }
    } catch {
      // Invalid zones param
    }
  }

  // Fall back to source config bounding boxes
  if (boundingBoxes.length === 0) {
    try {
      const raw = config.bounding_boxes
      const parsed = typeof raw === "string" ? JSON.parse(raw.trim()) : raw
      if (Array.isArray(parsed) && parsed.length > 0) {
        boundingBoxes = parsed
      }
    } catch {
      // Invalid config
    }
  }

  // Filter out boxes that are too large (>25% of globe)
  boundingBoxes = boundingBoxes.filter(box => {
    if (!box || box.length < 2) return false
    const [sw, ne] = box
    const latSpan = Math.abs(ne[0] - sw[0])
    const lonSpan = Math.abs(ne[1] - sw[1])
    const areaPct = (latSpan * lonSpan) / (180 * 360) * 100
    return areaPct <= 25
  })

  if (boundingBoxes.length === 0) {
    return new Response("No valid bounding boxes. Draw watch zones or configure bounding boxes.", { status: 400 })
  }

  // Parse MMSI filters
  const mmsiSet = new Set<string>()
  if (mmsisParam) {
    mmsisParam.split(",").map(s => s.trim()).filter(Boolean).forEach(m => mmsiSet.add(m))
  }
  if (config.filter_mmsi) {
    String(config.filter_mmsi).split(",").map(s => s.trim()).filter(Boolean).forEach(m => mmsiSet.add(m))
  }
  const filtersShipMMSI = mmsiSet.size > 0 ? Array.from(mmsiSet).slice(0, 50) : undefined

  // Message type filter
  let filterMessageTypes: string[] = [
    "PositionReport",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
    "ShipStaticData",
    "StaticDataReport",
    "LongRangeAisBroadcastMessage",
  ]
  if (config.filter_message_types) {
    const types = String(config.filter_message_types).split(",").map(s => s.trim()).filter(Boolean)
    if (types.length > 0) filterMessageTypes = types
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  let wsConnection: WebSocket | null = null
  let closed = false
  const startTime = Date.now()
  let messageCount = 0
  let vesselCount = 0

  // Buffer for batching - collect messages and send in batches every 2s
  let messageBuffer: any[] = []

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      const sendRaw = (event: string, data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
        } catch {
          closed = true
        }
      }

      // Send initial status
      send("status", {
        connected: false,
        phase: "connecting",
        messageCount: 0,
        vesselCount: 0,
        uptime: 0,
        zones: boundingBoxes.length,
      })

      // Connect to AISstream WebSocket
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream", {
        rejectUnauthorized: false,
      })
      wsConnection = ws

      ws.on("open", () => {
        if (closed) { ws.close(); return }

        // Build subscription
        const subscription: Record<string, any> = {
          APIKey: apiKey,
          BoundingBoxes: boundingBoxes,
        }
        if (filtersShipMMSI && filtersShipMMSI.length > 0) {
          subscription.FiltersShipMMSI = filtersShipMMSI
        }
        if (filterMessageTypes.length > 0) {
          subscription.FilterMessageTypes = filterMessageTypes
        }

        ws.send(JSON.stringify(subscription))

        send("status", {
          connected: true,
          phase: "streaming",
          messageCount: 0,
          vesselCount: 0,
          uptime: 0,
          zones: boundingBoxes.length,
          boundingBoxes,
        })
      })

      ws.on("message", (data: WebSocket.Data) => {
        if (closed) return
        try {
          const msg = JSON.parse(data.toString())

          if (msg.error) {
            send("error", { message: `AISstream: ${msg.error}` })
            return
          }

          const meta = msg.MetaData || msg.Metadata
          if (msg.MessageType && meta) {
            msg.MetaData = meta
            messageCount++
            messageBuffer.push(msg)
          }
        } catch {
          // Skip malformed
        }
      })

      // Batch flush interval - send collected messages every 2 seconds
      const batchInterval = setInterval(() => {
        if (closed) { clearInterval(batchInterval); return }

        if (messageBuffer.length > 0) {
          // Parse through source parser for consistent format
          const parsed = parseSourceResponse(source, messageBuffer)
          vesselCount = parsed.length

          send("batch", {
            vessels: parsed,
            rawCount: messageBuffer.length,
            parsedCount: parsed.length,
            totalMessages: messageCount,
            timestamp: new Date().toISOString(),
          })

          messageBuffer = []
        }

        // Send status every batch cycle
        send("status", {
          connected: ws.readyState === WebSocket.OPEN,
          phase: ws.readyState === WebSocket.OPEN ? "streaming" : "reconnecting",
          messageCount,
          vesselCount,
          uptime: Math.floor((Date.now() - startTime) / 1000),
          zones: boundingBoxes.length,
          messagesPerSecond: messageCount / Math.max(1, (Date.now() - startTime) / 1000),
        })
      }, 2000)

      // Keepalive ping every 15 seconds
      const pingInterval = setInterval(() => {
        if (closed) { clearInterval(pingInterval); return }
        sendRaw("ping", "")
      }, 15000)

      ws.on("error", (err: Error) => {
        send("error", { message: `WebSocket error: ${err.message}` })
      })

      ws.on("close", (code, reason) => {
        clearInterval(batchInterval)
        clearInterval(pingInterval)

        if (!closed) {
          send("status", {
            connected: false,
            phase: "disconnected",
            messageCount,
            vesselCount,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            zones: boundingBoxes.length,
            closeCode: code,
            closeReason: reason?.toString() || "",
          })

          // Flush remaining buffer
          if (messageBuffer.length > 0) {
            const parsed = parseSourceResponse(source, messageBuffer)
            send("batch", {
              vessels: parsed,
              rawCount: messageBuffer.length,
              parsedCount: parsed.length,
              totalMessages: messageCount,
              timestamp: new Date().toISOString(),
            })
            messageBuffer = []
          }

          try { controller.close() } catch { /* already closed */ }
        }
        closed = true
      })

      // Safety timeout: close after maxDuration - 10s buffer
      const safetyTimeout = setTimeout(() => {
        if (!closed) {
          send("status", {
            connected: false,
            phase: "timeout",
            messageCount,
            vesselCount,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            zones: boundingBoxes.length,
          })
          try { ws.close() } catch { /* ignore */ }
          try { controller.close() } catch { /* ignore */ }
          closed = true
        }
      }, (maxDuration - 10) * 1000)

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(batchInterval)
        clearInterval(pingInterval)
        clearTimeout(safetyTimeout)
        try { ws.close() } catch { /* ignore */ }
        try { controller.close() } catch { /* ignore */ }
      })
    },

    cancel() {
      closed = true
      try { wsConnection?.close() } catch { /* ignore */ }
    },
  })

  // Update source metadata
  await sql`UPDATE vessel_tracking_sources SET last_fetched_at = NOW(), last_error = NULL, updated_at = NOW() WHERE id = ${sourceId}`

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
