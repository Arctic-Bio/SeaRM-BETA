import { NextRequest, NextResponse } from 'next/server'
import { getUserPermissions } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const userPerms = await getUserPermissions(userId)
  return NextResponse.json({ data: userPerms })
}
