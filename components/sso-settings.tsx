'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, LogOut, Link2, Unlink2, Shield, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface SSOProvider {
  id: string
  name: string
  type: 'oauth2' | 'saml2'
  displayName: string
  logo?: string
  isPrimary?: boolean
}

interface LinkedAccount {
  id: string
  name: string
  displayName: string
  linkedAt: string
}

export function SSOSettings() {
  const { data: providers, isLoading: loadingProviders } = useSWR('/api/auth/sso/providers', fetch().then(r => r.json()))
  const { data: linkedAccounts, isLoading: loadingLinked, mutate } = useSWR('/api/auth/sso/link', fetch().then(r => r.json()))
  
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLink = async (providerId: string) => {
    try {
      setError(null)
      setLinkingId(providerId)
      
      // Initiate SSO flow for linking
      const redirectUri = `${window.location.origin}/api/auth/sso/oauth2/callback?provider=${providerId}`
      window.location.href = redirectUri
    } catch (err: any) {
      setError(err.message)
      setLinkingId(null)
    }
  }

  const handleUnlink = async (providerId: string) => {
    try {
      setError(null)
      setUnlinkingId(providerId)
      
      const res = await fetch('/api/auth/sso/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to unlink')
      }

      setSuccess('Account unlinked successfully')
      mutate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUnlinkingId(null)
    }
  }

  if (loadingProviders || loadingLinked) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center gap-2 h-40">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>Loading SSO settings...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="link" className="space-y-4">
      <TabsList>
        <TabsTrigger value="link">Link Accounts</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>

      <TabsContent value="link" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connected SSO Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 text-green-700 rounded-lg flex gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm">{success}</p>
              </div>
            )}

            {providers?.providers && providers.providers.length > 0 ? (
              <div className="grid gap-4">
                {providers.providers.map((provider: SSOProvider) => {
                  const isLinked = providers.linked?.includes(provider.id)
                  
                  return (
                    <div
                      key={provider.id}
                      className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {provider.logo && (
                          <img src={provider.logo} alt={provider.name} className="h-8 w-8 rounded" />
                        )}
                        <div>
                          <p className="font-medium">{provider.displayName}</p>
                          <p className="text-xs text-muted-foreground">{provider.type.toUpperCase()}</p>
                        </div>
                        {isLinked && <Badge variant="secondary">Linked</Badge>}
                        {provider.isPrimary && <Badge>Primary</Badge>}
                      </div>

                      {isLinked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlink(provider.id)}
                          disabled={unlinkingId === provider.id}
                        >
                          {unlinkingId === provider.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Unlinking...
                            </>
                          ) : (
                            <>
                              <Unlink2 className="h-3 w-3 mr-1" />
                              Unlink
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleLink(provider.id)}
                          disabled={linkingId === provider.id}
                        >
                          {linkingId === provider.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Linking...
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3 w-3 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No SSO providers available</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Linked Accounts</h4>
              {linkedAccounts?.linked && linkedAccounts.linked.length > 0 ? (
                <div className="space-y-2">
                  {linkedAccounts.linked.map((account: LinkedAccount) => (
                    <div key={account.id} className="text-sm flex items-center justify-between">
                      <span>{account.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(account.linkedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No SSO accounts linked</p>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <h4 className="font-medium mb-2">Password</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Keep your password secure and change it regularly
              </p>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
