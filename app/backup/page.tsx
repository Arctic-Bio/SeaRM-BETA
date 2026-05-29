'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DatabaseBackup, Plus, Trash2, RotateCcw, Clock, CheckCircle2, AlertCircle, Loader2, Download, UploadCloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PROVIDER_INFO: Record<string, { label: string; placeholder: string; docs: string }> = {
  neon: { label: 'Neon', placeholder: 'postgresql://user:password@host/dbname', docs: 'Neon PostgreSQL' },
  aws: { label: 'AWS RDS', placeholder: 'postgresql://user:password@endpoint:5432/dbname', docs: 'AWS Aurora PostgreSQL' },
  supabase: { label: 'Supabase', placeholder: 'postgresql://postgres:password@db.project.supabase.co/postgres', docs: 'Supabase PostgreSQL' },
  pg: { label: 'PostgreSQL', placeholder: 'postgresql://user:password@host:5432/dbname', docs: 'Standard PostgreSQL' },
  mysql: { label: 'MySQL', placeholder: 'mysql://user:password@host:3306/dbname', docs: 'MySQL Database' },
}

export default function BackupPage() {
  const { user } = useAuth()
  const [newConnLabel, setNewConnLabel] = useState('')
  const [newConnProvider, setNewConnProvider] = useState('neon')
  const [newConnString, setNewConnString] = useState('')
  const [isAddingConn, setIsAddingConn] = useState(false)
  const [selectedConnId, setSelectedConnId] = useState('')
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const { data: connections, mutate: mutateConns } = useSWR(user ? '/api/backup?endpoint=connections' : null, fetcher)
  const { data: history, mutate: mutateHistory } = useSWR(user ? '/api/backup?endpoint=history' : null, fetcher)

  const handleAddConnection = async () => {
    if (!newConnLabel || !newConnString) {
      toast.error('Please fill in all fields')
      return
    }
    setIsAddingConn(true)
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_connection',
          provider: newConnProvider,
          label: newConnLabel,
          connection_string: newConnString,
        }),
      })
      if (!res.ok) throw new Error('Failed to add connection')
      toast.success('Connection added successfully')
      setNewConnLabel('')
      setNewConnString('')
      mutateConns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add connection')
    } finally {
      setIsAddingConn(false)
    }
  }

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Delete this connection? This will not delete any backups.')) return
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_connection', connection_id: id }),
      })
      if (!res.ok) throw new Error('Failed to delete connection')
      toast.success('Connection deleted')
      mutateConns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete connection')
    }
  }

  const handleBackup = async () => {
    if (!selectedConnId) {
      toast.error('Please select a connection')
      return
    }
    setIsBackingUp(true)
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup', connection_id: selectedConnId }),
      })
      if (!res.ok) throw new Error('Backup failed')
      const data = await res.json()
      toast.success(`Backup created: ${data.size_kb}KB from ${data.tables_count} tables`)
      mutateHistory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async (historyId: string) => {
    if (!confirm('Restore this backup? Current data will be replaced.')) return
    setIsRestoring(true)
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backup_id: historyId }),
      })
      if (!res.ok) throw new Error('Restore failed')
      toast.success('Backup restored successfully')
      mutateHistory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }

  const conns = Array.isArray(connections) ? connections : connections?.data ?? []
  const hist = Array.isArray(history) ? history : history?.data ?? []
  const lastBackup = hist.find((h: any) => h.type === 'backup' && h.status === 'completed')

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <DatabaseBackup className="h-8 w-8 text-chart-2" />
            <h1 className="text-3xl font-bold text-foreground">Backup & Restore</h1>
          </div>
          <p className="text-muted-foreground">Manage database connections and backup your data across multiple providers</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Connections</p>
              <p className="text-2xl font-bold">{conns.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Backups</p>
              <p className="text-2xl font-bold">{hist.filter((h: any) => h.type === 'backup').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Last Backup</p>
              <p className="text-sm font-medium">{lastBackup ? new Date(lastBackup.created_at).toLocaleDateString() : 'Never'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Database Connections</CardTitle>
                    <CardDescription>Add external database providers to backup from</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Add Connection
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Database Connection</DialogTitle>
                        <DialogDescription>Connect to an external database provider</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="label" className="text-xs mb-2 block">Label</Label>
                          <Input id="label" placeholder="e.g., Production DB" value={newConnLabel} onChange={(e) => setNewConnLabel(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="provider" className="text-xs mb-2 block">Provider</Label>
                          <Select value={newConnProvider} onValueChange={setNewConnProvider}>
                            <SelectTrigger id="provider">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PROVIDER_INFO).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="conn-str" className="text-xs mb-2 block">Connection String</Label>
                          <Input 
                            id="conn-str" 
                            type="password"
                            placeholder={PROVIDER_INFO[newConnProvider]?.placeholder}
                            value={newConnString}
                            onChange={(e) => setNewConnString(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddConnection} disabled={isAddingConn}>
                          {isAddingConn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                          Add Connection
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {conns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DatabaseBackup className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No connections yet. Add one to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conns.map((conn: any) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-card/50 transition">
                        <div>
                          <p className="font-medium text-sm">{conn.label}</p>
                          <p className="text-xs text-muted-foreground">{PROVIDER_INFO[conn.provider]?.label || conn.provider}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={conn.status === 'connected' ? 'outline' : 'destructive'} className="text-[10px]">
                            {conn.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteConnection(conn.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Backup</CardTitle>
                <CardDescription>Backup your current data to an external database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="backup-conn" className="text-xs mb-2 block">Select Connection</Label>
                  <Select value={selectedConnId} onValueChange={setSelectedConnId}>
                    <SelectTrigger id="backup-conn">
                      <SelectValue placeholder="Select a connection..." />
                    </SelectTrigger>
                    <SelectContent>
                      {conns.map((conn: any) => (
                        <SelectItem key={conn.id} value={conn.id}>{conn.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleBackup} disabled={!selectedConnId || isBackingUp} className="w-full gap-2">
                  {isBackingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {isBackingUp ? 'Backing up...' : 'Start Backup'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Backup History</CardTitle>
                <CardDescription>View all backup and restore operations</CardDescription>
              </CardHeader>
              <CardContent>
                {hist.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No backup history yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {hist.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {item.status === 'failed' && <AlertCircle className="h-4 w-4 text-destructive" />}
                          {(item.status === 'pending' || item.status === 'in_progress') && <Loader2 className="h-4 w-4 text-warning animate-spin" />}
                          <div>
                            <p className="font-medium text-sm capitalize">{item.type}: {item.status}</p>
                            <p className="text-xs text-muted-foreground">{item.tables_count} tables, {item.size_kb}KB • {new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {item.type === 'backup' && item.status === 'completed' && (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleRestore(item.id)} disabled={isRestoring}>
                            {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                            Restore
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
