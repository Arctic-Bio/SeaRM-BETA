import { handleOAuth2Callback } from '@/lib/sso-handlers'
import { setAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const providerId = searchParams.get('provider')
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!providerId || !code) {
      return NextResponse.json({ error: 'Missing provider or code' }, { status: 400 })
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-client-ip')
    const userAgent = req.headers.get('user-agent')

    const { userId, isNewUser } = await handleOAuth2Callback(
      providerId,
      code,
      state || '',
      ipAddress || undefined,
      userAgent || undefined
    )

    // Create session
    await setAuthSession(userId)

    // Redirect to dashboard or onboarding
    const redirectUrl = new URL('/dashboard', req.url)
    if (isNewUser) {
      redirectUrl.searchParams.set('onboarding', '1')
    }

    return NextResponse.redirect(redirectUrl)
  } catch (err: any) {
    console.error('[v0] SSO OAuth2 callback error:', err)
    const errorUrl = new URL('/login', req.url)
    errorUrl.searchParams.set('error', 'sso_failed')
    errorUrl.searchParams.set('message', err.message)
    return NextResponse.redirect(errorUrl)
  }
}
