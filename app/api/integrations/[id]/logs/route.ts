import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession, isStaff } from "@/lib/auth"
import { ensureIntegrationTables } from "@/lib/integrations/store"

// GET /api/integrations/[id]/logs -> recent submission logs for a connection
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    const sql = getDb()
    await ensureIntegrationTables(sql)

    // Verify connection exists
    const connCheck = await sql`SELECT id FROM integration_connections WHERE id = ${id} LIMIT 1`
    if (!connCheck || connCheck.length === 0) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100"), 500)
    const rows = await sql`
      SELECT * FROM integration_logs
      WHERE connection_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("[v0] GET /api/integrations/[id]/logs error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/integrations/[id]/logs -> clear logs for a connection
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    const sql = getDb()
    await ensureIntegrationTables(sql)

    // Verify connection exists
    const connCheck = await sql`SELECT id FROM integration_connections WHERE id = ${id} LIMIT 1`
    if (!connCheck || connCheck.length === 0) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    await sql`DELETE FROM integration_logs WHERE connection_id = ${id}`
    return NextResponse.json({ success: true, message: "Logs cleared" })
  } catch (e: any) {
    console.error("[v0] DELETE /api/integrations/[id]/logs error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
