import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  const endpoint = req.nextUrl.searchParams.get('endpoint')
  
  // Get user notifications
  if (endpoint === 'notifications') {
    const status = req.nextUrl.searchParams.get('status') || 'unread'
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
    const rows = await sql`
      SELECT * FROM notifications 
      WHERE user_id = ${user.id} AND status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return NextResponse.json(rows)
  }

  // Get notification rules (sysadmin only)
  if (endpoint === 'rules') {
    if (user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rows = await sql`SELECT * FROM notification_rules WHERE is_active = true ORDER BY created_at DESC`
    return NextResponse.json(rows)
  }

  // Get user preferences
  if (endpoint === 'preferences') {
    const rows = await sql`SELECT * FROM notification_preferences WHERE user_id = ${user.id}`
    return NextResponse.json(rows)
  }

  // Stats for dashboard
  if (endpoint === 'stats') {
    const unread = await sql`SELECT COUNT(*) as count FROM notifications WHERE user_id = ${user.id} AND status = 'unread'`
    const total = await sql`SELECT COUNT(*) as count FROM notifications WHERE user_id = ${user.id}`
    return NextResponse.json({
      unread: unread[0]?.count || 0,
      total: total[0]?.count || 0,
    })
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  const body = await req.json()
  const { action } = body

  // Create a new rule (sysadmin only)
  if (action === 'create_rule') {
    if (user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, description, event_type, entity_type, conditions, channels, template_subject, template_body, priority, target_roles, cooldown_minutes } = body
    try {
      const result = await sql`
        INSERT INTO notification_rules (name, description, event_type, entity_type, conditions, channels, template_subject, template_body, priority, target_roles, cooldown_minutes, created_by)
        VALUES (${name}, ${description || ''}, ${event_type}, ${entity_type || 'system'}, ${JSON.stringify(conditions || {})}, ${JSON.stringify(channels || ['in_app'])}, ${template_subject || ''}, ${template_body || ''}, ${priority || 'normal'}, ${JSON.stringify(target_roles || ['sysadmin'])}, ${cooldown_minutes || 0}, ${user.id})
        RETURNING *
      `
      return NextResponse.json(result[0], { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Update a rule (sysadmin only)
  if (action === 'update_rule') {
    if (user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { rule_id, ...updates } = body
    const fields: string[] = []
    const values: any[] = []
    let p = 1
    for (const [key, val] of Object.entries(updates)) {
      if (['name', 'description', 'event_type', 'entity_type', 'template_subject', 'template_body', 'priority', 'is_active', 'cooldown_minutes'].includes(key)) {
        fields.push(`${key} = $${p}`)
        values.push(val)
        p++
      } else if (['conditions', 'channels', 'target_roles'].includes(key)) {
        fields.push(`${key} = $${p}`)
        values.push(JSON.stringify(val))
        p++
      }
    }
    fields.push(`updated_at = now()`)
    values.push(rule_id)
    try {
      const result = await sql.query(
        `UPDATE notification_rules SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
        values
      )
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Delete a rule (sysadmin only)
  if (action === 'delete_rule') {
    if (user.role !== 'sysadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { rule_id } = body
    try {
      await sql`DELETE FROM notification_rules WHERE id = ${rule_id}`
      return NextResponse.json({ success: true })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Mark notification as read
  if (action === 'mark_read') {
    const { notification_id } = body
    try {
      const result = await sql`UPDATE notifications SET status = 'read', read_at = now() WHERE id = ${notification_id} AND user_id = ${user.id} RETURNING *`
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Archive notification
  if (action === 'archive') {
    const { notification_id } = body
    try {
      const result = await sql`UPDATE notifications SET status = 'archived' WHERE id = ${notification_id} AND user_id = ${user.id} RETURNING *`
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  // Set user preference
  if (action === 'set_preference') {
    const { channel, event_type, is_enabled } = body
    try {
      const result = await sql`
        INSERT INTO notification_preferences (user_id, channel, event_type, is_enabled)
        VALUES (${user.id}, ${channel}, ${event_type}, ${is_enabled})
        ON CONFLICT (user_id, channel, event_type) DO UPDATE SET is_enabled = ${is_enabled}, updated_at = now()
        RETURNING *
      `
      return NextResponse.json(result[0])
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
