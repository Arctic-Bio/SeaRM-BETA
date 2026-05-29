import { getSession } from '@/lib/auth'
import { getLinkedProviders, unlinkAccount, linkAccount } from '@/lib/sso'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const linked = await getLinkedProviders(user.id)
    return NextResponse.json({ linked })
  } catch (err: any) {
    console.error('[v0] Error fetching linked accounts:', err)
    return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { providerId } = await req.json()
    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Link account
    await linkAccount(user.id, providerId, user.id)

    return NextResponse.json({ success: true, message: 'Account linked' })
  } catch (err: any) {
    console.error('[v0] Error linking account:', err)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { providerId } = body

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Check if this is the only login method
    const linked = await getLinkedProviders(user.id)
    if (linked.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot unlink your only login method. Add a password or link another provider first.' },
        { status: 400 }
      )
    }

    // Unlink account
    await unlinkAccount(user.id, providerId)

    return NextResponse.json({ success: true, message: 'Account unlinked' })
  } catch (err: any) {
    console.error('[v0] Error unlinking account:', err)
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 })
  }
}
