import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getSession } from "@/lib/auth"


export async function PATCH(req: NextRequest) {
  try {
    const sql = getDb()
    const session = await getSession()
    if (!session || !session.crew_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { first_name, last_name, pronouns, availability_start_date, availability_end_date } = await req.json()

    // Crew can only update name, pronouns, and availability dates
    if (first_name !== undefined) {
      await sql`UPDATE crew SET first_name = ${first_name}, updated_at = now() WHERE id = ${session.crew_id}`
    }
    if (last_name !== undefined) {
      await sql`UPDATE crew SET last_name = ${last_name}, updated_at = now() WHERE id = ${session.crew_id}`
    }
    if (pronouns !== undefined) {
      await sql`UPDATE crew SET pronouns = ${pronouns}, updated_at = now() WHERE id = ${session.crew_id}`
    }
    if (availability_start_date !== undefined) {
      await sql`UPDATE crew SET availability_start_date = ${availability_start_date || null}, updated_at = now() WHERE id = ${session.crew_id}`
    }
    if (availability_end_date !== undefined) {
      await sql`UPDATE crew SET availability_end_date = ${availability_end_date || null}, updated_at = now() WHERE id = ${session.crew_id}`
    }

    // Also update user name if name changed
    if (first_name !== undefined || last_name !== undefined) {
      const newName = [first_name, last_name].filter(Boolean).join(" ")
      if (newName) {
        await sql`UPDATE users SET name = ${newName}, updated_at = now() WHERE id = ${session.id}`
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
