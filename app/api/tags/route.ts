import { getDb } from "@/lib/db"
import { NextResponse } from "next/server"

// Returns all unique tags used across all crew members
export async function GET() {
  try {
    const sql = getDb()
    const tags = await sql`SELECT DISTINCT tag, COUNT(*) as count FROM crew_tags GROUP BY tag ORDER BY count DESC, tag`
    return NextResponse.json(tags)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
