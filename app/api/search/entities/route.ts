import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// Unified entity search for autocomplete — searches crew, ships, and voyages
export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const type = searchParams.get("type") // "crew" | "ship" | "voyage" | null (all)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)

    if (q.length < 1) {
      return NextResponse.json({ data: [] })
    }

    const pattern = `%${q}%`
    const results: { type: string; id: string; label: string; sublabel: string }[] = []

    if (!type || type === "crew") {
      const crew = await sql`
        SELECT id, first_name, last_name, country, status
        FROM crew
        WHERE (first_name || ' ' || last_name) ILIKE ${pattern}
           OR email ILIKE ${pattern}
        ORDER BY first_name ASC
        LIMIT ${limit}
      `
      for (const c of crew) {
        results.push({
          type: "crew",
          id: c.id,
          label: `${c.first_name} ${c.last_name}`,
          sublabel: [c.country, c.status].filter(Boolean).join(" - "),
        })
      }
    }

    if (!type || type === "ship") {
      const ships = await sql`
        SELECT id, name, type, status, flag
        FROM ships
        WHERE name ILIKE ${pattern}
           OR call_sign ILIKE ${pattern}
           OR imo_number ILIKE ${pattern}
        ORDER BY name ASC
        LIMIT ${limit}
      `
      for (const s of ships) {
        results.push({
          type: "ship",
          id: s.id,
          label: s.name,
          sublabel: [s.type, s.flag, s.status].filter(Boolean).join(" - "),
        })
      }
    }

    if (!type || type === "voyage") {
      const voyages = await sql`
        SELECT v.id, v.voyage_name, v.status, v.departure_port, s.name as ship_name
        FROM voyages v
        LEFT JOIN ships s ON v.ship_id = s.id
        WHERE v.voyage_name ILIKE ${pattern}
           OR v.departure_port ILIKE ${pattern}
           OR v.destination_port ILIKE ${pattern}
        ORDER BY v.voyage_name ASC
        LIMIT ${limit}
      `
      for (const v of voyages) {
        results.push({
          type: "voyage",
          id: v.id,
          label: v.voyage_name,
          sublabel: [v.ship_name, v.departure_port, v.status].filter(Boolean).join(" - "),
        })
      }
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
