import { handleSAML2Assertion } from '@/lib/sso-handlers'
import { setAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { providerId, samlResponse } = body

    if (!providerId || !samlResponse) {
      return NextResponse.json({ error: 'Missing providerId or samlResponse' }, { status: 400 })
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-client-ip')
    const userAgent = req.headers.get('user-agent')

    const { userId, isNewUser } = await handleSAML2Assertion(
      providerId,
      samlResponse,
      ipAddress || undefined,
      userAgent || undefined
    )

    // Create session
    await setAuthSession(userId)

    return NextResponse.json({
      success: true,
      userId,
      isNewUser,
      redirectTo: isNewUser ? '/dashboard?onboarding=1' : '/dashboard',
    })
  } catch (err: any) {
    console.error('[v0] SSO SAML2 assertion error:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
