import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"


export async function GET() {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || !["sysadmin", "captain", "hr"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const users = await sql`
      SELECT u.id, u.email, u.name, u.role, u.crew_id, u.is_active, u.last_login, u.created_at,
        ca.first_name, ca.last_name
      FROM users u
      LEFT JOIN crew ca ON u.crew_id = ca.id
      ORDER BY u.created_at DESC
    `
    return NextResponse.json(users)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const dbCheck = await sql`SELECT role FROM users WHERE id = ${session.id} AND is_active = true`
    const currentRole = dbCheck.length ? dbCheck[0].role as string : session.role
    if (currentRole !== "sysadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { id, role, is_active, crew_id, reset_password } = await req.json()
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    if (role !== undefined) {
      await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${id}`
    }
    if (is_active !== undefined) {
      await sql`UPDATE users SET is_active = ${is_active}, updated_at = now() WHERE id = ${id}`
    }
    if (crew_id !== undefined) {
      await sql`UPDATE users SET crew_id = ${crew_id || null}, updated_at = now() WHERE id = ${id}`
    }
    if (reset_password) {
      const { hashPassword } = await import("@/lib/auth")
      const hash = await hashPassword(reset_password)
      await sql`UPDATE users SET password_hash = ${hash}, updated_at = now() WHERE id = ${id}`
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
