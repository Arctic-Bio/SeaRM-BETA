import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return ""
  const keys = columns || Object.keys(rows[0])
  const header = keys.map(escapeCSV).join(",")
  const lines = rows.map((row) => keys.map((k) => escapeCSV(row[k])).join(","))
  return [header, ...lines].join("\n")
}

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = req.nextUrl
    const type = searchParams.get("type") || "crew"
    const format = searchParams.get("format") || "csv"
    const status = searchParams.get("status") || ""

    let rows: any[] = []
    let filename = ""

    switch (type) {
      case "crew": {
        const statusFilter = status ? `WHERE c.status = '${status.replace(/'/g, "''")}'` : ""
        rows = await sql.query(`
          SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.status, c.rating,
            c.gender, c.country, c.city, c.date_of_birth, c.current_occupation,
            c.availability_start_date, c.duration, c.languages, c.maritime_qualifications,
            c.department_preference, c.has_criminal_record,
            c.skill_small_boats, c.skill_engineering, c.skill_mechanical, c.skill_scuba_diving,
            c.skill_electrical, c.skill_electronics, c.skill_cooking, c.skill_media,
            c.skill_drone, c.skill_photography, c.skill_videography, c.skill_medical,
            c.skill_welding, c.skill_crane_operation, c.skill_biology_science,
            c.notes, c.created_at, c.updated_at
          FROM crew_applications c ${statusFilter}
          ORDER BY c.created_at DESC
        `)
        filename = "crew_applications"
        break
      }
      case "ships": {
        rows = await sql`
          SELECT id, name, type, flag, imo_number, call_sign, mmsi, length_m, beam_m, draft_m,
            gross_tonnage, crew_capacity, year_built, hull_material, engine_type, max_speed_knots,
            home_port, status, notes, created_at, updated_at
          FROM ships ORDER BY name
        `
        filename = "ships"
        break
      }
      case "voyages": {
        rows = await sql`
          SELECT v.id, v.voyage_name, s.name as ship_name, v.departure_port, v.destination_port,
            v.departure_date, v.return_date, v.status, v.mission_type, v.mission_objectives, v.notes,
            v.created_at, v.updated_at
          FROM voyages v LEFT JOIN ships s ON s.id = v.ship_id
          ORDER BY v.created_at DESC
        `
        filename = "voyages"
        break
      }
      case "positions": {
        rows = await sql`
          SELECT cp.id, cp.position_name, cp.department, cp.status, cp.priority, cp.min_skill_level,
            cp.required_skills, cp.notes,
            v.voyage_name, s.name as ship_name,
            ca.first_name as assigned_first_name, ca.last_name as assigned_last_name,
            cp.created_at, cp.updated_at
          FROM crew_positions cp
          LEFT JOIN voyages v ON v.id = cp.voyage_id
          LEFT JOIN ships s ON s.id = v.ship_id
          LEFT JOIN crew_applications ca ON ca.id = cp.assigned_crew_id
          ORDER BY cp.created_at DESC
        `
        filename = "positions"
        break
      }
      case "tasks": {
        rows = await sql`
          SELECT t.id, t.title, t.description, t.task_type, t.status, t.priority,
            t.due_date, t.assigned_to, t.completed_at,
            ca.first_name as crew_first_name, ca.last_name as crew_last_name,
            v.voyage_name, s.name as ship_name,
            t.created_at, t.updated_at
          FROM tasks t
          LEFT JOIN crew_applications ca ON ca.id = t.crew_id
          LEFT JOIN voyages v ON v.id = t.voyage_id
          LEFT JOIN ships s ON s.id = t.ship_id
          ORDER BY t.created_at DESC
        `
        filename = "tasks"
        break
      }
      case "assignments": {
        rows = await sql`
          SELECT ca2.id, cr.first_name, cr.last_name, cr.email,
            ca2.role, ca2.department, ca2.status, ca2.days_at_sea,
            ca2.sign_on_date, ca2.sign_off_date,
            v.voyage_name, s.name as ship_name,
            ca2.crew_review, ca2.crew_review_rating,
            ca2.created_at, ca2.updated_at
          FROM crew_assignments ca2
          INNER JOIN crew_applications cr ON cr.id = ca2.crew_id
          LEFT JOIN voyages v ON v.id = ca2.voyage_id
          LEFT JOIN ships s ON s.id = v.ship_id
          ORDER BY ca2.created_at DESC
        `
        filename = "assignments"
        break
      }
      case "sea_time": {
        rows = await sql`
          SELECT st.id, ca.first_name, ca.last_name, ca.email,
            st.role, st.embarked_at, st.disembarked_at, st.days, st.notes,
            v.voyage_name, s.name as ship_name,
            st.created_at
          FROM crew_sea_time st
          INNER JOIN crew_applications ca ON ca.id = st.crew_id
          LEFT JOIN voyages v ON v.id = st.voyage_id
          LEFT JOIN ships s ON s.id = st.ship_id
          ORDER BY st.created_at DESC
        `
        filename = "sea_time"
        break
      }
      case "maintenance": {
        rows = await sql`
          SELECT sm.id, s.name as ship_name, sm.title, sm.category, sm.status, sm.priority,
            sm.description, sm.scheduled_date, sm.completed_date, sm.cost,
            sm.performed_by, sm.notes, sm.created_at
          FROM ship_maintenance sm
          INNER JOIN ships s ON s.id = sm.ship_id
          ORDER BY sm.created_at DESC
        `
        filename = "maintenance"
        break
      }
      default:
        return NextResponse.json({ error: "Unknown export type" }, { status: 400 })
    }

    if (format === "json") {
      return NextResponse.json(rows, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    // CSV
    const csv = toCSV(rows)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
