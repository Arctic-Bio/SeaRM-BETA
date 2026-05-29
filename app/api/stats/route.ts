import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()

    // Crew counts
    const [totalResult] = await sql`SELECT COUNT(*) as count FROM crew`

    const statusCounts = await sql`
      SELECT status, COUNT(*) as count 
      FROM crew 
      GROUP BY status 
      ORDER BY count DESC
    `

    const countryCounts = await sql`
      SELECT country, COUNT(*) as count 
      FROM crew 
      WHERE country != '' AND country IS NOT NULL
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 10
    `

    const departmentCounts = await sql`
      SELECT department_preference, COUNT(*) as count 
      FROM crew 
      WHERE department_preference != '' AND department_preference IS NOT NULL
      GROUP BY department_preference 
      ORDER BY count DESC 
      LIMIT 10
    `

    const recentCrewMembers = await sql`
      SELECT id, first_name, last_name, email, status, rating, country, 
             department_preference, created_at
      FROM crew 
      ORDER BY created_at DESC 
      LIMIT 5
    `

    const maritimeQualCounts = await sql`
      SELECT maritime_qualifications, COUNT(*) as count 
      FROM crew 
      WHERE maritime_qualifications != '' AND maritime_qualifications IS NOT NULL
      GROUP BY maritime_qualifications 
      ORDER BY count DESC
    `

    const skillStats = await sql`
      SELECT 
        COUNT(CASE WHEN skill_small_boats != '' THEN 1 END) as small_boats,
        COUNT(CASE WHEN skill_engineering != '' THEN 1 END) as engineering,
        COUNT(CASE WHEN skill_mechanical != '' THEN 1 END) as mechanical,
        COUNT(CASE WHEN skill_scuba_diving != '' THEN 1 END) as scuba_diving,
        COUNT(CASE WHEN skill_electrical != '' THEN 1 END) as electrical,
        COUNT(CASE WHEN skill_electronics != '' THEN 1 END) as electronics,
        COUNT(CASE WHEN skill_cooking != '' THEN 1 END) as cooking,
        COUNT(CASE WHEN skill_media != '' THEN 1 END) as media,
        COUNT(CASE WHEN skill_drone != '' THEN 1 END) as drone,
        COUNT(CASE WHEN skill_photography != '' THEN 1 END) as photography,
        COUNT(CASE WHEN skill_videography != '' THEN 1 END) as videography,
        COUNT(CASE WHEN skill_medical != '' THEN 1 END) as medical,
        COUNT(CASE WHEN skill_welding != '' THEN 1 END) as welding,
        COUNT(CASE WHEN skill_crane_operation != '' THEN 1 END) as crane_operation,
        COUNT(CASE WHEN skill_biology_science != '' THEN 1 END) as biology_science
      FROM crew
    `

    // Fleet stats
    const [shipCount] = await sql`SELECT COUNT(*) as count FROM ships`
    const [activeVoyageCount] = await sql`
      SELECT COUNT(*) as count FROM voyages WHERE status = 'active'
    `
    const [totalVoyageCount] = await sql`SELECT COUNT(*) as count FROM voyages`

    // Open tasks (not completed/cancelled)
    const [openTaskCount] = await sql`
      SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('completed', 'cancelled')
    `

    // Upcoming tasks ordered by priority
    const upcomingTasks = await sql`
      SELECT t.id, t.title, t.priority, t.status, t.due_date, t.task_type,
             ca.first_name, ca.last_name
      FROM tasks t
      LEFT JOIN crew ca ON t.crew_id = ca.id
      WHERE t.status NOT IN ('completed', 'cancelled')
      ORDER BY 
        CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST
      LIMIT 6
    `

    // Recent activity from the activities table
    const recentActivity = await sql`
      SELECT a.id, a.activity_type, a.title, a.description, a.actor_name, a.created_at,
             ca.first_name, ca.last_name
      FROM activities a
      LEFT JOIN crew ca ON a.crew_id = ca.id
      ORDER BY a.created_at DESC
      LIMIT 8
    `

    // Pipeline counts (for funnel)
    const pipelineCounts = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'application' THEN 1 END) as application,
        COUNT(CASE WHEN status = 'screening' THEN 1 END) as screening,
        COUNT(CASE WHEN status = 'interview' THEN 1 END) as interview,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'volunteer' THEN 1 END) as volunteer,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'standby' THEN 1 END) as standby,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'alumni' THEN 1 END) as alumni,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM crew
    `

    // Overdue tasks
    const [overdueTaskCount] = await sql`
      SELECT COUNT(*) as count FROM tasks
      WHERE status NOT IN ('completed', 'cancelled')
        AND due_date < CURRENT_DATE
    `

    return NextResponse.json({
      total: parseInt(totalResult.count as string),
      statusCounts: statusCounts.map((r) => ({
        status: r.status,
        count: parseInt(r.count as string),
      })),
      countryCounts: countryCounts.map((r) => ({
        country: r.country,
        count: parseInt(r.count as string),
      })),
      departmentCounts: departmentCounts.map((r) => ({
        department: r.department_preference,
        count: parseInt(r.count as string),
      })),
      recentApplications: recentCrewMembers,
      maritimeQualCounts: maritimeQualCounts.map((r) => ({
        qualification: r.maritime_qualifications,
        count: parseInt(r.count as string),
      })),
      skillStats: skillStats[0],
      fleet: {
        ships: parseInt(shipCount.count as string),
        activeVoyages: parseInt(activeVoyageCount.count as string),
        totalVoyages: parseInt(totalVoyageCount.count as string),
      },
      openTasks: parseInt(openTaskCount.count as string),
      overdueTasks: parseInt(overdueTaskCount.count as string),
      upcomingTasks,
      recentActivity,
      pipeline: pipelineCounts[0],
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
