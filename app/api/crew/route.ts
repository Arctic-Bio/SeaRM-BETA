import { NextRequest, NextResponse } from "next/server"
import { getDb, SKILL_FIELDS } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)

    // Basic filters
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const country = searchParams.get("country") || ""
    const department = searchParams.get("department") || ""
    const gender = searchParams.get("gender") || ""
    const ratingMin = searchParams.get("ratingMin") || ""
    const ratingMax = searchParams.get("ratingMax") || ""
    const criminalRecord = searchParams.get("criminalRecord") || ""
    const maritimeQuals = searchParams.get("maritimeQuals") || ""

    // Multi-skill filters (comma-separated pairs "skill:level")
    const skills = searchParams.get("skills") || ""

    // Availability range
    const availFrom = searchParams.get("availFrom") || ""
    const availTo = searchParams.get("availTo") || ""

    // Tag filter (comma-separated)
    const tags = searchParams.get("tags") || ""

    // Sort & pagination
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "25")
    const offset = (page - 1) * limit

    // Build WHERE conditions
    const conditions: string[] = []
    const params: unknown[] = []
    let p = 1

    if (search) {
      conditions.push(
        `(LOWER(first_name) LIKE $${p} OR LOWER(last_name) LIKE $${p} OR LOWER(email) LIKE $${p} OR LOWER(first_name || ' ' || last_name) LIKE $${p} OR LOWER(phone) LIKE $${p} OR LOWER(city) LIKE $${p} OR LOWER(current_occupation) LIKE $${p})`
      )
      params.push(`%${search.toLowerCase()}%`)
      p++
    }

    if (status) {
      const statuses = status.split(",").filter(Boolean)
      if (statuses.length === 1) {
        conditions.push(`c.status = $${p}`)
        params.push(statuses[0])
        p++
      } else if (statuses.length > 1) {
        const placeholders = statuses.map((_, i) => `$${p + i}`).join(", ")
        conditions.push(`c.status IN (${placeholders})`)
        statuses.forEach((s) => { params.push(s); p++ })
      }
    }

    if (country) {
      conditions.push(`LOWER(c.country) = $${p}`)
      params.push(country.toLowerCase())
      p++
    }

    if (department) {
      conditions.push(`LOWER(c.department_preference) LIKE $${p}`)
      params.push(`%${department.toLowerCase()}%`)
      p++
    }

    if (gender) {
      conditions.push(`LOWER(c.gender) = $${p}`)
      params.push(gender.toLowerCase())
      p++
    }

    if (ratingMin) {
      conditions.push(`c.rating >= $${p}`)
      params.push(parseInt(ratingMin))
      p++
    }
    if (ratingMax) {
      conditions.push(`c.rating <= $${p}`)
      params.push(parseInt(ratingMax))
      p++
    }

    if (criminalRecord === "yes") {
      conditions.push(`c.has_criminal_record = true`)
    } else if (criminalRecord === "no") {
      conditions.push(`c.has_criminal_record = false`)
    }

    if (maritimeQuals === "yes") {
      conditions.push(`c.maritime_qualifications != '' AND LOWER(c.maritime_qualifications) != 'no'`)
    } else if (maritimeQuals === "no") {
      conditions.push(`(c.maritime_qualifications = '' OR LOWER(c.maritime_qualifications) = 'no')`)
    }

    if (availFrom) {
      conditions.push(`c.availability_start_date >= $${p}`)
      params.push(availFrom)
      p++
    }
    if (availTo) {
      conditions.push(`c.availability_start_date <= $${p}`)
      params.push(availTo)
      p++
    }

    // Multi-skill filter (AND logic): "skill_cooking:Experienced,skill_medical:Professional"
    if (skills) {
      const skillPairs = skills.split(",").filter(Boolean)
      const validKeys = SKILL_FIELDS.map((f) => f.key)
      for (const pair of skillPairs) {
        const [key, level] = pair.split(":")
        if (validKeys.includes(key)) {
          if (level) {
            conditions.push(`c.${key} = $${p}`)
            params.push(level)
            p++
          } else {
            conditions.push(`c.${key} != '' AND c.${key} IS NOT NULL`)
          }
        }
      }
    }

    // Tag filter (AND logic -- crew must have ALL specified tags)
    let tagJoin = ""
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean)
      if (tagList.length > 0) {
        const tagPlaceholders = tagList.map((_, i) => `$${p + i}`).join(", ")
        tagJoin = `INNER JOIN (
          SELECT crew_id FROM crew_tags WHERE tag IN (${tagPlaceholders})
          GROUP BY crew_id HAVING COUNT(DISTINCT tag) = ${tagList.length}
        ) t ON t.crew_id = c.id`
        tagList.forEach((t) => { params.push(t); p++ })
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Validate sort column
    const validSortColumns = [
      "created_at", "first_name", "last_name", "email", "status",
      "rating", "country", "availability_start_date", "updated_at",
    ]
    const safeSort = validSortColumns.includes(sortBy) ? `c.${sortBy}` : "c.created_at"
    const safeOrder = sortOrder === "asc" ? "ASC" : "DESC"

    // Count query
    const countQuery = `SELECT COUNT(DISTINCT c.id) as count FROM crew_applications c ${tagJoin} ${whereClause}`
    const countResult = await sql.query(countQuery, params)
    const total = parseInt(countResult[0].count as string)

    // Data query with tags aggregated
    const dataQuery = `
      SELECT c.id, c.created_at, c.updated_at, c.first_name, c.last_name, c.email, c.phone,
        c.status, c.rating, c.gender, c.country, c.city, c.date_of_birth, c.current_occupation,
        c.availability_start_date, c.duration, c.languages, c.maritime_qualifications,
        c.department_preference, c.has_criminal_record,
        c.skill_small_boats, c.skill_engineering, c.skill_mechanical, c.skill_scuba_diving,
        c.skill_electrical, c.skill_electronics, c.skill_cooking, c.skill_media,
        c.skill_drone, c.skill_photography, c.skill_videography, c.skill_medical,
        c.skill_welding, c.skill_crane_operation, c.skill_biology_science,
        c.notes, c.upload_batch_id, c.csv_row_number,
        COALESCE((SELECT json_agg(ct.tag ORDER BY ct.tag) FROM crew_tags ct WHERE ct.crew_id = c.id), '[]'::json) as tags
      FROM crew_applications c
      ${tagJoin}
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT ${limit} OFFSET ${offset}
    `
    const rows = await sql.query(dataQuery, params)

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sql = getDb()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    await sql`DELETE FROM crew_applications WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
