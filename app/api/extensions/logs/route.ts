// SeaRM Extension Logs API
// GET - Retrieve extension logs with filtering
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getExtensionLogs } from "@/lib/extensions/manager"

export async function GET(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const extension_id = url.searchParams.get("extension_id") || undefined
  const level = url.searchParams.get("level") || undefined
  const action = url.searchParams.get("action") || undefined
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const offset = parseInt(url.searchParams.get("offset") || "0")

  const result = await getExtensionLogs({ extension_id, level, action, limit, offset })
  return NextResponse.json(result)
}
