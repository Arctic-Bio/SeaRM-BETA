import { getDb, SKILL_FIELDS } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Scores crew members against a position's required skills, department, and availability
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const sql = getDb()

    // Get the position with its voyage dates
    const positions = await sql`
      SELECT cp.*, v.departure_date, v.return_date, v.voyage_name
      FROM crew_positions cp
      LEFT JOIN voyages v ON v.id = cp.voyage_id
      WHERE cp.id = ${id}
    `
    if (!positions.length) return NextResponse.json({ error: "Position not found" }, { status: 404 })
    const position = positions[0]

    const requiredSkills: { skill: string; level: string }[] =
      typeof position.required_skills === "string"
        ? JSON.parse(position.required_skills)
        : position.required_skills ?? []

    // Get all crew who are not rejected and not already assigned to this position
    const crew = await sql`
      SELECT id, first_name, last_name, email, status, rating, country,
        department_preference, availability_start_date, duration, maritime_qualifications,
        skill_small_boats, skill_engineering, skill_mechanical, skill_scuba_diving,
        skill_electrical, skill_electronics, skill_cooking, skill_media,
        skill_drone, skill_photography, skill_videography, skill_medical,
        skill_welding, skill_crane_operation, skill_biology_science
      FROM crew
      WHERE status != 'rejected'
      ORDER BY rating DESC, created_at DESC
    `

    const levelOrder: Record<string, number> = { "": 0, "Basic": 1, "Experienced": 2, "Professional": 3 }

    const scored = crew.map((c: any) => {
      let score = 0
      let maxScore = 0
      const skillMatches: { skill: string; required: string; has: string; met: boolean }[] = []

      // Score each required skill
      for (const req of requiredSkills) {
        const field = SKILL_FIELDS.find((f) => f.label === req.skill || f.key === req.skill)
        if (!field) continue
        const crewLevel = c[field.key] || ""
        const reqLevel = req.level || position.min_skill_level || "Basic"
        const crewScore = levelOrder[crewLevel] ?? 0
        const reqScore = levelOrder[reqLevel] ?? 1
        const met = crewScore >= reqScore
        maxScore += 3
        if (met) score += crewScore
        skillMatches.push({ skill: field.label, required: reqLevel, has: crewLevel || "None", met })
      }

      // Department match bonus
      if (position.department && c.department_preference) {
        maxScore += 2
        if (c.department_preference.toLowerCase().includes(position.department.toLowerCase())) score += 2
      }

      // Maritime quals bonus
      if (c.maritime_qualifications && c.maritime_qualifications.toLowerCase() !== "no") {
        score += 1
        maxScore += 1
      } else {
        maxScore += 1
      }

      // Rating bonus
      score += (c.rating || 0) * 0.5
      maxScore += 2.5

      const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

      return {
        crew_id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        status: c.status,
        rating: c.rating,
        country: c.country,
        department_preference: c.department_preference,
        availability_start_date: c.availability_start_date,
        maritime_qualifications: c.maritime_qualifications,
        match_score: pct,
        skill_matches: skillMatches,
      }
    })

    // Sort by match score descending, return top 20
    scored.sort((a: any, b: any) => b.match_score - a.match_score)

    return NextResponse.json({
      position,
      candidates: scored.slice(0, 20),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
