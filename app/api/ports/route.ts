import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET: List all ports
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const search = searchParams.get("search")
  const countryId = searchParams.get("country_id")

  if (countryId) {
    const rows = await sql`
      SELECT p.*, c.name as country_name, c.code as country_code, c.flag_emoji
      FROM ports p
      LEFT JOIN countries c ON c.id = p.country_id
      WHERE p.is_active = true AND p.country_id = ${countryId}
      ORDER BY p.name
    `
    return NextResponse.json(rows)
  }

  if (search) {
    const rows = await sql`
      SELECT p.*, c.name as country_name, c.code as country_code, c.flag_emoji
      FROM ports p
      LEFT JOIN countries c ON c.id = p.country_id
      WHERE p.is_active = true
        AND (p.name ILIKE ${'%' + search + '%'} OR p.code ILIKE ${'%' + search + '%'})
      ORDER BY p.name
      LIMIT 50
    `
    return NextResponse.json(rows)
  }

  const rows = await sql`
    SELECT p.*, c.name as country_name, c.code as country_code, c.flag_emoji
    FROM ports p
    LEFT JOIN countries c ON c.id = p.country_id
    WHERE p.is_active = true
    ORDER BY p.name
    LIMIT 100
  `
  return NextResponse.json(rows)
}

// POST: Create a new port
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { code, name, country_id, latitude, longitude, timezone, port_type, notes } = body

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const result = await sql`
      INSERT INTO ports (code, name, country_id, latitude, longitude, timezone, port_type, notes)
      VALUES (${code || null}, ${name}, ${country_id || null}, ${latitude || null}, ${longitude || null}, ${timezone || null}, ${port_type || null}, ${notes || null})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Port code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
