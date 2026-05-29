import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// GET: List all global position definitions
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const department = searchParams.get("department")
  const activeOnly = searchParams.get("active") !== "false"

  if (department) {
    const rows = await sql`
      SELECT * FROM positions 
      WHERE department = ${department} AND (${!activeOnly} OR is_active = true)
      ORDER BY sort_order, name
    `
    return NextResponse.json(rows)
  }

  const rows = await sql`
    SELECT * FROM positions 
    WHERE ${!activeOnly} OR is_active = true
    ORDER BY sort_order, name
  `
  return NextResponse.json(rows)
}

// POST: Create a new global position
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { name, department, description, required_certifications, required_skills, min_experience_months, is_officer, sort_order } = body

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const result = await sql`
      INSERT INTO positions (name, department, description, required_certifications, required_skills, min_experience_months, is_officer, sort_order)
      VALUES (
        ${name}, 
        ${department || null}, 
        ${description || null}, 
        ${JSON.stringify(required_certifications || [])}::jsonb, 
        ${JSON.stringify(required_skills || [])}::jsonb, 
        ${min_experience_months || 0}, 
        ${is_officer || false}, 
        ${sort_order || 0}
      )
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Position name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// PUT: Update a global position
export async function PUT(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const body = await req.json()
  const { id, name, department, description, required_certifications, required_skills, min_experience_months, is_officer, is_active, sort_order } = body

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const result = await sql`
    UPDATE positions SET
      name = COALESCE(${name || null}, name),
      department = COALESCE(${department || null}, department),
      description = COALESCE(${description || null}, description),
      required_certifications = COALESCE(${required_certifications ? JSON.stringify(required_certifications) : null}::jsonb, required_certifications),
      required_skills = COALESCE(${required_skills ? JSON.stringify(required_skills) : null}::jsonb, required_skills),
      min_experience_months = COALESCE(${min_experience_months ?? null}, min_experience_months),
      is_officer = COALESCE(${is_officer ?? null}, is_officer),
      is_active = COALESCE(${is_active ?? null}, is_active),
      sort_order = COALESCE(${sort_order ?? null}, sort_order),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(result[0])
}

// DELETE: Deactivate a position (soft delete)
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || !["sysadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = getDb()
  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await sql`UPDATE positions SET is_active = false, updated_at = NOW() WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
