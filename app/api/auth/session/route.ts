import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const tokenUser = await getSession()
  if (!tokenUser) return NextResponse.json({ user: null }, { status: 401 })

  // Always fetch fresh role + is_active from DB to handle role migrations and deactivations
  try {
    const rows = await sql`SELECT id, email, name, role, crew_id, is_active FROM users WHERE id = ${tokenUser.id}`
    if (!rows.length || !rows[0].is_active) {
      return NextResponse.json({ user: null }, { status: 401 })
    }
    const dbUser = rows[0]
    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        crew_id: dbUser.crew_id,
        is_active: dbUser.is_active,
      },
    })
  } catch {
    // Fallback to token data if DB is unreachable
    return NextResponse.json({ user: tokenUser })
  }
}
