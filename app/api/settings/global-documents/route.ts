import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"


// GET: List all global documents
export async function GET() {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || session.role === "crew") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = await sql`
      SELECT id, document_type, file_name, mime_type, file_size, uploaded_by, created_at,
        requires_signature, is_global, notes
      FROM file_storage
      WHERE is_global = true AND global_source_id IS NULL
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Upload a new global document
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || session.role !== "sysadmin") {
      return NextResponse.json({ error: "Only sysadmin can upload global documents" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const docType = formData.get("document_type") as string || "global_document"
    const label = formData.get("label") as string || ""
    const requiresSignature = formData.get("requires_signature") === "true"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await sql`
      INSERT INTO file_storage (
        crew_id, ship_id, document_type, file_name, mime_type, file_size, file_data,
        uploaded_by, requires_signature, is_global, notes
      )
      VALUES (
        ${null}, ${null}, ${docType}, ${file.name}, ${file.type}, ${file.size}, ${buffer},
        ${session.name || "admin"}, ${requiresSignature}, ${true}, ${label}
      )
      RETURNING id, document_type, file_name, mime_type, file_size, uploaded_by, created_at, requires_signature, is_global, notes
    `
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Remove a global document and all its crew copies
export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || session.role !== "sysadmin") {
      return NextResponse.json({ error: "Only sysadmin can delete global documents" }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: "Document ID required" }, { status: 400 })

    // Delete all crew copies first
    await sql`DELETE FROM file_storage WHERE global_source_id = ${id}`
    // Delete the global source
    await sql`DELETE FROM file_storage WHERE id = ${id} AND is_global = true`

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
