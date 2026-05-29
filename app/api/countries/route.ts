import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET: List all countries
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const search = searchParams.get("search")
  const region = searchParams.get("region")

  let query = sql`
    SELECT id, code, name, flag_emoji, region, is_active, created_at
    FROM countries
    WHERE is_active = true
  `

  if (search) {
    query = sql`
      SELECT id, code, name, flag_emoji, region, is_active, created_at
      FROM countries
      WHERE is_active = true
        AND (name ILIKE ${'%' + search + '%'} OR code ILIKE ${'%' + search + '%'})
    `
  }

  if (region) {
    query = sql`
      SELECT id, code, name, flag_emoji, region, is_active, created_at
      FROM countries
      WHERE is_active = true AND region = ${region}
    `
  }

  const rows = await query
  return NextResponse.json(rows)
}

// POST: Create a new country
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { code, name, flag_emoji, region } = body

  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      INSERT INTO countries (code, name, flag_emoji, region)
      VALUES (${code.toUpperCase()}, ${name}, ${flag_emoji || null}, ${region || null})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Country code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
