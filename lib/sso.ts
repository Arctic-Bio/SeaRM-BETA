import { getDb } from './db'
import crypto from 'crypto'

export interface SSOProvider {
  id: string
  name: string
  type: 'oauth2' | 'saml2'
  is_active: boolean
  is_primary: boolean
  provider_display_name: string
  logo_url?: string
  auto_link_by_email: boolean
}

export interface SSOCredential {
  id: string
  user_id: string
  provider_id: string
  provider_user_id: string
  provider_email?: string
  last_login_at?: Date
  linked_at: Date
}

// Encryption/Decryption for sensitive tokens
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this'

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptToken(encrypted: string): string {
  const [iv, token] = encrypted.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), Buffer.from(iv, 'hex'))
  let decrypted = decipher.update(token, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Get all active SSO providers
export async function getActiveProviders(): Promise<SSOProvider[]> {
  const sql = getDb()
  const providers = await sql`
    SELECT id, name, type, is_active, is_primary, provider_display_name, logo_url, auto_link_by_email
    FROM sso_providers
    WHERE is_active = true
    ORDER BY is_primary DESC, name ASC
  `
  return providers as SSOProvider[]
}

// Get provider by ID
export async function getProvider(providerId: string): Promise<SSOProvider | null> {
  const sql = getDb()
  const providers = await sql`
    SELECT * FROM sso_providers WHERE id = ${providerId}
  `
  return providers[0] || null
}

// Get linked providers for user
export async function getLinkedProviders(userId: string): Promise<SSOProvider[]> {
  const sql = getDb()
  const providers = await sql`
    SELECT sp.id, sp.name, sp.type, sp.is_active, sp.is_primary, sp.provider_display_name, sp.logo_url, sp.auto_link_by_email
    FROM sso_providers sp
    INNER JOIN sso_linked_accounts sla ON sp.id = sla.provider_id
    WHERE sla.user_id = ${userId} AND sla.status = 'active'
    ORDER BY sp.name ASC
  `
  return providers as SSOProvider[]
}

// Create or update SSO credential
export async function upsertCredential(
  userId: string,
  providerId: string,
  providerUserId: string,
  providerEmail: string | undefined,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number | undefined,
  samlAttributes?: Record<string, any>
) {
  const sql = getDb()
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

  const result = await sql`
    INSERT INTO sso_credentials (
      user_id, provider_id, provider_user_id, provider_email,
      access_token_encrypted, refresh_token_encrypted, access_token_expires_at,
      saml_attributes, last_login_at, linked_at
    ) VALUES (
      ${userId}, ${providerId}, ${providerUserId}, ${providerEmail},
      ${encryptToken(accessToken)}, ${refreshToken ? encryptToken(refreshToken) : null}, ${expiresAt},
      ${samlAttributes ? JSON.stringify(samlAttributes) : null}, now(), now()
    )
    ON CONFLICT (provider_id, provider_user_id) DO UPDATE SET
      access_token_encrypted = ${encryptToken(accessToken)},
      refresh_token_encrypted = ${refreshToken ? encryptToken(refreshToken) : null},
      access_token_expires_at = ${expiresAt},
      saml_attributes = COALESCE(${samlAttributes ? JSON.stringify(samlAttributes) : null}, sso_credentials.saml_attributes),
      last_login_at = now(),
      updated_at = now()
    RETURNING id
  `
  return result[0]?.id
}

// Link account to SSO provider
export async function linkAccount(
  userId: string,
  providerId: string,
  linkedBy: string | undefined = undefined
) {
  const sql = getDb()
  const result = await sql`
    INSERT INTO sso_linked_accounts (user_id, provider_id, status, linked_at, linked_by)
    VALUES (${userId}, ${providerId}, 'active', now(), ${linkedBy})
    ON CONFLICT (user_id, provider_id) DO UPDATE SET
      status = 'active',
      linked_at = now(),
      updated_at = now()
    RETURNING id
  `
  return result[0]?.id
}

// Unlink account from SSO provider
export async function unlinkAccount(userId: string, providerId: string) {
  const sql = getDb()
  await sql`
    UPDATE sso_linked_accounts
    SET status = 'unlinked', unlinked_at = now(), updated_at = now()
    WHERE user_id = ${userId} AND provider_id = ${providerId}
  `
  
  // Also remove credentials
  await sql`
    DELETE FROM sso_credentials
    WHERE user_id = ${userId} AND provider_id = ${providerId}
  `
}

// Get credential for user and provider
export async function getCredential(userId: string, providerId: string): Promise<any | null> {
  const sql = getDb()
  const credentials = await sql`
    SELECT * FROM sso_credentials
    WHERE user_id = ${userId} AND provider_id = ${providerId}
  `
  if (!credentials[0]) return null

  const cred = credentials[0]
  return {
    ...cred,
    access_token: cred.access_token_encrypted ? decryptToken(cred.access_token_encrypted) : undefined,
    refresh_token: cred.refresh_token_encrypted ? decryptToken(cred.refresh_token_encrypted) : undefined,
  }
}

// Log SSO event
export async function logSSOEvent(
  eventType: 'login' | 'link' | 'unlink' | 'sync' | 'error',
  userId: string | undefined,
  providerId: string | undefined,
  status: 'success' | 'failure',
  eventData: Record<string, any> | undefined,
  errorMessage: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined
) {
  try {
    const sql = getDb()
    await sql`
      INSERT INTO sso_audit_log (
        user_id, provider_id, event_type, status, event_data,
        error_message, ip_address, user_agent
      ) VALUES (
        ${userId}, ${providerId}, ${eventType}, ${status}, ${eventData ? JSON.stringify(eventData) : null},
        ${errorMessage}, ${ipAddress}, ${userAgent}
      )
    `
  } catch (err) {
    console.error('[v0] Failed to log SSO event:', err)
  }
}

// Find user by SSO provider user ID
export async function findUserByProviderUserId(providerId: string, providerUserId: string): Promise<string | null> {
  const sql = getDb()
  const results = await sql`
    SELECT user_id FROM sso_credentials
    WHERE provider_id = ${providerId} AND provider_user_id = ${providerUserId}
    LIMIT 1
  `
  return results[0]?.user_id || null
}

// Find user by SSO provider email (for auto-linking)
export async function findUserByProviderEmail(providerId: string, providerEmail: string): Promise<string | null> {
  const sql = getDb()
  const results = await sql`
    SELECT user_id FROM sso_credentials
    WHERE provider_id = ${providerId} AND provider_email = ${providerEmail}
    LIMIT 1
  `
  if (results[0]) return results[0].user_id

  // Also check if user exists by system email with auto-link enabled
  const provider = await getProvider(providerId)
  if (provider?.auto_link_by_email) {
    const userResults = await sql`
      SELECT id FROM users WHERE email = ${providerEmail}
      LIMIT 1
    `
    return userResults[0]?.id || null
  }

  return null
}

// Get SSO audit logs
export async function getSSOAuditLogs(
  userId: string | undefined = undefined,
  providerId: string | undefined = undefined,
  limit: number = 100
) {
  const sql = getDb()
  
  let query = 'SELECT * FROM sso_audit_log WHERE 1=1'
  const params = []

  if (userId) {
    query += ` AND user_id = $${params.length + 1}`
    params.push(userId)
  }
  
  if (providerId) {
    query += ` AND provider_id = $${params.length + 1}`
    params.push(providerId)
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)

  const logs = await sql.unsafe(query, params)
  return logs
}
