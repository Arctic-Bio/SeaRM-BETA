import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()
    const result = await sql`SELECT COUNT(*) as count FROM users`
    return NextResponse.json({ isFirst: parseInt(result[0].count as string) === 0 })
  } catch {
    return NextResponse.json({ isFirst: false })
  }
}
