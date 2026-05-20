import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()
    const tags = await sql`SELECT * FROM crew_tags WHERE crew_id = ${id} ORDER BY tag`
    return NextResponse.json(tags)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { tag } = await req.json()
    if (!tag || typeof tag !== "string") return NextResponse.json({ error: "Tag required" }, { status: 400 })
    const sql = getDb()
    const result = await sql`
      INSERT INTO crew_tags (crew_id, tag) VALUES (${id}, ${tag.trim().toLowerCase()})
      ON CONFLICT (crew_id, tag) DO NOTHING
      RETURNING *
    `
    return NextResponse.json(result[0] ?? { crew_id: id, tag: tag.trim().toLowerCase() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { tag } = await req.json()
    const sql = getDb()
    await sql`DELETE FROM crew_tags WHERE crew_id = ${id} AND tag = ${tag}`
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
