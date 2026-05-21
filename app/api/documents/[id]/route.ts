import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const inline = req.nextUrl.searchParams.get("inline") === "true"
    const rows = await sql`SELECT file_data, file_name, mime_type, global_source_id FROM file_storage WHERE id = ${id}`
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
    let doc = rows[0]
    // If this is a crew copy of a global doc, serve the file from the global source
    if (!doc.file_data && doc.global_source_id) {
      const sourceRows = await sql`SELECT file_data, file_name, mime_type FROM file_storage WHERE id = ${doc.global_source_id}`
      if (sourceRows.length) doc = { ...doc, file_data: sourceRows[0].file_data, file_name: sourceRows[0].file_name, mime_type: sourceRows[0].mime_type }
    }
    // file_data comes back as a hex string from neon -- convert to buffer
    let buffer: Buffer
    if (typeof doc.file_data === "string") {
      const hex = (doc.file_data as string).startsWith("\\x")
        ? (doc.file_data as string).slice(2)
        : doc.file_data as string
      buffer = Buffer.from(hex, "hex")
    } else {
      buffer = Buffer.from(doc.file_data as any)
    }
    const disposition = inline ? "inline" : `attachment; filename="${doc.file_name}"`
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime_type as string || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updates: string[] = []
    const values: any[] = []
    let idx = 0
    if (body.verified !== undefined) { idx++; updates.push(`verified = $${idx}`); values.push(body.verified) }
    if (body.verified_by) { idx++; updates.push(`verified_by = $${idx}`); values.push(body.verified_by) }
    if (body.verified) { updates.push(`verified_at = now()`) }
    if (body.expiry_date !== undefined) { idx++; updates.push(`expiry_date = $${idx}`); values.push(body.expiry_date || null) }
    if (body.notes !== undefined) { idx++; updates.push(`notes = $${idx}`); values.push(body.notes) }
    if (!updates.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    idx++; values.push(id)
    await sql.query(`UPDATE file_storage SET ${updates.join(", ")} WHERE id = $${idx}`, values)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM file_storage WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
