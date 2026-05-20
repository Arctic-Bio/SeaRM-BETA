import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/auth"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.crew_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { document_id, signature_name } = await req.json()
    if (!document_id || !signature_name?.trim()) {
      return NextResponse.json({ error: "Document ID and typed signature name are required" }, { status: 400 })
    }

    // Verify the document belongs to this crew member and requires signature
    const docs = await sql`
      SELECT id, requires_signature, signed_by FROM file_storage 
      WHERE id = ${document_id} AND crew_id = ${session.crew_id}
    `
    if (!docs.length) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    if (!docs[0].requires_signature) return NextResponse.json({ error: "Document does not require signature" }, { status: 400 })
    if (docs[0].signed_by) return NextResponse.json({ error: "Already signed" }, { status: 400 })

    await sql`
      UPDATE file_storage 
      SET signed_by = ${session.id}, signed_at = now(), signature_name = ${signature_name.trim()}
      WHERE id = ${document_id}
    `

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
