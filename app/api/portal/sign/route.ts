import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"


export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || !session.crew_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { document_id, signature_name, signature_type, signature_image, agreed } = await req.json()

    // Validate required fields
    if (!document_id) return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    if (!signature_name?.trim()) return NextResponse.json({ error: "Full legal name is required" }, { status: 400 })
    if (!agreed) return NextResponse.json({ error: "You must agree to the electronic signature terms" }, { status: 400 })

    const sigType = signature_type === "drawn" ? "drawn" : "typed"

    // If drawn, validate image data exists
    if (sigType === "drawn" && !signature_image) {
      return NextResponse.json({ error: "Drawn signature image data is required" }, { status: 400 })
    }

    // Verify the document belongs to this crew member and requires signature
    const docs = await sql`
      SELECT id, requires_signature, signed_by, file_name, document_type
      FROM file_storage
      WHERE id = ${document_id} AND crew_id = ${session.crew_id}
    `
    if (!docs.length) return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 })
    if (!docs[0].requires_signature) return NextResponse.json({ error: "This document does not require a signature" }, { status: 400 })
    if (docs[0].signed_by) return NextResponse.json({ error: "This document has already been signed" }, { status: 400 })

    // Apply the signature
    await sql`
      UPDATE file_storage
      SET
        signed_by = ${session.id},
        signed_at = now(),
        signature_name = ${signature_name.trim()},
        signature_type = ${sigType},
        signature_image = ${sigType === "drawn" ? signature_image : null}
      WHERE id = ${document_id}
    `

    // Log the audit trail
    try {
      await sql`
        INSERT INTO signature_audit_log (document_id, crew_id, user_id, action, signature_name, signature_type, ip_address, user_agent)
        VALUES (
          ${document_id},
          ${session.crew_id},
          ${session.id},
          'signed',
          ${signature_name.trim()},
          ${sigType},
          ${req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"},
          ${req.headers.get("user-agent") || "unknown"}
        )
      `
    } catch {
      // Audit log table may not exist yet -- don't fail the signing
    }

    return NextResponse.json({
      success: true,
      document_name: docs[0].file_name,
      document_type: docs[0].document_type,
      signed_at: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
