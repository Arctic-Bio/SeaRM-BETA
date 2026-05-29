import { NextRequest, NextResponse } from "next/server"
import { getDb, CSV_SKILL_MAP } from "@/lib/db"
import { v4Fallback } from "@/lib/uuid"

interface ParsedRow {
  [key: string]: string
}

function extractSkillLevel(row: ParsedRow, skillName: string): string {
  // Look for column that contains the skill name in "Skills and Experience [...]"
  for (const [key, value] of Object.entries(row)) {
    if (
      key.startsWith("Skills and Experience") &&
      key.includes(`[${skillName}]`)
    ) {
      const cleaned = (value || "").trim()
      // Handle comma-separated values like "Basic, Experienced"
      if (cleaned.includes(",")) {
        const parts = cleaned.split(",").map((s) => s.trim())
        // Return the highest skill level
        const levels = ["Basic", "Experienced", "Professional"]
        let highest = ""
        for (const level of levels) {
          if (parts.includes(level)) highest = level
        }
        return highest || cleaned
      }
      return cleaned
    }
  }
  return ""
}

function getFieldValue(row: ParsedRow, ...possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    // Exact match first
    if (row[key] !== undefined && row[key] !== "") return row[key].trim()
    // Case-insensitive match
    const lowerKey = key.toLowerCase()
    for (const [k, v] of Object.entries(row)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== "") {
        return v.trim()
      }
    }
  }
  return ""
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rows, headers } = body as { rows: ParsedRow[]; headers: string[] }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows provided" },
        { status: 400 }
      )
    }

    const sql = getDb()
    const batchId = v4Fallback()

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const firstName = getFieldValue(row, "First Name")
        const lastName = getFieldValue(row, "Last Name")
        const email = getFieldValue(row, "Email Address", "Email")
        const phone = getFieldValue(row, "Phone Number")

        // Skip rows without meaningful data
        if (!firstName && !lastName && !email) {
          skipped++
          continue
        }

        const gender = getFieldValue(row, "Gender")
        const country = getFieldValue(row, "Country")
        const city = getFieldValue(row, "City")
        const dob = getFieldValue(row, "Date of Birth")
        const occupation = getFieldValue(row, "Current Occupation")
        const availDate = getFieldValue(
          row,
          "Approximate Availability Start Date"
        )
        const duration = getFieldValue(row, "Duration (weeks, months)")
        const languages = getFieldValue(row, "Check All Languages of Fluency")
        const otherLangs = getFieldValue(
          row,
          "List any other languages of proficiency"
        )
        const allLanguages = [languages, otherLangs]
          .filter(Boolean)
          .join(", ")
        const maritimeQuals = getFieldValue(
          row,
          "Do you have Professional Maritime Qualifications"
        )
        const deptPref = getFieldValue(
          row,
          "If selected which department would you like to be considered for?"
        )
        const criminalRecord =
          getFieldValue(
            row,
            "Do you have a Criminal Record or any convictions?"
          ).toLowerCase() === "yes"

        // Extract skill levels
        const skills: Record<string, string> = {}
        for (const [csvSkillName, dbField] of Object.entries(CSV_SKILL_MAP)) {
          skills[dbField] = extractSkillLevel(row, csvSkillName)
        }

        // Store full form data as JSON
        const applicationData: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          if (value && value.trim()) {
            applicationData[key] = value.trim()
          }
        }

        await sql`
          INSERT INTO crew (
            first_name, last_name, email, phone,
            gender, country, city, date_of_birth,
            current_occupation, availability_start_date, duration,
            languages, maritime_qualifications, department_preference,
            has_criminal_record,
            skill_small_boats, skill_engineering, skill_mechanical,
            skill_scuba_diving, skill_electrical, skill_electronics,
            skill_cooking, skill_media, skill_drone,
            skill_photography, skill_videography, skill_medical,
            skill_welding, skill_crane_operation, skill_biology_science,
            application_data, upload_batch_id, csv_row_number,
            status
          ) VALUES (
            ${firstName}, ${lastName}, ${email}, ${phone},
            ${gender}, ${country}, ${city}, ${dob},
            ${occupation}, ${availDate}, ${duration},
            ${allLanguages}, ${maritimeQuals}, ${deptPref},
            ${criminalRecord},
            ${skills.skill_small_boats || ""},
            ${skills.skill_engineering || ""},
            ${skills.skill_mechanical || ""},
            ${skills.skill_scuba_diving || ""},
            ${skills.skill_electrical || ""},
            ${skills.skill_electronics || ""},
            ${skills.skill_cooking || ""},
            ${skills.skill_media || ""},
            ${skills.skill_drone || ""},
            ${skills.skill_photography || ""},
            ${skills.skill_videography || ""},
            ${skills.skill_medical || ""},
            ${skills.skill_welding || ""},
            ${skills.skill_crane_operation || ""},
            ${skills.skill_biology_science || ""},
            ${JSON.stringify(applicationData)},
            ${batchId},
            ${i + 1},
            'application'
          )
        `

        inserted++
      } catch (rowError) {
        const msg =
          rowError instanceof Error ? rowError.message : "Unknown error"
        errors.push(`Row ${i + 1}: ${msg}`)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: rows.length,
      batchId,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
