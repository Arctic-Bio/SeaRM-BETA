import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const crewId = req.nextUrl.searchParams.get("crew_id")
    const shipId = req.nextUrl.searchParams.get("ship_id")
    const expiring = req.nextUrl.searchParams.get("expiring") // days
    let query = `SELECT id, crew_id, ship_id, document_type, file_name, mime_type, file_size, uploaded_by, verified, verified_by, verified_at, expiry_date, notes, created_at, requires_signature, signed_by, signed_at, signature_name FROM file_storage WHERE 1=1`
    const params: any[] = []
    let idx = 0
    if (crewId) { idx++; query += ` AND crew_id = $${idx}`; params.push(crewId) }
    if (shipId) { idx++; query += ` AND ship_id = $${idx}`; params.push(shipId) }
    const unverified = req.nextUrl.searchParams.get("unverified")
    if (unverified === "true") { query += ` AND (verified = false OR verified IS NULL)` }
    if (expiring) {
      idx++
      query += ` AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $${idx}`
      params.push(parseInt(expiring))
    }
    query += ` ORDER BY created_at DESC`
    const rows = params.length > 0 ? await sql.query(query, params) : await sql.query(query)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const crewId = formData.get("crew_id") as string | null
    const shipId = formData.get("ship_id") as string | null
    const docType = formData.get("document_type") as string || "other"
    const expiryDate = formData.get("expiry_date") as string | null
    const notes = formData.get("notes") as string || ""
    const uploadedBy = formData.get("uploaded_by") as string || ""
    const requiresSignature = formData.get("requires_signature") === "true"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await sql`
      INSERT INTO file_storage (crew_id, ship_id, document_type, file_name, mime_type, file_size, file_data, uploaded_by, expiry_date, notes, requires_signature)
      VALUES (${crewId || null}, ${shipId || null}, ${docType}, ${file.name}, ${file.type}, ${file.size}, ${buffer}, ${uploadedBy}, ${expiryDate || null}, ${notes}, ${requiresSignature})
      RETURNING id, crew_id, ship_id, document_type, file_name, mime_type, file_size, uploaded_by, verified, expiry_date, notes, created_at, requires_signature
    `
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
