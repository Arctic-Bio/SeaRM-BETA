// SeaRM Extensions API
// GET  - List all installed extensions
// POST - Install a new extension (from JSON manifest)
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { listExtensions, installExtension } from "@/lib/extensions/manager"
import { validateManifest } from "@/lib/extensions/validator"

export async function GET() {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const extensions = await listExtensions()
  return NextResponse.json(extensions)
}

export async function POST(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { manifest } = body

    if (!manifest) return NextResponse.json({ error: "Manifest is required" }, { status: 400 })

    // Validate manifest
    const validation = validateManifest(manifest)
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid manifest", errors: validation.errors, warnings: validation.warnings }, { status: 400 })
    }

    const extension = await installExtension(manifest, user.email || user.username)
    return NextResponse.json({ extension, warnings: validation.warnings }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
