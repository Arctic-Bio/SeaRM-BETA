import { handleSAML2Assertion } from '@/lib/sso-handlers'
import { setAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const searchParams = req.nextUrl.searchParams
    const providerId = searchParams.get('provider')
    const samlResponse = body || searchParams.get('SAMLResponse')

    if (!providerId || !samlResponse) {
      return NextResponse.json({ error: 'Missing provider or SAML response' }, { status: 400 })
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

    // Redirect to dashboard or onboarding
    const redirectUrl = new URL('/dashboard', req.url)
    if (isNewUser) {
      redirectUrl.searchParams.set('onboarding', '1')
    }

    return NextResponse.redirect(redirectUrl)
  } catch (err: any) {
    console.error('[v0] SSO SAML2 ACS error:', err)
    const errorUrl = new URL('/login', req.url)
    errorUrl.searchParams.set('error', 'saml_failed')
    errorUrl.searchParams.set('message', err.message)
    return NextResponse.redirect(errorUrl)
  }
}
