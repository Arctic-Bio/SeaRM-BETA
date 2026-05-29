import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"


const STANDARD_TEMPLATE = [
  { key: "passport_verified", label: "Passport Verified", done: false },
  { key: "medical_cleared", label: "Medical Clearance", done: false },
  { key: "stcw_confirmed", label: "STCW Certificates Confirmed", done: false },
  { key: "background_check", label: "Background Check Completed", done: false },
  { key: "visa_check", label: "Visa / Entry Requirements Checked", done: false },
  { key: "travel_booked", label: "Travel Arrangements Booked", done: false },
  { key: "welcome_guide_sent", label: "Welcome Guide Sent", done: false },
  { key: "crew_forms_signed", label: "Crew Forms Signed", done: false },
  { key: "emergency_contact", label: "Emergency Contact Provided", done: false },
  { key: "safety_briefing", label: "Safety Briefing Scheduled", done: false },
]

const TEMPLATES: Record<string, { key: string; label: string; done: boolean }[]> = {
  "Standard Onboarding": STANDARD_TEMPLATE,
  "Volunteer Onboarding": [
    ...STANDARD_TEMPLATE.filter((i) => !["stcw_confirmed", "visa_check"].includes(i.key)),
    { key: "volunteer_agreement", label: "Volunteer Agreement Signed", done: false },
    { key: "orientation_video", label: "Orientation Video Watched", done: false },
  ],
  "Officer Onboarding": [
    ...STANDARD_TEMPLATE,
    { key: "license_verified", label: "Officer License Verified", done: false },
    { key: "bridge_familiarization", label: "Bridge Familiarization Complete", done: false },
    { key: "command_briefing", label: "Command Briefing Complete", done: false },
  ],
}

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const crewId = req.nextUrl.searchParams.get("crew_id")
    const voyageId = req.nextUrl.searchParams.get("voyage_id")
    let query = `SELECT cl.*, ca.first_name, ca.last_name, v.voyage_name
      FROM onboarding_checklists cl
      LEFT JOIN crew ca ON cl.crew_id = ca.id
      LEFT JOIN voyages v ON cl.voyage_id = v.id WHERE 1=1`
    const params: any[] = []
    let idx = 0
    if (crewId) { idx++; query += ` AND cl.crew_id = $${idx}`; params.push(crewId) }
    if (voyageId) { idx++; query += ` AND cl.voyage_id = $${idx}`; params.push(voyageId) }
    query += ` ORDER BY cl.created_at DESC`
    const rows = params.length > 0 ? await sql.query(query, params) : await sql.query(query)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb()
    const body = await req.json()
    if (!body.crew_id) {
      return NextResponse.json({ error: "crew_id is required" }, { status: 400 })
    }
    const templateName = body.template_name || "Standard Onboarding"
    const items = TEMPLATES[templateName] || STANDARD_TEMPLATE
    const itemsJson = JSON.stringify(items)
    const voyageId = body.voyage_id || null

    const result = await sql.query(
      `INSERT INTO onboarding_checklists (crew_id, voyage_id, template_name, items, progress, status)
       VALUES ($1::uuid, $2::uuid, $3, $4::jsonb, 0, 'pending')
       RETURNING *`,
      [body.crew_id, voyageId, templateName, itemsJson]
    )

    // Auto-create tasks for each checklist item
    if (body.auto_tasks) {
      for (const item of items) {
        await sql.query(
          `INSERT INTO tasks (crew_id, voyage_id, title, task_type, status, priority)
           VALUES ($1::uuid, $2::uuid, $3, 'general', 'open', 'medium')`,
          [body.crew_id, voyageId, item.label]
        )
      }
    }

    return NextResponse.json(result[0])
  } catch (e: any) {
    console.error("[v0] Checklist creation error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
