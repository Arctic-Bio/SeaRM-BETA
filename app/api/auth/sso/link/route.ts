import { linkAccount, getLinkedProviders, unlinkAccount } from '@/lib/sso'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { providerId, userId, password } = await req.json()

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Link account
    await linkAccount(user.id, providerId, user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[v0] Error linking SSO account:', err)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { providerId } = body

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Check if this is the only login method
    const linkedProviders = await getLinkedProviders(user.id)
    const hasPassword = !!user.password_hash // Assuming users table has password_hash

    if (linkedProviders.length === 1 && !hasPassword) {
      return NextResponse.json(
        { error: 'Cannot unlink your only login method' },
        { status: 400 }
      )
    }

    // Unlink account
    await unlinkAccount(user.id, providerId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[v0] Error unlinking SSO account:', err)
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const linkedProviders = await getLinkedProviders(user.id)

    return NextResponse.json({
      linked: linkedProviders.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.provider_display_name,
        linkedAt: new Date(),
      })),
    })
  } catch (err: any) {
    console.error('[v0] Error fetching linked accounts:', err)
    return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 })
  }
}
