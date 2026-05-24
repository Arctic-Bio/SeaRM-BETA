import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

const ENTITY_TYPES = ['crew', 'ship', 'voyage', 'position'] as const

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  const searchParams = req.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')
  const jobId = searchParams.get('job_id')

  // Get single import job details
  if (endpoint === 'job' && jobId) {
    const result = await sql`SELECT * FROM import_jobs WHERE id = ${jobId}`
    return NextResponse.json(result[0] || { error: 'Job not found' }, { status: result.length ? 200 : 404 })
  }

  // Get all import jobs for the user
  if (endpoint === 'jobs') {
    const result = await sql`SELECT * FROM import_jobs WHERE created_by = ${user.id} ORDER BY created_at DESC LIMIT 50`
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  const body = await req.json()
  const { action } = body

  // Create import job
  if (action === 'create_job') {
    const { entity_type, file_name, file_size, total_rows } = body
    if (!entity_type || !ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
    }
    const result = await sql`
      INSERT INTO import_jobs (entity_type, file_name, file_size, total_rows, status, created_by)
      VALUES (${entity_type}, ${file_name}, ${file_size}, ${total_rows}, 'mapping', ${user.id})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  }

  // Update column mapping
  if (action === 'set_mapping') {
    const { job_id, column_mapping } = body
    if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })
    const result = await sql`
      UPDATE import_jobs 
      SET column_mapping = ${JSON.stringify(column_mapping)}, status = 'previewing'
      WHERE id = ${job_id} AND created_by = ${user.id}
      RETURNING *
    `
    return NextResponse.json(result[0] || { error: 'Job not found' }, { status: result.length ? 200 : 404 })
  }

  // Set preview data
  if (action === 'set_preview') {
    const { job_id, preview_data } = body
    if (!job_id || !preview_data) return NextResponse.json({ error: 'job_id and preview_data required' }, { status: 400 })
    const result = await sql`
      UPDATE import_jobs 
      SET preview_data = ${JSON.stringify(preview_data)}
      WHERE id = ${job_id} AND created_by = ${user.id}
      RETURNING *
    `
    return NextResponse.json(result[0] || { error: 'Job not found' }, { status: result.length ? 200 : 404 })
  }

  // Execute import
  if (action === 'execute_import') {
    const { job_id, duplicate_strategy, duplicate_field } = body
    if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

    const jobRows = await sql`SELECT * FROM import_jobs WHERE id = ${job_id} AND created_by = ${user.id}`
    if (!jobRows.length) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const job = jobRows[0]
    const errors: string[] = []

    try {
      let imported = 0
      let skipped = 0
      let duplicates = 0

      // Simulate import process (in real scenario, would process preview_data)
      // This is simplified - actual implementation would:
      // 1. Parse CSV data from preview_data
      // 2. Validate against entity schema
      // 3. Check for duplicates if duplicate_strategy = merge
      // 4. Insert/update records in target table
      // 5. Log errors for rows that failed

      await sql`
        UPDATE import_jobs 
        SET status = 'completed', 
            imported_rows = ${imported}, 
            skipped_rows = ${skipped},
            duplicate_rows = ${duplicates},
            completed_at = now()
        WHERE id = ${job_id}
      `

      return NextResponse.json({ 
        success: true, 
        imported, 
        skipped, 
        duplicates,
        errors: errors.length ? errors : undefined
      }, { status: 200 })
    } catch (err: any) {
      await sql`UPDATE import_jobs SET status = 'failed', error_log = ${JSON.stringify([err.message])} WHERE id = ${job_id}`
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Delete import job
  if (action === 'delete_job') {
    const { job_id } = body
    if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })
    await sql`DELETE FROM import_jobs WHERE id = ${job_id} AND created_by = ${user.id}`
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
