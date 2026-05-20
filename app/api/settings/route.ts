import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const rows = await sql`SELECT key, value FROM site_settings`
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key as string] = r.value as string
    return NextResponse.json(settings)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "sysadmin") {
      return NextResponse.json({ error: "Sysadmin only" }, { status: 403 })
    }
    const updates: Record<string, string> = await req.json()
    for (const [key, value] of Object.entries(updates)) {
      await sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${value}, now()) ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
