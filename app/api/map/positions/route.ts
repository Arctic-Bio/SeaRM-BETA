import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// GET vessel positions with deduplication (latest per MMSI)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sourceId = searchParams.get("source_id")
    const search = searchParams.get("q")?.trim() || null
    const staleMinutes = parseInt(searchParams.get("stale_minutes") || "60")
    const limit = Math.min(parseInt(searchParams.get("limit") || "5000"), 10000)
    // Mission bounding box filter: bbox=south,west,north,east (can repeat for multiple boxes)
    const bboxParam = searchParams.getAll("bbox")

    // Get latest position per vessel (by mmsi or id), filtering out stale positions
    let positions

    if (search) {
      // Server-side search by MMSI, IMO, name, callsign, flag, destination
      const q = `%${search}%`
      positions = await sql`
        SELECT DISTINCT ON (COALESCE(vp.mmsi, vp.id::text))
          vp.*, vts.name as source_name, vts.source_type, vts.slug as source_slug
        FROM vessel_positions vp
        JOIN vessel_tracking_sources vts ON vp.source_id = vts.id
        WHERE vp.received_at > NOW() - INTERVAL '1 minute' * ${staleMinutes}
          AND (
            vp.mmsi ILIKE ${q} OR
            vp.imo ILIKE ${q} OR
            vp.vessel_name ILIKE ${q} OR
            vp.callsign ILIKE ${q} OR
            vp.flag ILIKE ${q} OR
            vp.destination ILIKE ${q}
          )
        ORDER BY COALESCE(vp.mmsi, vp.id::text), vp.received_at DESC
        LIMIT ${limit}
      `
    } else if (sourceId) {
      positions = await sql`
        SELECT DISTINCT ON (COALESCE(mmsi, id::text))
          vp.*, vts.name as source_name, vts.source_type, vts.slug as source_slug
        FROM vessel_positions vp
        JOIN vessel_tracking_sources vts ON vp.source_id = vts.id
        WHERE vp.source_id = ${parseInt(sourceId)}
          AND vp.received_at > NOW() - INTERVAL '1 minute' * ${staleMinutes}
        ORDER BY COALESCE(mmsi, id::text), vp.received_at DESC
        LIMIT ${limit}
      `
    } else {
      // Show vessels from all sources
      positions = await sql`
        SELECT DISTINCT ON (COALESCE(vp.mmsi, vp.id::text))
          vp.*, vts.name as source_name, vts.source_type, vts.slug as source_slug
        FROM vessel_positions vp
        JOIN vessel_tracking_sources vts ON vp.source_id = vts.id
        WHERE vp.received_at > NOW() - INTERVAL '1 minute' * ${staleMinutes}
        ORDER BY COALESCE(vp.mmsi, vp.id::text), vp.received_at DESC
        LIMIT ${limit}
      `
    }

    // Apply mission bounding box filter if provided
    if (bboxParam.length > 0) {
      const boxes = bboxParam.map(b => b.split(",").map(Number)).filter(b => b.length === 4 && b.every(n => !isNaN(n)))
      if (boxes.length > 0) {
        positions = positions.filter((p: any) => {
          const lat = parseFloat(p.latitude)
          const lon = parseFloat(p.longitude)
          return boxes.some(([south, west, north, east]) => lat >= south && lat <= north && lon >= west && lon <= east)
        })
      }
    }

    return NextResponse.json({ positions, count: positions.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
