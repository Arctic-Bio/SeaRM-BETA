import { getProvider, upsertCredential, linkAccount, findUserByProviderUserId, findUserByProviderEmail, logSSOEvent, decryptToken } from './sso'
import { createUser } from './auth'

export interface OAuth2Profile {
  id: string
  email?: string
  name?: string
  picture?: string
  emailVerified?: boolean
}

export interface SAML2Profile {
  nameID?: string
  email?: string
  name?: string
  groups?: string[]
  [key: string]: any
}

// OAuth2 callback handler
export async function handleOAuth2Callback(
  providerId: string,
  code: string,
  state: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ userId: string; isNewUser: boolean }> {
  try {
    const provider = await getProvider(providerId)
    if (!provider || provider.type !== 'oauth2') {
      throw new Error('Invalid OAuth2 provider')
    }

    // Exchange code for tokens (simplified - real implementation would use axios/fetch)
    const tokenResponse = await fetch(provider.token_endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: provider.client_id,
        client_secret: decryptToken(provider.client_secret_encrypted),
        redirect_uri: provider.redirect_uri,
      }),
    })

    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error(tokens.error || 'Token exchange failed')
    }

    // Get user profile from userinfo endpoint
    const profileResponse = await fetch(provider.userinfo_endpoint!, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = (await profileResponse.json()) as OAuth2Profile

    // Find or create user
    let userId = await findUserByProviderUserId(providerId, profile.id)
    let isNewUser = false

    if (!userId && provider.auto_link_by_email && profile.email) {
      userId = await findUserByProviderEmail(providerId, profile.email)
    }

    if (!userId) {
      isNewUser = true
      if (!profile.email) {
        throw new Error('Email required for new user registration')
      }
      userId = await createUser({
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        password: '', // SSO users don't have passwords
      })
    }

    // Store credentials
    await upsertCredential(
      userId,
      providerId,
      profile.id,
      profile.email,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    )

    // Link account if new
    if (isNewUser) {
      await linkAccount(userId, providerId)
    }

    // Log event
    await logSSOEvent('login', userId, providerId, 'success', { profile }, undefined, ipAddress, userAgent)

    return { userId, isNewUser }
  } catch (err: any) {
    console.error('[v0] OAuth2 callback error:', err)
    await logSSOEvent('login', undefined, providerId, 'failure', undefined, err.message, ipAddress, userAgent)
    throw err
  }
}

// SAML2 assertion handler
export async function handleSAML2Assertion(
  providerId: string,
  samlResponse: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ userId: string; isNewUser: boolean }> {
  try {
    const provider = await getProvider(providerId)
    if (!provider || provider.type !== 'saml2') {
      throw new Error('Invalid SAML2 provider')
    }

    // Parse SAML response (simplified - real implementation would use samlify or xml-crypto)
    // This is a placeholder for actual SAML2 parsing
    const profile: SAML2Profile = parseSAMLResponse(samlResponse)

    if (!profile.email) {
      throw new Error('Email attribute required in SAML response')
    }

    // Find or create user
    let userId = await findUserByProviderUserId(providerId, profile.nameID || profile.email)
    let isNewUser = false

    if (!userId && provider.auto_link_by_email) {
      userId = await findUserByProviderEmail(providerId, profile.email)
    }

    if (!userId) {
      isNewUser = true
      userId = await createUser({
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        password: '',
      })
    }

    // Store SAML attributes
    await upsertCredential(
      userId,
      providerId,
      profile.nameID || profile.email,
      profile.email,
      '', // SAML doesn't use access tokens typically
      undefined,
      undefined,
      profile
    )

    if (isNewUser) {
      await linkAccount(userId, providerId)
    }

    await logSSOEvent('login', userId, providerId, 'success', { profile }, undefined, ipAddress, userAgent)

    return { userId, isNewUser }
  } catch (err: any) {
    console.error('[v0] SAML2 assertion error:', err)
    await logSSOEvent('login', undefined, providerId, 'failure', undefined, err.message, ipAddress, userAgent)
    throw err
  }
}

// Placeholder SAML response parser
function parseSAMLResponse(samlResponse: string): SAML2Profile {
  // Actual implementation would decode and parse SAML XML
  // For now, return empty profile
  return {}
}

// Refresh OAuth2 token if expired
export async function refreshOAuth2Token(userId: string, providerId: string) {
  const provider = await getProvider(providerId)
  if (!provider || provider.type !== 'oauth2') return

  // Fetch and update token
  // Implementation would check if expired and refresh if needed
}
