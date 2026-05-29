import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { registerUser, getSession, type UserRole } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, crew_id } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name required" }, { status: 400 })
    }

    const sql = getDb()
    const countResult = await sql`SELECT COUNT(*) as count FROM users`
    const isFirstUser = parseInt(countResult[0].count as string) === 0

    if (isFirstUser) {
      // First user auto-becomes sysadmin -- no auth required
      const user = await registerUser(email, password, name, "sysadmin", crew_id)
      return NextResponse.json({ user })
    }

    // All subsequent accounts: sysadmin-only creation
    const session = await getSession()
    if (!session || session.role !== "sysadmin") {
      return NextResponse.json({ error: "Only sysadmin can create accounts" }, { status: 403 })
    }

    const assignRole: UserRole = (role && ["sysadmin", "captain", "hr", "crew"].includes(role)) ? role : "crew"
    const user = await registerUser(email, password, name, assignRole, crew_id)
    return NextResponse.json({ user })
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
