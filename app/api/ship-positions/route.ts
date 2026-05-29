import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET: List ship positions for a specific ship
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const shipId = searchParams.get("ship_id")

  if (!shipId) {
    return NextResponse.json({ error: "ship_id is required" }, { status: 400 })
  }

  const rows = await sql`
    SELECT sp.*, p.name as position_name, p.department, p.description, p.is_officer
    FROM ship_positions sp
    JOIN positions p ON p.id = sp.position_id
    WHERE sp.ship_id = ${shipId}
    ORDER BY p.sort_order, p.name
  `
  return NextResponse.json(rows)
}

// POST: Add a position to a ship
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin", "voyage_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { ship_id, position_id, quantity, is_required, hourly_rate, daily_rate, notes } = body

  if (!ship_id || !position_id) {
    return NextResponse.json({ error: "ship_id and position_id are required" }, { status: 400 })
  }

  try {
    const result = await sql`
      INSERT INTO ship_positions (ship_id, position_id, quantity, is_required, hourly_rate, daily_rate, notes)
      VALUES (${ship_id}, ${position_id}, ${quantity || 1}, ${is_required !== false}, ${hourly_rate || null}, ${daily_rate || null}, ${notes || null})
      ON CONFLICT (ship_id, position_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        is_required = EXCLUDED.is_required,
        hourly_rate = EXCLUDED.hourly_rate,
        daily_rate = EXCLUDED.daily_rate,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// DELETE: Remove a position from a ship
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin", "voyage_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await sql`DELETE FROM ship_positions WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
