import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const crewId = req.nextUrl.searchParams.get("crew_id")
    const shipId = req.nextUrl.searchParams.get("ship_id")
    const expiring = req.nextUrl.searchParams.get("expiring") // days
    let query = `SELECT id, crew_id, ship_id, document_type, file_name, mime_type, file_size, uploaded_by, verified, verified_by, verified_at, expiry_date, notes, created_at, requires_signature, signed_by, signed_at, signature_name, signature_type FROM file_storage WHERE 1=1`
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
    const sql = getDb()
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

    const result = await sql.query(`
      INSERT INTO file_storage (crew_id, ship_id, document_type, file_name, mime_type, file_size, file_data, uploaded_by, expiry_date, notes, requires_signature)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, crew_id, ship_id, document_type, file_name, mime_type, file_size, uploaded_by, verified, expiry_date, notes, created_at, requires_signature
    `, [crewId || null, shipId || null, docType, file.name, file.type, file.size, buffer, uploadedBy, expiryDate || null, notes, requiresSignature])
    return NextResponse.json(result[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sql = getDb()
    const { id, document_type, expiry_date, verified, notes } = await req.json()
    
    if (!id) return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    
    const updates: string[] = []
    const params: any[] = []
    let paramIdx = 1
    
    if (document_type !== undefined) {
      updates.push(`document_type = $${paramIdx}`)
      params.push(document_type)
      paramIdx++
    }
    if (expiry_date !== undefined) {
      updates.push(`expiry_date = $${paramIdx}`)
      params.push(expiry_date || null)
      paramIdx++
    }
    if (verified !== undefined) {
      updates.push(`verified = $${paramIdx}`)
      params.push(verified)
      paramIdx++
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIdx}`)
      params.push(notes)
      paramIdx++
    }
    
    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    
    params.push(id)
    const query = `UPDATE file_storage SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`
    const result = await sql.query(query, params)
    
    return NextResponse.json(result[0] || { error: "Document not found" }, { status: result[0] ? 200 : 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
