'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Bell, Plus, Edit2, Trash2, Check, Archive, X, AlertCircle,
  Zap, Mail, MessageSquare, Target, Clock, Filter, RefreshCw, Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const EVENT_TYPES = ['crew.assigned', 'crew.certification_expiring', 'invoice.overdue', 'vessel.maintenance_due', 'position.open', 'system.alert']
const CHANNELS = ['in_app', 'email', 'sms']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const TARGET_ROLES = ['crew', 'captain', 'office', 'sysadmin']

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue/15 text-chart-4 border-chart-4/25',
  normal: 'bg-muted text-muted-foreground border-border',
  high: 'bg-warning/15 text-warning border-warning/25',
  urgent: 'bg-destructive/15 text-destructive border-destructive/25',
}

const EVENT_ICONS: Record<string, any> = {
  'crew.assigned': Target,
  'crew.certification_expiring': AlertCircle,
  'invoice.overdue': AlertCircle,
  'vessel.maintenance_due': Zap,
  'position.open': Briefcase,
  'system.alert': Bell,
}

const CHANNEL_ICONS: Record<string, any> = {
  in_app: Bell,
  email: Mail,
  sms: MessageSquare,
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('inbox')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '', description: '', event_type: '', entity_type: 'system',
    channels: ['in_app'], template_subject: '', template_body: '',
    priority: 'normal', target_roles: ['sysadmin'], cooldown_minutes: 0,
  })

  // Fetch data
  const { data: notifications, mutate: mutateNotif } = useSWR(
    user ? '/api/notifications?endpoint=notifications' : null, fetcher
  )
  const { data: rules, mutate: mutateRules } = useSWR(
    user?.role === 'sysadmin' ? '/api/notifications?endpoint=rules' : null, fetcher
  )
  const { data: preferences, mutate: mutatePrefs } = useSWR(
    user ? '/api/notifications?endpoint=preferences' : null, fetcher
  )
  const { data: stats } = useSWR(user ? '/api/notifications?endpoint=stats' : null, fetcher)

  if (!user || user.role !== 'sysadmin') {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">Access denied. Only system administrators can manage notifications.</p>
        </div>
      </div>
    )
  }

  const handleCreateRule = async () => {
    if (!formData.name || !formData.event_type) {
      toast.error('Name and event type are required')
      return
    }
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_rule', ...formData }),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      toast.success('Notification rule created')
      setIsCreateOpen(false)
      setFormData({ name: '', description: '', event_type: '', entity_type: 'system', channels: ['in_app'], template_subject: '', template_body: '', priority: 'normal', target_roles: ['sysadmin'], cooldown_minutes: 0 })
      mutateRules()
    } catch (err) {
      toast.error('Failed to create rule')
    }
  }

  const handleUpdateRule = async () => {
    if (!editingRule) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_rule', rule_id: editingRule.id, ...editingRule }),
      })
      if (!res.ok) throw new Error('Failed to update rule')
      toast.success('Rule updated')
      setEditingRule(null)
      mutateRules()
    } catch (err) {
      toast.error('Failed to update rule')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_rule', rule_id: ruleId }),
      })
      if (!res.ok) throw new Error('Failed to delete rule')
      toast.success('Rule deleted')
      mutateRules()
    } catch (err) {
      toast.error('Failed to delete rule')
    }
  }

  const handleMarkRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notification_id: notifId }),
      })
      mutateNotif()
    } catch (err) {
      toast.error('Failed to update notification')
    }
  }

  const handleArchive = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', notification_id: notifId }),
      })
      mutateNotif()
    } catch (err) {
      toast.error('Failed to archive notification')
    }
  }

  const handleSetPreference = async (channel: string, eventType: string, enabled: boolean) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_preference', channel, event_type: eventType, is_enabled: enabled }),
      })
      mutatePrefs()
      toast.success('Preference updated')
    } catch (err) {
      toast.error('Failed to update preference')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-chart-4" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage notification rules, preferences, and inbox</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Notification Rule</DialogTitle>
              <DialogDescription>Configure when and how notifications are triggered</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Rule Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Overdue Invoices Alert" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Event Type</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Channels</Label>
                <div className="flex gap-2 mt-2">
                  {CHANNELS.map(ch => (
                    <Button key={ch} size="sm" variant={formData.channels.includes(ch) ? 'default' : 'outline'} onClick={() => {
                      const channels = formData.channels.includes(ch) ? formData.channels.filter(c => c !== ch) : [...formData.channels, ch]
                      setFormData({ ...formData, channels })
                    }} className="gap-1">
                      {Bell.render ? <Bell className="h-3.5 w-3.5" /> : null}
                      {ch}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRule}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Unread</p>
            <p className="text-3xl font-bold text-chart-4">{stats?.unread || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Rules</p>
            <p className="text-3xl font-bold text-success">{rules?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox" className="gap-2">
            <Bell className="h-4 w-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Zap className="h-4 w-4" /> Rules
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Target className="h-4 w-4" /> Preferences
          </TabsTrigger>
        </TabsList>

        {/* Inbox tab */}
        <TabsContent value="inbox" className="space-y-4">
          {!notifications || notifications.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">No unread notifications</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <Card key={n.id} className="hover:bg-card/80">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className="mt-1">
                          <Bell className="h-4 w-4 text-chart-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleArchive(n.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rules tab */}
        <TabsContent value="rules" className="space-y-4">
          {!rules || rules.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">No notification rules configured</CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Event</TableHead>
                    <TableHead className="text-xs">Channels</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Active</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs"><Badge variant="outline">{r.event_type}</Badge></TableCell>
                      <TableCell className="text-xs">{r.channels?.join(', ') || 'in_app'}</TableCell>
                      <TableCell><Badge className={PRIORITY_COLORS[r.priority] || 'bg-muted text-muted-foreground border-border'} variant="outline">{r.priority}</Badge></TableCell>
                      <TableCell><input type="checkbox" checked={r.is_active} className="h-4 w-4 rounded border-border" disabled /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingRule(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRule(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Preferences tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Configure notification settings per event and channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EVENT_TYPES.map(event => (
                  <div key={event} className="border-b pb-4 last:border-b-0">
                    <p className="text-sm font-medium mb-2">{event}</p>
                    <div className="grid grid-cols-3 gap-4">
                      {CHANNELS.map(channel => {
                        const pref = preferences?.find((p: any) => p.event_type === event && p.channel === channel)
                        const enabled = pref?.is_enabled ?? true
                        return (
                          <div key={channel} className="flex items-center gap-2">
                            <Switch checked={enabled} onCheckedChange={(v) => handleSetPreference(channel, event, v)} />
                            <span className="text-xs text-muted-foreground">{channel}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
