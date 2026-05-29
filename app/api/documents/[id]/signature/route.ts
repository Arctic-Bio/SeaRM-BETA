import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb()
    const { id } = await params
    const rows = await sql`
      SELECT signature_image, signature_type, signature_name
      FROM file_storage
      WHERE id = ${id} AND signed_by IS NOT NULL
    `
    if (!rows.length) return NextResponse.json({ error: "No signature found" }, { status: 404 })

    const doc = rows[0]
    return NextResponse.json({
      signature_type: doc.signature_type || "typed",
      signature_name: doc.signature_name,
      signature_image: doc.signature_image || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
