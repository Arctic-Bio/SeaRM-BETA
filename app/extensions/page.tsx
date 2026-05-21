"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Puzzle, Plus, Power, PowerOff, Trash2, Settings, Loader2,
  AlertTriangle, CheckCircle2, BookOpen, Upload, Code2, Shield,
  Activity, ChevronDown, ChevronRight, Clock, Search, RefreshCw,
  Copy, FileJson, Terminal, Layers, Zap, Info, XCircle, Sparkles,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ============================================
// Pre-made Extension Manifests
// ============================================
const PREMADE_EXTENSIONS = [
  {
    slug: "slack-crew-notifier",
    name: "Slack Crew Notifier",
    description: "Posts crew application events, approvals, and voyage departures to a Slack channel via incoming webhook. Keeps your team in the loop without checking the dashboard.",
    version: "1.0.0",
    author: "SeaRM Team",
    category: "communication",
    icon: "slack",
    color: "#4A154B",
    tags: ["slack", "notifications", "crew"],
    permissions: ["register:hooks", "read:crew", "access:api"],
    hooks: [
      { name: "crew.application.received", type: "event", handler: "notifySlack", priority: 10, description: "Notify when a new application is submitted" },
      { name: "crew.application.approved", type: "event", handler: "notifySlack", priority: 10, description: "Notify when an application is approved" },
      { name: "crew.application.rejected", type: "event", handler: "notifySlack", priority: 10, description: "Notify when an application is rejected" },
      { name: "voyage.departed", type: "event", handler: "notifySlack", priority: 10, description: "Notify when a voyage departs" },
    ],
    config_schema: [
      { key: "slack_webhook_url", label: "Slack Webhook URL", type: "url", required: true, placeholder: "https://hooks.slack.com/services/...", description: "Create an incoming webhook in your Slack workspace settings" },
      { key: "channel_name", label: "Channel Name", type: "string", default: "#crew-updates", description: "Display name for the channel (cosmetic only)" },
      { key: "notify_applications", label: "Notify on Applications", type: "boolean", default: true },
      { key: "notify_approvals", label: "Notify on Approvals", type: "boolean", default: true },
      { key: "notify_voyages", label: "Notify on Voyages", type: "boolean", default: true },
    ],
    readme: "# Slack Crew Notifier\n\nSends real-time Slack messages when crew-related events occur.\n\n## Setup\n1. Create a Slack Incoming Webhook at api.slack.com\n2. Paste the webhook URL in the configuration\n3. Activate the extension",
  },
  {
    slug: "document-expiry-monitor",
    name: "Document Expiry Monitor",
    description: "Automatically checks crew documents for upcoming expirations and sends warning emails to administrators. Runs a daily cron check at 7 AM to flag documents expiring within a configurable window.",
    version: "1.0.0",
    author: "SeaRM Team",
    category: "compliance",
    icon: "document",
    color: "#0d9488",
    tags: ["compliance", "documents", "cron", "email"],
    permissions: ["register:hooks", "register:cron", "read:documents", "send:email"],
    hooks: [
      { name: "document.uploaded", type: "event", handler: "trackDocument", priority: 5, description: "Track newly uploaded documents for expiry" },
      { name: "document.verified", type: "event", handler: "updateTracking", priority: 5, description: "Update tracking when a document is verified" },
    ],
    cron_jobs: [
      { name: "check-expiry-daily", schedule: "0 7 * * *", handler: "checkExpiring", description: "Daily check at 7 AM for expiring documents" },
    ],
    config_schema: [
      { key: "warn_days_before", label: "Warning Days Before Expiry", type: "number", default: 30, description: "Days before expiry to send a warning" },
      { key: "critical_days_before", label: "Critical Days Before Expiry", type: "number", default: 7, description: "Days before expiry to flag as critical" },
      { key: "email_admin", label: "Email Admin on Critical", type: "boolean", default: true },
      { key: "admin_email", label: "Admin Email", type: "string", placeholder: "admin@company.com", description: "Email address for critical notifications" },
      { key: "include_expired", label: "Include Already Expired", type: "boolean", default: false, description: "Also flag documents that have already expired" },
    ],
    readme: "# Document Expiry Monitor\n\nAutomates compliance tracking for crew certifications, licenses, and other documents with expiration dates.\n\n## How It Works\n- Hooks into document uploads to start tracking\n- Runs daily at 7 AM to check for upcoming expirations\n- Sends warning emails at configurable thresholds",
  },
  {
    slug: "voyage-weather-briefing",
    name: "Voyage Weather Briefing",
    description: "Attaches a weather and sea conditions briefing to voyages before departure. Hooks into voyage status changes and logs weather data from a configurable API endpoint for operational planning.",
    version: "1.0.0",
    author: "SeaRM Team",
    category: "operations",
    icon: "weather",
    color: "#3b82f6",
    tags: ["weather", "voyages", "operations", "api"],
    permissions: ["register:hooks", "read:voyages", "write:voyages", "access:api"],
    hooks: [
      { name: "voyage.status_changed", type: "event", handler: "checkWeather", priority: 5, description: "Fetch weather data when voyage status changes to 'departing'" },
      { name: "voyage.created", type: "event", handler: "scheduleWeatherCheck", priority: 10, description: "Schedule a weather check when a new voyage is created" },
    ],
    config_schema: [
      { key: "weather_api_url", label: "Weather API URL", type: "url", placeholder: "https://api.openweathermap.org/data/3.0/...", description: "Endpoint for fetching marine weather data" },
      { key: "api_key", label: "API Key", type: "password", placeholder: "Your weather API key", description: "Authentication key for the weather service" },
      { key: "auto_attach", label: "Auto-attach to Voyage Notes", type: "boolean", default: true, description: "Automatically append weather briefing to voyage notes" },
      { key: "check_hours_before", label: "Check Hours Before Departure", type: "number", default: 12, description: "Fetch weather this many hours before departure" },
    ],
    readme: "# Voyage Weather Briefing\n\nPulls marine weather forecasts and sea condition data for planned voyages.\n\n## Setup\n1. Obtain an API key from a weather data provider\n2. Configure the API URL and key\n3. Enable auto-attach to have briefings added to voyage notes automatically",
  },
  {
    slug: "crew-onboarding-automator",
    name: "Crew Onboarding Automator",
    description: "Automates the crew onboarding workflow when an application is approved. Creates checklist items, sends welcome emails, assigns default training tasks, and logs the onboarding event for audit.",
    version: "1.0.0",
    author: "SeaRM Team",
    category: "crew",
    icon: "onboarding",
    color: "#ea580c",
    tags: ["crew", "onboarding", "automation", "tasks", "email"],
    permissions: ["register:hooks", "read:crew", "write:crew", "write:tasks", "write:checklists", "send:email"],
    hooks: [
      { name: "crew.application.approved", type: "event", handler: "startOnboarding", priority: 1, description: "Kick off the full onboarding workflow on approval" },
      { name: "crew.checklist.completed", type: "event", handler: "checkOnboardingComplete", priority: 5, description: "Check if all onboarding items are done" },
      { name: "crew.assignment.created", type: "event", handler: "assignTrainingTasks", priority: 10, description: "Auto-assign training tasks when crew is assigned to a voyage" },
    ],
    config_schema: [
      { key: "welcome_email_template", label: "Welcome Email Template", type: "select", default: "default_welcome", description: "Which email template to send on approval", options: [{ value: "default_welcome", label: "Default Welcome" }, { value: "custom", label: "Custom Template" }] },
      { key: "auto_create_checklist", label: "Auto-create Checklist", type: "boolean", default: true, description: "Automatically create onboarding checklist items" },
      { key: "default_training_tasks", label: "Default Training Tasks", type: "textarea", default: "Safety Briefing\nFire Drill Orientation\nEmergency Procedures Review\nEquipment Familiarization", description: "One task per line -- these are created as tasks when crew is assigned" },
      { key: "notify_supervisor", label: "Notify Supervisor", type: "boolean", default: true, description: "Send a notification to the supervisor or department head" },
      { key: "probation_days", label: "Probation Period (days)", type: "number", default: 90, description: "Days of probation for new crew members" },
    ],
    readme: "# Crew Onboarding Automator\n\nStreamlines the onboarding process from application approval through first voyage assignment.\n\n## What It Does\n1. Sends a welcome email using your configured template\n2. Creates a checklist of onboarding items\n3. Assigns default training tasks when crew is put on a voyage\n4. Tracks onboarding completion status",
  },
  {
    slug: "maintenance-scheduler",
    name: "Maintenance Scheduler",
    description: "Automatically generates recurring maintenance tasks for ships based on configurable intervals. Tracks maintenance hours, creates follow-up inspections, and escalates overdue maintenance to administrators.",
    version: "1.0.0",
    author: "SeaRM Team",
    category: "operations",
    icon: "maintenance",
    color: "#7c3aed",
    tags: ["maintenance", "ships", "cron", "tasks", "scheduling"],
    permissions: ["register:hooks", "register:cron", "read:ships", "write:tasks", "read:maintenance", "write:maintenance", "send:email"],
    hooks: [
      { name: "maintenance.completed", type: "event", handler: "scheduleFollowUp", priority: 5, description: "Schedule a follow-up inspection when maintenance is completed" },
      { name: "ship.status_changed", type: "event", handler: "checkMaintenanceDue", priority: 10, description: "Check if returning ships have overdue maintenance" },
    ],
    cron_jobs: [
      { name: "generate-recurring-tasks", schedule: "0 6 * * 1", handler: "generateRecurringMaintenance", description: "Weekly check (Mon 6 AM) for scheduled maintenance" },
      { name: "escalate-overdue", schedule: "0 8 * * *", handler: "escalateOverdue", description: "Daily escalation of overdue maintenance at 8 AM" },
    ],
    config_schema: [
      { key: "default_interval_days", label: "Default Interval (days)", type: "number", default: 90, description: "Default days between recurring maintenance tasks" },
      { key: "overdue_threshold_days", label: "Overdue Threshold (days)", type: "number", default: 7, description: "Days past due before escalating to admin" },
      { key: "escalation_email", label: "Escalation Email", type: "string", placeholder: "ops@company.com", description: "Email for overdue maintenance escalations" },
      { key: "auto_create_tasks", label: "Auto-create Tasks", type: "boolean", default: true, description: "Automatically create tasks for scheduled maintenance" },
      { key: "follow_up_days", label: "Follow-up Inspection (days)", type: "number", default: 7, description: "Days after completion to schedule a follow-up inspection" },
    ],
    readme: "# Maintenance Scheduler\n\nKeeps your fleet maintenance on track with automated scheduling and escalation.\n\n## Features\n- Weekly recurring maintenance task generation\n- Post-maintenance follow-up inspections\n- Overdue maintenance escalation emails\n- Ship status change hooks for return-to-port checks",
  },
]

