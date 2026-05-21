// SeaRM Extension by ID API
// GET    - Get single extension details + config
// PUT    - Update extension (activate/deactivate/configure/clear-errors)
// DELETE - Uninstall extension
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  getExtension, activateExtension, deactivateExtension, uninstallExtension,
  getExtensionConfig, setExtensionConfigBulk, clearExtensionErrors
} from "@/lib/extensions/manager"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ext = await getExtension(id)
  if (!ext) return NextResponse.json({ error: "Extension not found" }, { status: 404 })

  const config = await getExtensionConfig(id)
  return NextResponse.json({ ...ext, config })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action, config } = body
  const performedBy = user.email || user.username

  try {
    switch (action) {
      case "activate": {
        const ext = await activateExtension(id, performedBy)
        return NextResponse.json(ext)
      }
      case "deactivate": {
        const ext = await deactivateExtension(id, performedBy)
        return NextResponse.json(ext)
      }
      case "configure": {
        if (!config || typeof config !== "object") return NextResponse.json({ error: "config object required" }, { status: 400 })
        await setExtensionConfigBulk(id, config, performedBy)
        const updated = await getExtension(id)
        const updatedConfig = await getExtensionConfig(id)
        return NextResponse.json({ ...updated, config: updatedConfig })
      }
      case "clear_errors": {
        await clearExtensionErrors(id)
        const ext = await getExtension(id)
        return NextResponse.json(ext)
      }
      default:
        return NextResponse.json({ error: "Invalid action. Use: activate, deactivate, configure, clear_errors" }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    await uninstallExtension(id, user.email || user.username)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
