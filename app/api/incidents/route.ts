import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const status = req.nextUrl.searchParams.get("status")
    const severity = req.nextUrl.searchParams.get("severity")
    const voyageId = req.nextUrl.searchParams.get("voyage_id")
    const shipId = req.nextUrl.searchParams.get("ship_id")

    let query = `SELECT i.*, v.voyage_name, s.name as ship_name
      FROM incidents i
      LEFT JOIN voyages v ON i.voyage_id = v.id
      LEFT JOIN ships s ON i.ship_id = s.id WHERE 1=1`
    const params: any[] = []
    let idx = 0
    if (status) { idx++; query += ` AND i.status = $${idx}`; params.push(status) }
    if (severity) { idx++; query += ` AND i.severity = $${idx}`; params.push(severity) }
    if (voyageId) { idx++; query += ` AND i.voyage_id = $${idx}`; params.push(voyageId) }
    if (shipId) { idx++; query += ` AND i.ship_id = $${idx}`; params.push(shipId) }
    query += ` ORDER BY i.occurred_at DESC`
    const rows = params.length > 0 ? await sql.query(query, params) : await sql.query(query)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json()
    if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
    const result = await sql.query(
      `INSERT INTO incidents (voyage_id, ship_id, title, description, severity, category, status, occurred_at, location, reported_by, corrective_actions, follow_up, crew_involved)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [
        body.voyage_id || null, body.ship_id || null, body.title,
        body.description || "", body.severity || "low", body.category || "general",
        body.status || "open", body.occurred_at || new Date().toISOString(),
        body.location || "", body.reported_by || "",
        body.corrective_actions || "", body.follow_up || "",
        JSON.stringify(body.crew_involved || []),
      ]
    )
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
