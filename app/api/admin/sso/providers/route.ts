import { getDb } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { encryptToken } from '@/lib/sso'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'sysadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sql = getDb()
    const providers = await sql`
      SELECT id, name, type, provider_display_name, client_id, redirect_uri, 
             is_active, is_primary, auto_link_by_email, logo_url, created_at
      FROM sso_providers
      ORDER BY created_at DESC
    `

    return NextResponse.json({ providers })
  } catch (err: any) {
    console.error('[v0] Error fetching SSO providers:', err)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'sysadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      type,
      displayName,
      clientId,
      clientSecret,
      redirectUri,
      authEndpoint,
      tokenEndpoint,
      userinfoEndpoint,
      scope,
      issuer,
      metadataUrl,
      certificate,
      isActive,
      isPrimary,
      autoLinkByEmail,
      logoUrl,
    } = body

    const sql = getDb()
    const result = await sql`
      INSERT INTO sso_providers (
        name, type, provider_display_name, client_id, client_secret_encrypted,
        redirect_uri, auth_endpoint, token_endpoint, userinfo_endpoint, scope,
        issuer, metadata_url, certificate_encrypted, is_active, is_primary,
        auto_link_by_email, logo_url, created_by, updated_by, created_at, updated_at
      ) VALUES (
        ${name}, ${type}, ${displayName}, ${clientId}, ${encryptToken(clientSecret)},
        ${redirectUri}, ${authEndpoint}, ${tokenEndpoint}, ${userinfoEndpoint}, ${scope},
        ${issuer}, ${metadataUrl}, ${certificate ? encryptToken(certificate) : null},
        ${isActive}, ${isPrimary}, ${autoLinkByEmail}, ${logoUrl}, ${user.id}, ${user.id}, now(), now()
      )
      RETURNING id, name, type, provider_display_name
    `

    return NextResponse.json({ 
      success: true, 
      provider: result[0]
    })
  } catch (err: any) {
    console.error('[v0] Error creating SSO provider:', err)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
