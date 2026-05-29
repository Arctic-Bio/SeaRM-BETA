import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * One-time migration: renames old applicant-style crew statuses to the new
 * lifecycle-based status values.
 *
 * Old -> New mapping:
 *   new_applicant       -> application
 *   reviewed            -> screening
 *   awaiting_interview   -> interview
 *   interview_completed  -> verified
 *   candidate           -> volunteer
 *   approved            -> active
 *   confirmed           -> standby
 *
 * "rejected" stays the same.
 *
 * Run via:  POST /api/migrate/rename-statuses
 */
export async function POST() {
  try {
    const sql = getDb()

    const STATUS_MAP: Record<string, string> = {
      new_applicant: "application",
      reviewed: "screening",
      awaiting_interview: "interview",
      interview_completed: "verified",
      candidate: "volunteer",
      approved: "active",
      confirmed: "standby",
    }

    const results: { old: string; new: string; updated: number }[] = []

    for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
      const res = await sql`
        UPDATE crew
        SET status = ${newStatus}, updated_at = now()
        WHERE status = ${oldStatus}
      `
      results.push({
        old: oldStatus,
        new: newStatus,
        updated: typeof res === "object" && "count" in res ? Number(res.count) : 0,
      })
    }

    // Also update any activity descriptions that reference old labels
    // (optional, non-critical)
    await sql`
      UPDATE activities
      SET description = REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(description,
                    'New Applicant', 'Application'),
                  'Reviewed', 'Screening'),
                'Awaiting Interview', 'Interview'),
              'Interview Completed', 'Verified'),
            'Candidate', 'Volunteer'),
          'Approved', 'Active'),
        'Confirmed', 'Standby')
      WHERE activity_type = 'status_change'
    `

    return NextResponse.json({
      success: true,
      message: "Status migration complete",
      results,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
