import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`SELECT COUNT(*) as count FROM users`
    return NextResponse.json({ isFirst: parseInt(result[0].count as string) === 0 })
  } catch {
    return NextResponse.json({ isFirst: false })
  }
}
