'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Plus, Trash2, Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-react'

interface SSOProvider {
  id: string
  name: string
  type: 'oauth2' | 'saml2'
  provider_display_name: string
  is_active: boolean
  is_primary: boolean
  auto_link_by_email: boolean
  logo_url?: string
  client_id?: string
  redirect_uri?: string
}

export function AdminSSOConfig() {
  const [providers, setProviders] = useState<SSOProvider[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'oauth2' as const,
    displayName: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    authEndpoint: '',
    tokenEndpoint: '',
    userinfoEndpoint: '',
    scope: 'openid profile email',
    isActive: true,
    isPrimary: false,
    autoLinkByEmail: false,
    logoUrl: '',
  })

  const handleAddProvider = async () => {
    try {
      setIsAdding(true)
      const res = await fetch('/api/admin/sso/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to create provider')

      // Reset form
      setFormData({
        name: '',
        type: 'oauth2',
        displayName: '',
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        authEndpoint: '',
        tokenEndpoint: '',
        userinfoEndpoint: '',
        scope: 'openid profile email',
        isActive: true,
        isPrimary: false,
        autoLinkByEmail: false,
        logoUrl: '',
      })

      // Refetch
      const listRes = await fetch('/api/admin/sso/providers')
      const data = await listRes.json()
      setProviders(data.providers || [])
    } catch (err) {
      console.error('Error adding provider:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SSO Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Provider Form */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add SSO Provider
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Provider name (e.g., Google, Okta)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="Display name for UI"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />

              <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oauth2">OAuth2</SelectItem>
                  <SelectItem value="saml2">SAML2</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Client ID"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              />

              <div className="relative">
                <Input
                  type={showSecret['new'] ? 'text' : 'password'}
                  placeholder="Client Secret"
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                />
                <button
                  className="absolute right-2 top-2.5"
                  onClick={() => setShowSecret({ ...showSecret, new: !showSecret['new'] })}
                >
                  {showSecret['new'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                placeholder="Redirect URI"
                value={formData.redirectUri}
                onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
              />

              {formData.type === 'oauth2' && (
                <>
                  <Input
                    placeholder="Auth Endpoint"
                    value={formData.authEndpoint}
                    onChange={(e) => setFormData({ ...formData, authEndpoint: e.target.value })}
                  />
                  <Input
                    placeholder="Token Endpoint"
                    value={formData.tokenEndpoint}
                    onChange={(e) => setFormData({ ...formData, tokenEndpoint: e.target.value })}
                  />
                  <Input
                    placeholder="Userinfo Endpoint"
                    value={formData.userinfoEndpoint}
                    onChange={(e) => setFormData({ ...formData, userinfoEndpoint: e.target.value })}
                  />
                  <Input
                    placeholder="Scope"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  />
                </>
              )}

              <Input
                placeholder="Logo URL"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: !!v })}
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isPrimary}
                  onCheckedChange={(v) => setFormData({ ...formData, isPrimary: !!v })}
                />
                <span className="text-sm">Primary</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.autoLinkByEmail}
                  onCheckedChange={(v) => setFormData({ ...formData, autoLinkByEmail: !!v })}
                />
                <span className="text-sm">Auto-link by Email</span>
              </label>
            </div>

            <Button onClick={handleAddProvider} disabled={isAdding} className="w-full">
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </>
              )}
            </Button>
          </div>

          {/* Existing Providers */}
          <div className="space-y-3">
            <h3 className="font-semibold">Configured Providers</h3>
            {providers.length > 0 ? (
              providers.map((provider) => (
                <div key={provider.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{provider.provider_display_name}</p>
                      <p className="text-xs text-muted-foreground">{provider.type.toUpperCase()}</p>
                    </div>
                    <div className="flex gap-2">
                      {provider.is_active && <Badge>Active</Badge>}
                      {provider.is_primary && <Badge variant="secondary">Primary</Badge>}
                      {provider.auto_link_by_email && <Badge variant="outline">Auto-link</Badge>}
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded text-sm font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Client ID: {provider.client_id}</span>
                      <button
                        onClick={() => handleCopy(provider.client_id || '', provider.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copied === provider.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div>Redirect URI: {provider.redirect_uri}</div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No providers configured yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
