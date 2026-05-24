import { getActiveProviders, getLinkedProviders } from '@/lib/sso'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    
    // Get all active providers for unauthenticated users
    const allProviders = await getActiveProviders()
    
    // If authenticated, also get linked providers
    let linkedProviders = []
    if (user) {
      linkedProviders = await getLinkedProviders(user.id)
    }

    return NextResponse.json({
      providers: allProviders.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        displayName: p.provider_display_name,
        logo: p.logo_url,
        isPrimary: p.is_primary,
      })),
      linked: linkedProviders.map(p => p.id),
      totalProviders: allProviders.length,
    })
  } catch (err: any) {
    console.error('[v0] Error fetching SSO providers:', err)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}
