// SeaRM Extension Manifest Validator API
// POST - Validate a manifest without installing (stateless, no DB needed)
import { NextResponse } from "next/server"
import { validateManifest } from "@/lib/extensions/validator"

export async function POST(req: Request) {
  try {
    const { manifest } = await req.json()
    if (!manifest) return NextResponse.json({ valid: false, errors: ["manifest is required"], warnings: [] }, { status: 400 })
    const result = validateManifest(manifest)
    return NextResponse.json({ valid: result.valid, errors: result.errors || [], warnings: result.warnings || [] })
  } catch (err: any) {
    return NextResponse.json({ valid: false, errors: ["Invalid JSON: " + err.message], warnings: [] }, { status: 400 })
  }
}
