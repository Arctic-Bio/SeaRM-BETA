import { getDb } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = typeof value === "object" ? JSON.stringify(value) : String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const keys = Object.keys(rows[0])
  const header = keys.map(escapeCSV).join(",")
  const lines = rows.map((row) => keys.map((k) => escapeCSV(row[k])).join(","))
  return [header, ...lines].join("\n")
}

// All exportable tables with their queries (JOINed where useful)
const EXPORT_QUERIES: Record<string, string> = {
  crew: `
    SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.status, c.rating,
      c.gender, c.pronouns, c.country, c.city, c.date_of_birth, c.current_occupation,
      c.availability_start_date, c.availability_end_date, c.duration,
      c.languages, c.maritime_qualifications, c.department_preference,
      c.has_criminal_record, c.position_id, c.preferred_position_id,
      c.skill_small_boats, c.skill_engineering, c.skill_mechanical, c.skill_scuba_diving,
      c.skill_electrical, c.skill_electronics, c.skill_cooking, c.skill_media,
      c.skill_drone, c.skill_photography, c.skill_videography, c.skill_medical,
      c.skill_welding, c.skill_crane_operation, c.skill_biology_science,
      c.notes, c.upload_batch_id, c.csv_row_number, c.created_at, c.updated_at
    FROM crew c ORDER BY c.created_at DESC`,
  ships: `
    SELECT id, name, type, flag, imo_number, call_sign, mmsi, length_m, beam_m, draft_m,
      gross_tonnage, crew_capacity, year_built, hull_material, engine_type, max_speed_knots,
      home_port, status, notes, created_at, updated_at
    FROM ships ORDER BY name`,
  voyages: `
    SELECT v.id, v.voyage_name, s.name as ship_name, v.departure_port, v.destination_port,
      v.departure_date, v.return_date, v.status, v.mission_type, v.mission_objectives, v.notes,
      v.created_at, v.updated_at
    FROM voyages v LEFT JOIN ships s ON s.id = v.ship_id
    ORDER BY v.created_at DESC`,
  positions: `
    SELECT cp.id, p.id as position_id, p.name, p.department, cp.status, cp.priority, p.required_certifications,
      cp.required_skills, cp.notes,
      v.voyage_name, s.name as ship_name,
      ca.first_name as assigned_first_name, ca.last_name as assigned_last_name,
      cp.created_at, cp.updated_at
    FROM crew_positions cp
    LEFT JOIN positions p ON p.id = cp.position_id
    LEFT JOIN voyages v ON v.id = cp.voyage_id
    LEFT JOIN ships s ON s.id = cp.ship_id
    LEFT JOIN crew ca ON ca.id = cp.assigned_crew_id
    ORDER BY cp.created_at DESC`,
  tasks: `
    SELECT t.id, t.title, t.description, t.task_type, t.status, t.priority,
      t.due_date, t.assigned_to, t.completed_at,
      ca.first_name as crew_first_name, ca.last_name as crew_last_name,
      v.voyage_name, s.name as ship_name,
      t.created_at, t.updated_at
    FROM tasks t
    LEFT JOIN crew ca ON ca.id = t.crew_id
    LEFT JOIN voyages v ON v.id = t.voyage_id
    LEFT JOIN ships s ON s.id = t.ship_id
    ORDER BY t.created_at DESC`,
  assignments: `
    SELECT ca2.id, cr.first_name, cr.last_name, cr.email,
      ca2.role, ca2.department, ca2.status, ca2.days_at_sea,
      ca2.expected_join_date, ca2.actual_join_date,
      ca2.expected_departure_date, ca2.actual_departure_date,
      ca2.sign_on_date, ca2.sign_off_date,
      v.voyage_name, s.name as ship_name,
      ca2.crew_review, ca2.crew_review_rating, ca2.reviewed_by,
      ca2.notes, ca2.created_at, ca2.updated_at
    FROM crew_assignments ca2
    INNER JOIN crew cr ON cr.id = ca2.crew_id
    LEFT JOIN voyages v ON v.id = ca2.voyage_id
    LEFT JOIN ships s ON s.id = v.ship_id
    ORDER BY ca2.created_at DESC`,
  sea_time: `
    SELECT st.id, ca.first_name, ca.last_name, ca.email,
      st.role, st.embarked_at, st.disembarked_at, st.days, st.notes,
      v.voyage_name, s.name as ship_name,
      st.created_at
    FROM crew_sea_time st
    INNER JOIN crew ca ON ca.id = st.crew_id
    LEFT JOIN voyages v ON v.id = st.voyage_id
    LEFT JOIN ships s ON s.id = st.ship_id
    ORDER BY st.created_at DESC`,
  incidents: `
    SELECT i.id, i.title, i.description, i.category, i.severity, i.status,
      i.location, i.occurred_at, i.reported_by,
      i.corrective_actions, i.follow_up, i.crew_involved,
      v.voyage_name, s.name as ship_name,
      i.created_at, i.updated_at
    FROM incidents i
    LEFT JOIN voyages v ON v.id = i.voyage_id
    LEFT JOIN ships s ON s.id = i.ship_id
    ORDER BY i.created_at DESC`,
  activities: `
    SELECT a.id, a.activity_type, a.title, a.description, a.actor_name,
      ca.first_name as crew_first_name, ca.last_name as crew_last_name,
      v.voyage_name, s.name as ship_name,
      a.metadata, a.created_at
    FROM activities a
    LEFT JOIN crew ca ON ca.id = a.crew_id
    LEFT JOIN voyages v ON v.id = a.voyage_id
    LEFT JOIN ships s ON s.id = a.ship_id
    ORDER BY a.created_at DESC`,
  crew_checkins: `
    SELECT cc.id, ca.first_name, ca.last_name,
      cc.check_type, cc.checked_at, cc.location, cc.recorded_by, cc.notes,
      v.voyage_name, s.name as ship_name,
      cc.created_at
    FROM crew_checkins cc
    INNER JOIN crew ca ON ca.id = cc.crew_id
    LEFT JOIN voyages v ON v.id = cc.voyage_id
    LEFT JOIN ships s ON s.id = cc.ship_id
    ORDER BY cc.created_at DESC`,
  crew_tags: `
    SELECT ct.id, ca.first_name, ca.last_name, ca.email,
      ct.tag, ct.created_at
    FROM crew_tags ct
    INNER JOIN crew ca ON ca.id = ct.crew_id
    ORDER BY ct.created_at DESC`,
  documents: `
    SELECT d.id, d.file_name, d.document_type, d.file_url, d.file_size, d.mime_type,
      ca.first_name as crew_first_name, ca.last_name as crew_last_name,
      s.name as ship_name,
      d.uploaded_by, d.expiry_date, d.verified, d.verified_by, d.verified_at,
      d.notes, d.created_at
    FROM documents d
    LEFT JOIN crew ca ON ca.id = d.crew_id
    LEFT JOIN ships s ON s.id = d.ship_id
    ORDER BY d.created_at DESC`,
  onboarding: `
    SELECT oc.id, ca.first_name, ca.last_name,
      oc.template_name, oc.status, oc.progress,
      v.voyage_name,
      oc.created_at, oc.updated_at
    FROM onboarding_checklists oc
    INNER JOIN crew ca ON ca.id = oc.crew_id
    LEFT JOIN voyages v ON v.id = oc.voyage_id
    ORDER BY oc.created_at DESC`,
  maintenance: `
    SELECT sm.id, s.name as ship_name, sm.title, sm.category, sm.status, sm.priority,
      sm.description, sm.scheduled_date, sm.completed_date, sm.cost,
      sm.performed_by, sm.notes, sm.created_at
    FROM ship_maintenance sm
    INNER JOIN ships s ON s.id = sm.ship_id
    ORDER BY sm.created_at DESC`,
  supplies: `
    SELECT ss.id, s.name as ship_name, ss.item_name, ss.category, ss.quantity,
      ss.unit, ss.min_quantity, ss.status, ss.supplier, ss.cost_per_unit,
      ss.last_restocked, ss.expiry_date, ss.notes, ss.created_at, ss.updated_at
    FROM ship_supplies ss
    INNER JOIN ships s ON s.id = ss.ship_id
    ORDER BY ss.created_at DESC`,
  widgets: `
    SELECT id, name, slug, description, data_source, view_type, style_preset,
      max_rows, is_active, is_public, total_views,
      rate_limit_per_min, allowed_domains,
      created_by, created_at, updated_at
    FROM widgets ORDER BY created_at DESC`,
  email_templates: `
    SELECT id, name, subject, body, category, variables, is_active,
      created_at, updated_at
    FROM email_templates ORDER BY created_at DESC`,
  email_queue: `
    SELECT eq.id, eq.to_email, eq.subject, eq.status, eq.sent_at, eq.error,
      et.name as template_name,
      eq.created_at
    FROM email_queue eq
    LEFT JOIN email_templates et ON et.id = eq.template_id
    ORDER BY eq.created_at DESC`,
  users: `
    SELECT id, name, email, role, created_at, updated_at
    FROM users ORDER BY created_at DESC`,
  invoices: `
    SELECT ci.id, ci.invoice_number, ci.crew_id,
      cr.first_name as crew_first_name, cr.last_name as crew_last_name,
      ci.status, ci.currency, ci.subtotal, ci.tax_amount, ci.total,
      ci.issue_date, ci.due_date, ci.paid_date,
      ci.notes, ci.created_at, ci.updated_at
    FROM crew_invoices ci
    LEFT JOIN crew cr ON cr.id = ci.crew_id
    ORDER BY ci.created_at DESC`,
  invoice_items: `
    SELECT ili.id, ili.invoice_id, ili.description, ili.quantity,
      ili.unit_price, ili.total, ili.category,
      ili.created_at
    FROM invoice_line_items ili
    ORDER BY ili.created_at DESC`,
  saved_views: `
    SELECT id, name, description, filters, sort_config, visible_columns,
      is_default, created_by, created_at, updated_at
    FROM saved_views ORDER BY created_at DESC`,
  roles_permissions: `
    SELECT r.id, r.name as role_name, r.description,
      rp.permission, rp.granted
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    ORDER BY r.name, rp.permission`,
  countries: `
    SELECT id, name, code, region
    FROM countries ORDER BY name`,
  site_settings: `
    SELECT key, value, updated_at
    FROM site_settings ORDER BY key`,
  file_storage: `
    SELECT id, file_name, file_type, file_size, storage_key, context, entity_id,
      uploaded_by, created_at
    FROM file_storage ORDER BY created_at DESC`,
  hourly_logs: `
    SELECT hl.id, hl.crew_id,
      cr.first_name as crew_first_name, cr.last_name as crew_last_name,
      hl.log_date, hl.hours, hl.description, hl.category,
      hl.created_at
    FROM crew_hourly_logs hl
    LEFT JOIN crew cr ON cr.id = hl.crew_id
    ORDER BY hl.created_at DESC`,
}

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = req.nextUrl
    const type = searchParams.get("type") || "crew"
    const format = searchParams.get("format") || "csv"

    const query = EXPORT_QUERIES[type]
    if (!query) {
      return NextResponse.json({ error: `Unknown export type: ${type}. Available: ${Object.keys(EXPORT_QUERIES).join(", ")}` }, { status: 400 })
    }

    let rows: Record<string, unknown>[]
    try {
      rows = await sql.query(query) as Record<string, unknown>[]
    } catch (e: any) {
      // If a table doesn't exist (e.g. ship_supplies), return empty
      if (e.message?.includes("does not exist")) {
        rows = []
      } else {
        throw e
      }
    }

    const filename = `${type}_${new Date().toISOString().slice(0, 10)}`

    if (format === "json") {
      return NextResponse.json(rows, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      })
    }

    const csv = rows.length ? toCSV(rows) : "No data"
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
