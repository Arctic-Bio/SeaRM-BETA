"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { BookOpen, Wand2, ListChecks, Settings as SettingsIcon, Save, KeyRound, Trash2, Loader2, Power, TrendingUp, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { CREW_STATUSES, STATUS_LABELS } from "@/lib/db"
import { INTEGRATION_SOURCES, type FieldMapRule, type IntegrationConnection } from "@/lib/integrations/types"
import { FieldMappingEditor } from "./field-mapping-editor"
import { FieldPreview } from "./field-preview"
import { SetupGuide } from "./setup-guide"
import { IntegrationLogs } from "./integration-logs"
import type { IntegrationLog } from "@/lib/integrations/types"

interface Props {
  connection: IntegrationConnection
  onChanged: () => void
  onDeleted: () => void
}

export function ConnectionDetail({ connection, onChanged, onDeleted }: Props) {
  const [rules, setRules] = useState<FieldMapRule[]>(connection.field_mapping || [])
  const [savingMap, setSavingMap] = useState(false)
  const { data: logs } = useSWR<IntegrationLog[]>(
    `/api/integrations/${connection.id}/logs?limit=1`,
    (url) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  )
  const lastSubmission = logs?.[0]?.payload
  const [form, setForm] = useState({
    name: connection.name,
    source: connection.source,
    default_status: connection.default_status,
    update_existing: connection.update_existing,
    dedupe_field: connection.dedupe_field,
    auto_map: connection.auto_map,
    is_active: connection.is_active,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setRules(connection.field_mapping || [])
    setForm({
      name: connection.name,
      source: connection.source,
      default_status: connection.default_status,
      update_existing: connection.update_existing,
      dedupe_field: connection.dedupe_field,
      auto_map: connection.auto_map,
      is_active: connection.is_active,
    })
  }, [connection])

  useEffect(() => {
    // Prefer the server-derived public base URL (correct for any org/domain/proxy
    // this app is deployed under). Fall back to the browser origin if the call
    // fails. This guarantees the generated webhook URL points at the real
    // deployment, never this preview/test sandbox.
    let cancelled = false
    const fallback = typeof window !== "undefined" ? window.location.origin : ""
    setOrigin(fallback)
    fetch("/api/integrations/base-url")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.baseUrl) setOrigin(d.baseUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const webhookUrl = origin
    ? `${origin}/api/integrations/webhook/${connection.api_key}`
    : `/api/integrations/webhook/${connection.api_key}`

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: connection.id, ...body }),
    })
    return res
  }

  const saveMapping = async () => {
    setSavingMap(true)
    const res = await patch({ field_mapping: rules.filter((r) => r.source.trim()) })
    setSavingMap(false)
    if (res.ok) { toast.success("Field mapping saved"); onChanged() }
    else toast.error("Failed to save mapping")
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    const res = await patch({ ...form })
    setSavingSettings(false)
    if (res.ok) { toast.success("Settings saved"); onChanged() }
    else toast.error("Failed to save settings")
  }

  const toggleActive = async () => {
    const res = await patch({ is_active: !connection.is_active })
    if (res.ok) { toast.success(connection.is_active ? "Connection disabled" : "Connection enabled"); onChanged() }
  }

  const rotateKey = async () => {
    const res = await patch({ action: "rotate_key" })
    if (res.ok) { toast.success("Webhook key rotated - update your form tool with the new URL"); onChanged() }
  }

  const remove = async () => {
    const res = await fetch(`/api/integrations?id=${connection.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Connection deleted"); onDeleted() }
    else toast.error("Failed to delete")
  }

  const sourceLabel = INTEGRATION_SOURCES.find((s) => s.value === connection.source)?.label || connection.source

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight">{connection.name}</h2>
            <Badge variant="outline" className="text-[10px]">{sourceLabel}</Badge>
            {connection.is_active
              ? <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">Active</Badge>
              : <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Disabled</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {connection.total_received} submission{connection.total_received === 1 ? "" : "s"} received
            {connection.last_received_at ? ` · last ${new Date(connection.last_received_at).toLocaleString()}` : " · none yet"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleActive}>
          <Power className="h-3.5 w-3.5" />{connection.is_active ? "Disable" : "Enable"}
        </Button>
      </div>

      <Tabs defaultValue="setup">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" />Setup</TabsTrigger>
          <TabsTrigger value="mapping" className="gap-1.5 text-xs"><Wand2 className="h-3.5 w-3.5" />Mapping</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><ListChecks className="h-3.5 w-3.5" />Activity</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs"><SettingsIcon className="h-3.5 w-3.5" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4">
          <SetupGuide webhookUrl={webhookUrl} source={connection.source} />
        </TabsContent>

        <TabsContent value="mapping" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-3">Your Mapping Rules</h3>
              <FieldMappingEditor rules={rules} onChange={setRules} />
              <Separator className="my-4" />
              <Button size="sm" onClick={saveMapping} disabled={savingMap} className="gap-1.5">
                {savingMap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Mapping
              </Button>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Detect & Preview</h3>
              <FieldPreview 
                lastSubmissionPayload={lastSubmission}
                currentMappings={rules}
                onApplyMapping={setRules}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <IntegrationLogs connectionId={connection.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div className="sm:col-span-2">
              <Label className="text-xs">Connection Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as IntegrationConnection["source"] })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEGRATION_SOURCES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">New profiles get status</Label>
              <Select value={form.default_status} onValueChange={(v) => setForm({ ...form, default_status: v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREW_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Match duplicates by</Label>
              <Select value={form.dedupe_field} onValueChange={(v) => setForm({ ...form, dedupe_field: v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email" className="text-xs">Email</SelectItem>
                  <SelectItem value="phone" className="text-xs">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="auto-map" checked={form.auto_map} onCheckedChange={(v) => setForm({ ...form, auto_map: v })} />
              <Label htmlFor="auto-map" className="text-xs">Auto-map common fields</Label>
            </div>
            <div className="flex items-center gap-2 sm:pt-2">
              <Switch id="update-existing" checked={form.update_existing} onCheckedChange={(v) => setForm({ ...form, update_existing: v })} />
              <Label htmlFor="update-existing" className="text-xs">Update existing crew on duplicate match</Label>
            </div>
          </div>

          <Separator className="my-4" />
          <Button size="sm" onClick={saveSettings} disabled={savingSettings} className="gap-1.5">
            {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Settings
          </Button>

          <Separator className="my-4" />
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Danger Zone</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={rotateKey}>
              <KeyRound className="h-3.5 w-3.5" />Rotate Webhook Key
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30">
                  <Trash2 className="h-3.5 w-3.5" />Delete Connection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this connection?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The webhook URL will stop working immediately and all its submission logs will be removed. Crew profiles already imported are kept. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