const PREMADE_ICONS: Record<string, any> = {
  slack: Zap,
  document: FileJson,
  weather: Activity,
  onboarding: Upload,
  maintenance: Layers,
}

// ============================================
// Installed Extensions Tab
// ============================================
function InstalledTab() {
  const { data: extensions, mutate } = useSWR("/api/extensions", fetcher)
  const [acting, setActing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [configEdits, setConfigEdits] = useState<Record<string, Record<string, any>>>({})
  const [savingConfig, setSavingConfig] = useState<string | null>(null)

  const handleAction = async (id: string, action: string) => {
    setActing(id)
    const res = await fetch(`/api/extensions/${id}`, {
      method: action === "uninstall" ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: action !== "uninstall" ? JSON.stringify({ action }) : undefined,
    })
    setActing(null)
    if (res.ok) {
      toast.success(`Extension ${action}d successfully`)
      mutate()
    } else {
      const err = await res.json()
      toast.error(err.error || `Failed to ${action}`)
    }
  }

  const handleSaveConfig = async (id: string) => {
    const config = configEdits[id]
    if (!config) return
    setSavingConfig(id)
    const res = await fetch(`/api/extensions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "configure", config }),
    })
    setSavingConfig(null)
    if (res.ok) {
      toast.success("Configuration saved")
      setConfigEdits(prev => { const n = { ...prev }; delete n[id]; return n })
      mutate()
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to save config")
    }
  }

  const loadConfig = async (id: string) => {
    const res = await fetch(`/api/extensions/${id}`)
    if (res.ok) {
      const ext = await res.json()
      setConfigEdits(prev => ({ ...prev, [id]: ext.config || {} }))
    }
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    inactive: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    installing: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  }

  const categoryIcons: Record<string, any> = {
    general: Puzzle, communication: Zap, reporting: Activity, integration: Layers,
    automation: RefreshCw, compliance: Shield, crew: Puzzle, operations: Puzzle,
    finance: Puzzle, safety: Shield, custom: Code2,
  }

  if (!extensions) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex flex-col gap-3">
      {!Array.isArray(extensions) || extensions.length === 0 ? (
        <div className="flex flex-col gap-5">
          <div className="py-10 text-center border rounded-lg">
            <Puzzle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No extensions installed</p>
            <p className="text-xs text-muted-foreground mt-1">Browse the Default Extensions tab for ready-to-install options, or paste a custom JSON manifest.</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" />Recommended Extensions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PREMADE_EXTENSIONS.slice(0, 3).map(ext => {
                const Icon = PREMADE_ICONS[ext.icon] || Puzzle
                return (
                  <div key={ext.slug} className="rounded-lg border bg-card overflow-hidden">
                    <div className="h-1" style={{ background: ext.color }} />
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-md" style={{ background: `${ext.color}12` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: ext.color }} />
                        </div>
                        <span className="text-xs font-medium">{ext.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{ext.description}</p>
                      <Button size="sm" variant="outline" className="w-full h-6 text-[10px] gap-1" onClick={async () => {
                        const res = await fetch("/api/extensions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ manifest: ext }),
                        })
                        if (res.ok) { toast.success(`"${ext.name}" installed!`); mutate() }
                        else { const err = await res.json(); toast.error(err.error || "Failed") }
                      }}>
                        <Plus className="h-2.5 w-2.5" />Install
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        extensions.map((ext: any) => {
          const Icon = categoryIcons[ext.category] || Puzzle
          const isExpanded = expanded === ext.id
          return (
            <div key={ext.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-3 p-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{ext.name}</span>
                    <Badge variant="outline" className="text-[9px]">v{ext.version}</Badge>
                    <Badge variant="outline" className={`text-[9px] ${statusColors[ext.status] || ""}`}>{ext.status}</Badge>
                    <Badge variant="outline" className="text-[9px]">{ext.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{ext.description || "No description"}</p>
                  {ext.author && <p className="text-[10px] text-muted-foreground/70">by {ext.author}</p>}
                  {ext.error_count > 0 && (
                    <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" />{ext.error_count} error(s) -- Last: {ext.last_error?.substring(0, 80)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ext.status === "inactive" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(ext.id, "activate")} disabled={acting === ext.id}>
                      {acting === ext.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}Activate
                    </Button>
                  )}
                  {ext.status === "active" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(ext.id, "deactivate")} disabled={acting === ext.id}>
                      {acting === ext.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PowerOff className="h-3 w-3" />}Deactivate
                    </Button>
                  )}
                  {ext.error_count > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(ext.id, "clear_errors")}>
                      <RefreshCw className="h-3 w-3" />Clear Errors
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                    onClick={() => { setExpanded(isExpanded ? null : ext.id); if (!isExpanded && !configEdits[ext.id]) loadConfig(ext.id) }}>
                    <Settings className="h-3 w-3" />{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleAction(ext.id, "uninstall")} disabled={acting === ext.id}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded config/details panel */}
              {isExpanded && (
                <div className="border-t bg-muted/30 p-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div><p className="text-[10px] text-muted-foreground">Slug</p><p className="text-xs font-mono">{ext.slug}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Installed</p><p className="text-xs">{new Date(ext.installed_at).toLocaleDateString()}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Hooks</p><p className="text-xs">{Array.isArray(ext.hooks) ? ext.hooks.length : 0}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Permissions</p><p className="text-xs">{Array.isArray(ext.permissions) ? ext.permissions.length : 0}</p></div>
                  </div>

                  {/* Permissions */}
                  {Array.isArray(ext.permissions) && ext.permissions.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Permissions</p>
                      <div className="flex flex-wrap gap-1">
                        {ext.permissions.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[9px] font-mono">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hooks list */}
                  {Array.isArray(ext.hooks) && ext.hooks.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Registered Hooks</p>
                      <div className="flex flex-col gap-1">
                        {ext.hooks.map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-background border">
                            <Zap className="h-3 w-3 text-chart-4 shrink-0" />
                            <span className="font-mono text-[11px]">{h.name}</span>
                            <Badge variant="outline" className="text-[8px]">{h.type}</Badge>
                            <span className="text-muted-foreground ml-auto text-[10px]">priority: {h.priority || 10}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuration */}
                  {Array.isArray(ext.config_schema) && ext.config_schema.length > 0 && (
                    <div>
                      <Separator className="my-3" />
                      <p className="text-[10px] font-medium text-muted-foreground mb-2">Configuration</p>
                      <div className="flex flex-col gap-2">
                        {ext.config_schema.map((field: any) => (
                          <div key={field.key} className="grid grid-cols-3 gap-2 items-center">
                            <div>
                              <p className="text-xs font-medium">{field.label}</p>
                              {field.description && <p className="text-[10px] text-muted-foreground">{field.description}</p>}
                            </div>
                            <div className="col-span-2">
                              {field.type === "boolean" ? (
                                <Button variant="outline" size="sm" className="h-7 text-xs"
                                  onClick={() => setConfigEdits(prev => ({
                                    ...prev, [ext.id]: { ...prev[ext.id], [field.key]: !(prev[ext.id]?.[field.key] ?? field.default ?? false) }
                                  }))}>
                                  {(configEdits[ext.id]?.[field.key] ?? field.default ?? false) ? "Enabled" : "Disabled"}
                                </Button>
                              ) : field.type === "select" && field.options ? (
                                <select className="h-7 text-xs rounded border bg-background px-2 w-full"
                                  value={configEdits[ext.id]?.[field.key] ?? field.default ?? ""}
                                  onChange={e => setConfigEdits(prev => ({ ...prev, [ext.id]: { ...prev[ext.id], [field.key]: e.target.value } }))}>
                                  {field.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              ) : field.type === "textarea" ? (
                                <Textarea className="text-xs min-h-[60px]" placeholder={field.placeholder || ""}
                                  value={configEdits[ext.id]?.[field.key] ?? field.default ?? ""}
                                  onChange={e => setConfigEdits(prev => ({ ...prev, [ext.id]: { ...prev[ext.id], [field.key]: e.target.value } }))} />
                              ) : (
                                <Input className="h-7 text-xs" type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                                  placeholder={field.placeholder || ""}
                                  value={configEdits[ext.id]?.[field.key] ?? field.default ?? ""}
                                  onChange={e => setConfigEdits(prev => ({ ...prev, [ext.id]: { ...prev[ext.id], [field.key]: e.target.value } }))} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1 mt-3" onClick={() => handleSaveConfig(ext.id)} disabled={savingConfig === ext.id}>
                        {savingConfig === ext.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}Save Configuration
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================
// Install Extension Tab
// ============================================
function InstallTab({ onInstalled }: { onInstalled: () => void }) {
  const [manifestJson, setManifestJson] = useState("")
  const [validating, setValidating] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)

  const exampleManifest = {
    slug: "my-extension",
    name: "My Custom Extension",
    description: "A sample SeaRM extension that hooks into crew events",
    version: "1.0.0",
    author: "Your Name",
    category: "general",
    permissions: ["register:hooks", "read:crew", "send:email"],
    hooks: [
      { name: "crew.application.received", type: "event", handler: "onCrewApply", priority: 10, description: "Runs when a new crew application is received" }
    ],
    config_schema: [
      { key: "webhook_url", label: "Webhook URL", type: "url", description: "URL to POST notifications to", placeholder: "https://example.com/webhook" },
      { key: "enabled", label: "Enabled", type: "boolean", default: true },
    ],
    readme: "# My Extension\\n\\nThis extension demonstrates the SeaRM extension API.",
  }

  const handleValidate = async () => {
    try {
      const manifest = JSON.parse(manifestJson)
      setValidating(true)
      const res = await fetch("/api/extensions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest }),
      })
      const result = await res.json()
      setValidation(result)
      setValidating(false)
    } catch (err: any) {
      setValidation({ valid: false, errors: ["Invalid JSON: " + err.message], warnings: [] })
      setValidating(false)
    }
  }

  const handleInstall = async () => {
    try {
      const manifest = JSON.parse(manifestJson)
      setInstalling(true)
      const res = await fetch("/api/extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest }),
      })
      const result = await res.json()
      setInstalling(false)
      if (res.ok) {
        toast.success(`Extension '${manifest.name}' installed successfully`)
        setManifestJson("")
        setValidation(null)
        onInstalled()
      } else {
        toast.error(result.error || "Installation failed")
        if (result.errors) setValidation({ valid: false, errors: result.errors, warnings: result.warnings || [] })
      }
    } catch (err: any) {
      setInstalling(false)
      toast.error("Invalid JSON: " + err.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Install from Manifest</CardTitle>
          <CardDescription>Paste an extension manifest JSON to validate and install.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setManifestJson(JSON.stringify(exampleManifest, null, 2)); setValidation(null) }}>
                <Copy className="h-3 w-3" />Load Example
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setManifestJson(""); setValidation(null) }}>
                <XCircle className="h-3 w-3" />Clear
              </Button>
            </div>
            <Textarea
              className="font-mono text-xs min-h-[300px] leading-relaxed"
              placeholder='{\n  "slug": "my-extension",\n  "name": "My Extension",\n  ...\n}'
              value={manifestJson}
              onChange={e => { setManifestJson(e.target.value); setValidation(null) }}
            />

            {validation && (
              <div className={`rounded-lg border p-3 ${validation.valid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                <p className={`text-xs font-medium flex items-center gap-1 ${validation.valid ? "text-emerald-600" : "text-destructive"}`}>
                  {validation.valid ? <><CheckCircle2 className="h-3.5 w-3.5" />Manifest is valid</> : <><AlertTriangle className="h-3.5 w-3.5" />Validation failed</>}
                </p>
                {validation.errors.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {validation.errors.map((e, i) => <li key={i} className="text-[11px] text-destructive flex items-start gap-1"><XCircle className="h-3 w-3 mt-0.5 shrink-0" />{e}</li>)}
                  </ul>
                )}
                {validation.warnings.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {validation.warnings.map((w, i) => <li key={i} className="text-[11px] text-chart-1 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{w}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleValidate} disabled={validating || !manifestJson.trim()}>
                {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}Validate
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleInstall} disabled={installing || !manifestJson.trim()}>
                {installing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}Install Extension
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// Developer Documentation Tab
// ============================================
function DocsTab() {
  const [openSection, setOpenSection] = useState<string | null>("manifest")

  const sections = [
    {
      id: "manifest", title: "Extension Manifest", icon: FileJson,
      content: `An extension is defined by a JSON manifest that declares its identity, capabilities, and configuration. Every extension must have a unique \`slug\`, a \`name\`, \`description\`, \`version\` (semver), and a \`category\`.

\`\`\`json
{
  "slug": "crew-notifier",
  "name": "Crew Notifier",
  "description": "Sends webhook notifications for crew events",
  "version": "1.0.0",
  "author": "Your Org",
  "category": "communication",
  "permissions": ["register:hooks", "read:crew", "send:email"],
  "hooks": [...],
  "config_schema": [...],
  "readme": "# Crew Notifier\\n\\nThis extension..."
}
\`\`\``,
    },
    {
      id: "permissions", title: "Permissions", icon: Shield,
      content: `Extensions must declare which permissions they need. Users see these before installation.

**Available Permissions:**
- \`read:crew\` / \`write:crew\` -- Access crew member data
- \`read:voyages\` / \`write:voyages\` -- Access voyage/deployment data
- \`read:documents\` / \`write:documents\` -- Access document storage
- \`read:tasks\` / \`write:tasks\` -- Access task management
- \`read:settings\` / \`write:settings\` -- Access system settings
- \`send:email\` -- Send emails through the email system
- \`read:queue\` / \`write:queue\` -- Access email queue
- \`access:database\` -- Direct database read access
- \`access:api\` -- Make external API calls
- \`register:hooks\` -- Register event hooks
- \`register:routes\` -- Register custom API routes
- \`register:ui\` -- Register UI components
- \`register:cron\` -- Register cron jobs
- \`admin:full\` -- Full admin access (use sparingly)`,
    },
    {
      id: "hooks", title: "Event Hooks", icon: Zap,
      content: `Hooks let your extension react to system events. When an event fires, all registered hooks run in priority order.

\`\`\`json
{
  "hooks": [
    {
      "name": "crew.application.received",
      "type": "event",
      "handler": "onCrewApply",
      "priority": 10,
      "timeout_ms": 5000,
      "conditions": {
        "position": { "$in": ["captain", "first_mate"] }
      }
    }
  ]
}
\`\`\`

**Available Events:**
- \`crew.application.received/approved/rejected\`
- \`crew.profile.updated\`, \`crew.status.changed\`
- \`document.uploaded/signed/verified/expired\`
- \`voyage.created/departed/completed\`
- \`voyage.crew.assigned/removed\`
- \`task.created/completed/overdue\`
- \`email.sent/failed/bounced\`
- \`system.startup\`, \`system.cron.tick\`, \`system.user.login\`
- \`extension.installed/activated/deactivated/error\`

**Condition Operators:** \`$eq\`, \`$ne\`, \`$gt\`, \`$gte\`, \`$lt\`, \`$lte\`, \`$in\`, \`$nin\`, \`$exists\`, \`$regex\``,
    },
    {
      id: "config", title: "Configuration Schema", icon: Settings,
      content: `Define user-configurable settings with a typed schema. SeaRM auto-generates the settings UI.

\`\`\`json
{
  "config_schema": [
    {
      "key": "webhook_url",
      "label": "Webhook URL",
      "type": "url",
      "description": "Endpoint to receive notifications",
      "required": true,
      "placeholder": "https://example.com/hook"
    },
    {
      "key": "notify_on",
      "label": "Notify On",
      "type": "multiselect",
      "options": [
        { "label": "Applications", "value": "applications" },
        { "label": "Deployments", "value": "deployments" }
      ],
      "default": ["applications"]
    },
    {
      "key": "api_key",
      "label": "API Key",
      "type": "password",
      "description": "Stored encrypted"
    },
    {
      "key": "max_retries",
      "label": "Max Retries",
      "type": "number",
      "default": 3,
      "validation": { "min": 0, "max": 10 }
    }
  ]
}
\`\`\`

**Field Types:** \`string\`, \`number\`, \`boolean\`, \`select\`, \`multiselect\`, \`textarea\`, \`password\`, \`url\`, \`email\`, \`json\`, \`color\`, \`date\``,
    },
    {
      id: "routes", title: "Custom API Routes", icon: Terminal,
      content: `Extensions can register custom API routes under the \`/ext/\` namespace.

\`\`\`json
{
  "routes": [
    {
      "method": "POST",
      "path": "/ext/crew-notifier/webhook",
      "handler": "handleWebhook",
      "auth_required": false,
      "description": "Receive inbound webhooks"
    },
    {
      "method": "GET",
      "path": "/ext/crew-notifier/status",
      "handler": "getStatus",
      "auth_required": true,
      "permissions": ["read:settings"]
    }
  ]
}
\`\`\`

Routes are automatically namespaced and protected. Set \`auth_required: false\` for public endpoints like webhooks.`,
    },
    {
      id: "cron", title: "Cron Jobs", icon: Clock,
      content: `Schedule recurring tasks using cron expressions. Runs via Vercel Cron Jobs.

\`\`\`json
{
  "cron_jobs": [
    {
      "name": "daily-digest",
      "schedule": "0 8 * * *",
      "handler": "sendDailyDigest",
      "timeout_ms": 30000,
      "description": "Send daily summary email at 8am"
    },
    {
      "name": "expire-check",
      "schedule": "0 */6 * * *",
      "handler": "checkExpiredDocs",
      "description": "Check for expiring documents every 6 hours"
    }
  ]
}
\`\`\`

**Schedule format:** Standard cron (\`minute hour day month weekday\`).`,
    },
    {
      id: "ui-slots", title: "UI Slots", icon: Layers,
      content: `Extensions can inject UI components into predefined slots throughout the application.

\`\`\`json
{
  "ui_slots": [
    {
      "slot": "dashboard_widget",
      "component": "CrewStatsWidget",
      "label": "Crew Statistics",
      "icon": "BarChart",
      "priority": 5
    },
    {
      "slot": "crew_detail_tab",
      "component": "TrainingHistory",
      "label": "Training"
    }
  ]
}
\`\`\`

**Available Slots:**
- \`dashboard_widget\` -- Main dashboard cards
- \`crew_detail_tab\` -- Extra tabs on crew detail page
- \`sidebar_item\` -- Additional sidebar navigation
- \`settings_section\` -- Extra settings sections
- \`toolbar_action\` -- Top toolbar buttons
- \`crew_list_column\` -- Custom columns in crew list
- \`voyage_detail_tab\` -- Extra tabs on voyage detail page`,
    },
    {
      id: "lifecycle", title: "Extension Lifecycle", icon: Activity,
      content: `Extensions follow a clear lifecycle:

1. **Validate** -- Manifest is checked for required fields, valid permissions, and correct structure
2. **Install** -- Extension is registered in the database with status \`inactive\`. Config defaults are initialized, hooks are registered.
3. **Activate** -- Status changes to \`active\`. All hooks start responding to events. Dependencies are verified.
4. **Configure** -- Admin adjusts settings via the auto-generated config UI. Changes take effect immediately.
5. **Deactivate** -- Status changes to \`inactive\`. Hooks stop firing. Dependent extensions are checked first.
6. **Uninstall** -- Extension is fully removed. All config, hooks, and logs are deleted. Dependents are checked.

**Error Handling:** If a hook throws an error, the error is recorded against the extension. After repeated failures, admins are notified. Errors never break the main application flow.

**Dependencies:** Extensions can declare dependencies on other extensions via the \`dependencies\` array (list of slugs). Dependencies must be installed and active before the dependent can activate.`,
    },
    {
      id: "examples", title: "Full Examples", icon: Code2,
      content: `**Example 1: Slack Notifier**
\`\`\`json
{
  "slug": "slack-notifier",
  "name": "Slack Notifications",
  "description": "Post crew events to a Slack channel",
  "version": "1.0.0",
  "author": "SeaRM Community",
  "category": "communication",
  "permissions": ["register:hooks", "read:crew", "access:api"],
  "hooks": [
    { "name": "crew.application.received", "type": "event", "handler": "notifySlack", "priority": 10 },
    { "name": "crew.application.approved", "type": "event", "handler": "notifySlack", "priority": 10 },
    { "name": "voyage.departed", "type": "event", "handler": "notifySlack", "priority": 10 }
  ],
  "config_schema": [
    { "key": "slack_webhook_url", "label": "Slack Webhook URL", "type": "url", "required": true, "placeholder": "https://hooks.slack.com/services/..." },
    { "key": "channel_name", "label": "Channel", "type": "string", "default": "#crew-updates" },
    { "key": "notify_applications", "label": "Notify on Applications", "type": "boolean", "default": true },
    { "key": "notify_voyages", "label": "Notify on Voyages", "type": "boolean", "default": true }
  ]
}
\`\`\`

**Example 2: Document Expiry Monitor**
\`\`\`json
{
  "slug": "doc-expiry-monitor",
  "name": "Document Expiry Monitor",
  "description": "Alerts when crew documents are about to expire",
  "version": "1.0.0",
  "category": "compliance",
  "permissions": ["register:hooks", "register:cron", "read:documents", "send:email"],
  "hooks": [
    { "name": "document.uploaded", "type": "event", "handler": "trackDocument" }
  ],
  "cron_jobs": [
    { "name": "check-expiry", "schedule": "0 7 * * *", "handler": "checkExpiring", "description": "Daily check at 7am" }
  ],
  "config_schema": [
    { "key": "warn_days_before", "label": "Warning Days Before Expiry", "type": "number", "default": 30 },
    { "key": "critical_days_before", "label": "Critical Days Before Expiry", "type": "number", "default": 7 },
    { "key": "email_admin", "label": "Email Admin on Critical", "type": "boolean", "default": true }
  ]
}
\`\`\``,
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1 pb-2">
        <p className="text-xs text-muted-foreground">
          Complete reference for building SeaRM extensions. Extensions are JSON manifests that declare hooks, routes, cron jobs, UI slots, and configuration schemas. No code deployment needed -- install via the Install tab.
        </p>
      </div>
      {sections.map(section => {
        const Icon = section.icon
        const isOpen = openSection === section.id
        return (
          <div key={section.id} className="rounded-lg border bg-card overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/5 transition-colors"
              onClick={() => setOpenSection(isOpen ? null : section.id)}>
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium flex-1">{section.title}</span>
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="border-t bg-muted/20 px-4 py-3">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground/80">{section.content}</pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Logs Tab
// ============================================
function LogsTab() {
  const [levelFilter, setLevelFilter] = useState("")
  const { data, mutate } = useSWR(`/api/extensions/logs?limit=100${levelFilter ? `&level=${levelFilter}` : ""}`, fetcher)
  const logs = data?.logs || []

  const levelColors: Record<string, string> = {
    info: "bg-chart-2/10 text-chart-2",
    warn: "bg-chart-1/10 text-chart-1",
    error: "bg-destructive/10 text-destructive",
    debug: "bg-muted text-muted-foreground",
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <select className="h-7 text-xs rounded border bg-background px-2" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => mutate()}>
          <RefreshCw className="h-3 w-3" />Refresh
        </Button>
        <p className="text-[10px] text-muted-foreground ml-auto">{logs.length} entries</p>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center border rounded-lg">
          <Activity className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No log entries found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-start gap-2 px-3 py-2 rounded border bg-card text-xs">
              <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 shrink-0 mt-0.5 ${levelColors[log.level] || ""}`}>{log.level}</Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{log.action}</span>
                  {log.extension_name && <Badge variant="outline" className="text-[8px]">{log.extension_name}</Badge>}
                  <span className="text-muted-foreground ml-auto text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 break-all">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Default Extensions (Marketplace)
// ============================================
function DefaultExtensionsTab({ onInstalled }: { onInstalled: () => void }) {
  const { data: installed } = useSWR("/api/extensions", fetcher)
  const [installing, setInstalling] = useState<string | null>(null)

  const installedSlugs = new Set(
    (Array.isArray(installed) ? installed : []).map((ext: any) => ext.slug)
  )

  const handleInstall = async (manifest: typeof PREMADE_EXTENSIONS[number]) => {
    setInstalling(manifest.slug)
    try {
      const res = await fetch("/api/extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest }),
      })
      if (res.ok) {
        toast.success(`"${manifest.name}" installed! Go to Installed to activate it.`)
        onInstalled()
      } else {
        const err = await res.json()
        toast.error(err.error || "Installation failed")
      }
    } catch {
      toast.error("Installation failed")
    }
    setInstalling(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Default Extensions</h2>
        <p className="text-xs text-muted-foreground">Ready-to-install extensions built for common maritime operations. Install with one click, then configure and activate from the Installed tab.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PREMADE_EXTENSIONS.map(ext => {
          const Icon = PREMADE_ICONS[ext.icon] || Puzzle
          const isInstalled = installedSlugs.has(ext.slug)
          return (
            <Card key={ext.slug} className={`overflow-hidden flex flex-col ${isInstalled ? "opacity-70" : ""}`}>
              <div className="h-1.5" style={{ background: ext.color }} />
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg shrink-0" style={{ background: `${ext.color}12` }}>
                    <Icon className="h-5 w-5" style={{ color: ext.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm">{ext.name}</CardTitle>
                      <Badge variant="outline" className="text-[9px]">v{ext.version}</Badge>
                      <Badge variant="outline" className="text-[9px]">{ext.category}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">by {ext.author}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                <CardDescription className="text-xs leading-relaxed">{ext.description}</CardDescription>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {ext.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[9px] font-normal">{tag}</Badge>
                  ))}
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{ext.hooks.length} hook{ext.hooks.length !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{ext.permissions.length} permission{ext.permissions.length !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Settings className="h-3 w-3" />{ext.config_schema.length} setting{ext.config_schema.length !== 1 ? "s" : ""}</span>
                  {ext.cron_jobs && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ext.cron_jobs.length} cron job{ext.cron_jobs.length !== 1 ? "s" : ""}</span>}
                </div>

                {/* Hooks list */}
                <div className="border rounded-md p-2 bg-muted/30">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Event Hooks</p>
                  <div className="flex flex-col gap-1">
                    {ext.hooks.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ext.color }} />
                        <span className="font-mono text-[10px] text-foreground/70">{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-1">
                  {isInstalled ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Already installed</span>
                    </div>
                  ) : (
                    <Button size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={() => handleInstall(ext)} disabled={installing === ext.slug}>
                      {installing === ext.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Install Extension
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Main Extensions Page
// ============================================
export default function ExtensionsPage() {
  const [tab, setTab] = useState<"installed" | "defaults" | "install" | "docs" | "logs">("installed")
  const { mutate: mutateExtensions } = useSWR("/api/extensions", fetcher)

  const tabs = [
    { id: "installed" as const, label: "Installed", icon: Puzzle },
    { id: "defaults" as const, label: "Default Extensions", icon: Sparkles },
    { id: "install" as const, label: "Install Custom", icon: Plus },
    { id: "docs" as const, label: "Developer Guide", icon: BookOpen },
    { id: "logs" as const, label: "Logs", icon: Activity },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Puzzle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Extensions</h1>
          <p className="text-xs text-muted-foreground">Install, configure, and manage SeaRM extensions. Build custom integrations with the extension framework.</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b mb-4 pb-px">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/5"
              }`}
              onClick={() => setTab(t.id)}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === "installed" && <InstalledTab />}
      {tab === "defaults" && <DefaultExtensionsTab onInstalled={() => mutateExtensions()} />}
      {tab === "install" && <InstallTab onInstalled={() => { setTab("installed"); mutateExtensions() }} />}
      {tab === "docs" && <DocsTab />}
      {tab === "logs" && <LogsTab />}
    </div>
  )
}
