import { getDb } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getSSOAuditLogs } from '@/lib/sso'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'sysadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const logs = await getSSOAuditLogs(userId || undefined, undefined, limit)

    return NextResponse.json({ logs, count: logs.length })
  } catch (err: any) {
    console.error('[v0] Error fetching SSO audit logs:', err)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
