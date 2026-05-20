import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const result = await sql`
      SELECT * FROM crew_applications WHERE id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    const body = await request.json()

    const { status, rating, notes } = body

    if (status !== undefined) {
      await sql`
        UPDATE crew_applications 
        SET status = ${status}, updated_at = now()
        WHERE id = ${id}
      `
    }

    if (rating !== undefined) {
      await sql`
        UPDATE crew_applications 
        SET rating = ${rating}, updated_at = now()
        WHERE id = ${id}
      `
    }

    if (notes !== undefined) {
      await sql`
        UPDATE crew_applications 
        SET notes = ${notes}, updated_at = now()
        WHERE id = ${id}
      `
    }

    const updated = await sql`
      SELECT * FROM crew_applications WHERE id = ${id}
    `

    return NextResponse.json({ data: updated[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    await sql`DELETE FROM crew_applications WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
