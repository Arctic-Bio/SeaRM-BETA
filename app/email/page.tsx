"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Mail, Server, FileText, Zap, ListOrdered, Plus, Trash2, Loader2, CheckCircle2, XCircle,
  Eye, Copy, Send, RefreshCw, Search, Filter, RotateCcw, Clock, AlertTriangle, Settings2,
  ChevronDown, ChevronRight, Pencil,
} from "lucide-react"
import { SYSTEM_EVENTS, TEMPLATE_CATEGORIES, DEFAULT_VARIABLES } from "@/lib/email/types"
import type { EmailProvider, EmailTemplate, EmailTrigger, EmailQueueItem, SystemEvent, TemplateCategory, RecipientType } from "@/lib/email/types"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ============================================================================
// Main Email Page
// ============================================================================
export default function EmailPage() {
  const [activeTab, setActiveTab] = useState("providers")

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />Email Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure email providers, create templates, set up event triggers, and monitor delivery.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="providers" className="gap-1.5 text-xs"><Server className="h-3.5 w-3.5" />Providers</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Triggers</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5 text-xs"><ListOrdered className="h-3.5 w-3.5" />Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="providers"><ProvidersTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="triggers"><TriggersTab /></TabsContent>
        <TabsContent value="queue"><QueueTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// PROVIDERS TAB
// ============================================================================
function ProvidersTab() {
  const { data: providers, mutate } = useSWR<EmailProvider[]>("/api/email/providers", fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", provider_type: "smtp", host: "", port: "587", secure: true,
    username: "", password: "", from_email: "", from_name: "", reply_to: "",
    max_per_hour: "100", tls_reject_unauthorized: true, is_default: false,
  })

  const resetForm = () => {
    setForm({ name: "", provider_type: "smtp", host: "", port: "587", secure: true, username: "", password: "", from_email: "", from_name: "", reply_to: "", max_per_hour: "100", tls_reject_unauthorized: true, is_default: false })
    setEditId(null)
    setShowForm(false)
  }

  const loadForEdit = (p: EmailProvider) => {
    setForm({ name: p.name, provider_type: p.provider_type, host: p.host, port: String(p.port), secure: p.secure, username: p.username || "", password: "", from_email: p.from_email, from_name: p.from_name || "", reply_to: p.reply_to || "", max_per_hour: String(p.max_per_hour), tls_reject_unauthorized: p.tls_reject_unauthorized, is_default: p.is_default })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: any = { ...form, port: parseInt(form.port), max_per_hour: parseInt(form.max_per_hour) }
    if (editId) { payload.action = "update"; payload.id = editId }
    const res = await fetch("/api/email/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success(editId ? "Provider updated" : "Provider added"); mutate(); resetForm() }
    else { const err = await res.json(); toast.error(err.error || "Failed") }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    const res = await fetch("/api/email/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", id }) })
    const result = await res.json()
    setTesting(null)
    if (result.success) toast.success("Connection successful")
    else toast.error(`Connection failed: ${result.error}`)
    mutate()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/email/providers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success("Provider deleted"); mutate() }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Email Providers (SMTP)</CardTitle>
              <CardDescription>Configure your mail server connections. Supports SMTP, SendGrid, SES, Mailgun, Postmark, Resend, and custom providers.</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Provider</Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Provider List */}
          {Array.isArray(providers) && providers.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {providers.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-[9px]">{p.provider_type}</Badge>
                      {p.is_default && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Default</Badge>}
                      {!p.is_active && <Badge variant="destructive" className="text-[9px]">Disabled</Badge>}
                      {p.last_test_result === "success" && <Badge variant="outline" className="text-[9px] bg-chart-2/10 text-chart-2 border-chart-2/20 gap-0.5"><CheckCircle2 className="h-2 w-2" />Verified</Badge>}
                      {p.last_test_result === "failure" && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 gap-0.5"><XCircle className="h-2 w-2" />Failed</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.host}:{p.port} &middot; {p.from_email} &middot; {p.max_per_hour}/hr limit</p>
                    {p.last_test_error && <p className="text-[10px] text-destructive mt-0.5 truncate">{p.last_test_error}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleTest(p.id)} disabled={testing === p.id}>
                      {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}Test
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => loadForEdit(p)}>
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg mb-4">
              <Server className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No email providers configured yet. Add your first SMTP server to start sending emails.
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <>
              <Separator className="my-4" />
              <p className="text-xs font-medium text-muted-foreground mb-3">{editId ? "Edit Provider" : "Add New Provider"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Provider Name *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production SMTP" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                  <Select value={form.provider_type} onValueChange={v => setForm({ ...form, provider_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["smtp", "sendgrid", "ses", "mailgun", "postmark", "resend", "custom"].map(t => <SelectItem key={t} value={t} className="text-xs">{t.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Host *</label>
                  <Input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Port</label>
                  <Input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="587" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Username</label>
                  <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="user@example.com" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Password</label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? "Leave blank to keep" : "Password"} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">From Email *</label>
                  <Input type="email" value={form.from_email} onChange={e => setForm({ ...form, from_email: e.target.value })} placeholder="noreply@searm.org" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">From Name</label>
                  <Input value={form.from_name} onChange={e => setForm({ ...form, from_name: e.target.value })} placeholder="SeaRM Crew Management" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Reply-To</label>
                  <Input value={form.reply_to} onChange={e => setForm({ ...form, reply_to: e.target.value })} placeholder="reply@searm.org" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Rate Limit (/hr)</label>
                  <Input value={form.max_per_hour} onChange={e => setForm({ ...form, max_per_hour: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2"><Switch id="prov-secure" checked={form.secure} onCheckedChange={v => setForm({ ...form, secure: v })} /><Label htmlFor="prov-secure" className="text-xs">SSL/TLS</Label></div>
                <div className="flex items-center gap-2"><Switch id="prov-tls" checked={form.tls_reject_unauthorized} onCheckedChange={v => setForm({ ...form, tls_reject_unauthorized: v })} /><Label htmlFor="prov-tls" className="text-xs">Verify TLS Cert</Label></div>
                <div className="flex items-center gap-2"><Switch id="prov-default" checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} /><Label htmlFor="prov-default" className="text-xs">Set as Default</Label></div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}{editId ? "Update" : "Save"} Provider</Button>
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// TEMPLATES TAB
// ============================================================================
function TemplatesTab() {
  const { data: templates, mutate } = useSWR<EmailTemplate[]>("/api/email/templates", fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState("all")
  const [form, setForm] = useState({
    name: "", slug: "", category: "general" as TemplateCategory, subject: "",
    body_html: "", body_text: "",
  })

  const resetForm = () => { setForm({ name: "", slug: "", category: "general", subject: "", body_html: "", body_text: "" }); setEditId(null); setShowForm(false); setPreviewHtml(null) }

  const loadForEdit = (t: EmailTemplate) => {
    setForm({ name: t.name, slug: t.slug, category: t.category, subject: t.subject, body_html: t.body_html, body_text: t.body_text || "" })
    setEditId(t.id); setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: any = { ...form }
    if (editId) { payload.action = "update"; payload.id = editId }
    const res = await fetch("/api/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success(editId ? "Template updated" : "Template created"); mutate(); resetForm() }
    else { const err = await res.json(); toast.error(err.error || "Failed") }
  }

  const handlePreview = async () => {
    const res = await fetch("/api/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", subject: form.subject, body_html: form.body_html }) })
    if (res.ok) { const data = await res.json(); setPreviewHtml(data.body_html) }
  }

  const handleDuplicate = async (id: string) => {
    const res = await fetch("/api/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "duplicate", id }) })
    if (res.ok) { toast.success("Template duplicated"); mutate() }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/email/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success("Template deleted"); mutate() }
  }

  const filtered = Array.isArray(templates) ? (filterCat === "all" ? templates : templates.filter(t => t.category === filterCat)) : []

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Email Templates</CardTitle>
              <CardDescription>{"Create reusable email templates with {{variable}} placeholders. Supports conditionals, loops, and formatting helpers."}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="h-8 text-xs w-[120px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Template</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {filtered.map((t: any) => (
                <div key={t.id} className="border rounded-lg bg-card">
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                    {expandedId === t.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <div className="h-8 w-8 rounded-md bg-chart-4/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-chart-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">v{t.version}</Badge>
                        {!t.is_active && <Badge variant="destructive" className="text-[9px]">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {t.subject}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => loadForEdit(t)}><Pencil className="h-3 w-3" />Edit</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleDuplicate(t.id)}><Copy className="h-3 w-3" />Clone</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {expandedId === t.id && (
                    <div className="px-3 pb-3 border-t">
                      <div className="mt-3 p-3 bg-muted/50 rounded text-xs whitespace-pre-wrap max-h-48 overflow-auto font-mono">{t.body_html.substring(0, 500)}{t.body_html.length > 500 ? "..." : ""}</div>
                      <p className="text-[10px] text-muted-foreground mt-2">Slug: {t.slug} &middot; Created: {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg mb-4">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No templates yet. Create your first email template to use with automated triggers.
            </div>
          )}

          {/* Template Form */}
          {showForm && (
            <>
              <Separator className="my-4" />
              <p className="text-xs font-medium text-muted-foreground mb-3">{editId ? "Edit Template" : "Create New Template"}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Template Name *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Welcome Email" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Slug</label>
                  <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as TemplateCategory })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-[10px] text-muted-foreground mb-1 block">Subject Line *</label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Welcome aboard, {{crew_name}}!" className="h-8 text-xs" />
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-muted-foreground">HTML Body *</label>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={handlePreview}><Eye className="h-2.5 w-2.5" />Preview</Button>
                </div>
                <textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} placeholder="<h2>Welcome, {{crew_name}}!</h2><p>We're excited to have you join {{organization_name}}.</p>" className="w-full h-40 border rounded-md p-3 text-xs font-mono bg-background resize-y" />
              </div>
              {previewHtml && (
                <div className="mb-3 border rounded-lg p-4">
                  <p className="text-[10px] text-muted-foreground mb-2">Preview (with sample data):</p>
                  <div className="bg-background p-3 rounded border text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              )}
              <div className="mb-3">
                <label className="text-[10px] text-muted-foreground mb-1 block">Plain Text Body (auto-generated if empty)</label>
                <textarea value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} placeholder="Plain text version..." className="w-full h-20 border rounded-md p-3 text-xs font-mono bg-background resize-y" />
              </div>
              {/* Variables Reference */}
              <details className="mb-3">
                <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground">Available Variables Reference</summary>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {DEFAULT_VARIABLES.map(v => (
                    <div key={v.key} className="text-[10px] p-1.5 rounded bg-muted/50 font-mono">
                      <span className="text-primary">{`{{${v.key}}}`}</span>
                      <span className="text-muted-foreground ml-1">- {v.label}</span>
                    </div>
                  ))}
                </div>
              </details>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}{editId ? "Update" : "Create"} Template</Button>
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// TRIGGERS TAB
// ============================================================================
function TriggersTab() {
  const { data: triggers, mutate } = useSWR<EmailTrigger[]>("/api/email/triggers", fetcher)
  const { data: templates } = useSWR<EmailTemplate[]>("/api/email/templates", fetcher)
  const { data: providers } = useSWR<EmailProvider[]>("/api/email/providers", fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", event_type: "" as string, template_id: "", provider_id: "",
    recipient_type: "crew_member" as RecipientType, recipient_field: "email",
    cc: "", bcc: "", delay_minutes: "0", priority: "5", max_retries: "3",
  })

  const resetForm = () => { setForm({ name: "", event_type: "", template_id: "", provider_id: "", recipient_type: "crew_member", recipient_field: "email", cc: "", bcc: "", delay_minutes: "0", priority: "5", max_retries: "3" }); setEditId(null); setShowForm(false) }

  const loadForEdit = (t: EmailTrigger) => {
    setForm({ name: t.name, event_type: t.event_type, template_id: t.template_id || "", provider_id: t.provider_id || "", recipient_type: t.recipient_type as RecipientType, recipient_field: t.recipient_field, cc: (t.cc_addresses || []).join(", "), bcc: (t.bcc_addresses || []).join(", "), delay_minutes: String(t.delay_minutes), priority: String(t.priority), max_retries: String(t.max_retries) })
    setEditId(t.id); setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: any = { ...form, delay_minutes: parseInt(form.delay_minutes), priority: parseInt(form.priority), max_retries: parseInt(form.max_retries), cc_addresses: form.cc.split(",").map(s => s.trim()).filter(Boolean), bcc_addresses: form.bcc.split(",").map(s => s.trim()).filter(Boolean) }
    if (!payload.template_id) delete payload.template_id
    if (!payload.provider_id) delete payload.provider_id
    if (editId) { payload.action = "update"; payload.id = editId }
    const res = await fetch("/api/email/triggers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success(editId ? "Trigger updated" : "Trigger created"); mutate(); resetForm() }
    else { const err = await res.json(); toast.error(err.error || "Failed") }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/email/triggers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success("Trigger deleted"); mutate() }
  }

  const handleToggle = async (id: string, is_active: boolean) => {
    await fetch("/api/email/triggers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, is_active }) })
    mutate()
  }

  // Group triggers by event category
  const eventCategories = SYSTEM_EVENTS.reduce((acc, ev) => { if (!acc.includes(ev.category)) acc.push(ev.category); return acc }, [] as string[])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Event Triggers</CardTitle>
              <CardDescription>Map system events to email templates. When an event fires, the linked template is rendered and sent to the configured recipients.</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Trigger</Button>
          </div>
        </CardHeader>
        <CardContent>
          {Array.isArray(triggers) && triggers.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {triggers.map((t: any) => {
                const ev = SYSTEM_EVENTS.find(e => e.value === t.event_type)
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className="h-8 w-8 rounded-md bg-chart-1/10 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-chart-1" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[9px]">{ev?.label || t.event_type}</Badge>
                        {t.template_name && <Badge variant="outline" className="text-[9px] bg-chart-4/10 text-chart-4 border-chart-4/20">{t.template_name}</Badge>}
                        {t.delay_minutes > 0 && <Badge variant="outline" className="text-[9px] gap-0.5"><Clock className="h-2 w-2" />{t.delay_minutes}min delay</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">To: {t.recipient_type.replace(/_/g, " ")} &middot; Priority: {t.priority} &middot; Retries: {t.max_retries}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={t.is_active} onCheckedChange={(v) => handleToggle(t.id, v)} />
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => loadForEdit(t)}><Pencil className="h-3 w-3" />Edit</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg mb-4">
              <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No triggers configured. Create a trigger to automate email sending when system events occur.
            </div>
          )}

          {/* Trigger Form */}
          {showForm && (
            <>
              <Separator className="my-4" />
              <p className="text-xs font-medium text-muted-foreground mb-3">{editId ? "Edit Trigger" : "Create New Trigger"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Trigger Name *</label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Welcome email on application" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">System Event *</label>
                  <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select event..." /></SelectTrigger>
                    <SelectContent>
                      {eventCategories.map(cat => (
                        <div key={cat}>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50">{cat}</div>
                          {SYSTEM_EVENTS.filter(e => e.category === cat).map(e => (
                            <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Email Template</label>
                  <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select template..." /></SelectTrigger>
                    <SelectContent>
                      {Array.isArray(templates) && templates.map((t: any) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Provider (optional)</label>
                  <Select value={form.provider_id} onValueChange={v => setForm({ ...form, provider_id: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Use default" /></SelectTrigger>
                    <SelectContent>
                      {Array.isArray(providers) && providers.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}{p.is_default ? " (Default)" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Recipient Type</label>
                  <Select value={form.recipient_type} onValueChange={v => setForm({ ...form, recipient_type: v as RecipientType })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crew_member" className="text-xs">Crew Member</SelectItem>
                      <SelectItem value="applicant" className="text-xs">Applicant</SelectItem>
                      <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                      <SelectItem value="custom_email" className="text-xs">Custom Email</SelectItem>
                      <SelectItem value="event_data_field" className="text-xs">Event Data Field</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(form.recipient_type === "custom_email" || form.recipient_type === "event_data_field") && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">{form.recipient_type === "custom_email" ? "Email Address" : "Data Field Name"}</label>
                    <Input value={form.recipient_field} onChange={e => setForm({ ...form, recipient_field: e.target.value })} className="h-8 text-xs" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">CC (comma-separated)</label>
                  <Input value={form.cc} onChange={e => setForm({ ...form, cc: e.target.value })} placeholder="cc@example.com" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">BCC (comma-separated)</label>
                  <Input value={form.bcc} onChange={e => setForm({ ...form, bcc: e.target.value })} placeholder="bcc@example.com" className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Delay (minutes)</label>
                  <Input type="number" value={form.delay_minutes} onChange={e => setForm({ ...form, delay_minutes: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Priority (1=highest)</label>
                  <Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}{editId ? "Update" : "Create"} Trigger</Button>
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Available Events Reference */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Available System Events</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventCategories.map(cat => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">{cat}</p>
                <div className="flex flex-col gap-1">
                  {SYSTEM_EVENTS.filter(e => e.category === cat).map(e => (
                    <div key={e.value} className="text-[10px] p-1.5 rounded bg-muted/50 flex items-start gap-2">
                      <code className="text-primary font-mono shrink-0">{e.value}</code>
                      <span className="text-muted-foreground">{e.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// QUEUE TAB
// ============================================================================
function QueueTab() {
  const [statusFilter, setStatusFilter] = useState("all")
  const { data, mutate } = useSWR(`/api/email/queue?status=${statusFilter}&limit=50`, fetcher)
  const [processing, setProcessing] = useState(false)

  const items: EmailQueueItem[] = data?.items || []
  const stats = data?.stats || { pending: 0, sent: 0, failed: 0, sending: 0, cancelled: 0, total: 0 }

  const handleAction = async (action: string, id?: string) => {
    setProcessing(true)
    await fetch("/api/email/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) })
    setProcessing(false)
    mutate()
    toast.success("Action completed")
  }

  const handleProcessQueue = async () => {
    setProcessing(true)
    const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "process_queue" }) })
    const result = await res.json()
    setProcessing(false)
    mutate()
    toast.success(`Processed ${result.processed}: ${result.sent} sent, ${result.failed} failed`)
  }

  const statusColors: Record<string, string> = {
    pending: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    sending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    sent: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground",
    bounced: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: stats.pending, color: "text-chart-1" },
          { label: "Sent", value: stats.sent, color: "text-chart-2" },
          { label: "Failed", value: stats.failed, color: "text-destructive" },
          { label: "Sending", value: stats.sending, color: "text-chart-3" },
          { label: "Total", value: stats.total, color: "text-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Email Queue &amp; Delivery Log</CardTitle>
              <CardDescription>Monitor email delivery, retry failures, and manage pending emails.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All</SelectItem>
                  <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                  <SelectItem value="sent" className="text-xs">Sent</SelectItem>
                  <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                  <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleProcessQueue} disabled={processing}>
                {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}Process Queue
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleAction("retry_all_failed")} disabled={processing}>
                <RotateCcw className="h-3 w-3" />Retry All Failed
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => mutate()}>
                <RefreshCw className="h-3 w-3" />Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[9px] ${statusColors[item.status] || ""}`}>{item.status}</Badge>
                      <span className="text-xs font-medium truncate">{item.recipient_email}</span>
                      {item.recipient_name && <span className="text-[10px] text-muted-foreground">({item.recipient_name})</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {item.subject} &middot; {item.event_type?.replace(/_/g, " ")} &middot; {new Date(item.created_at).toLocaleString()}
                      {item.attempts > 0 && ` &middot; ${item.attempts}/${item.max_retries} attempts`}
                    </p>
                    {item.error_message && <p className="text-[10px] text-destructive mt-0.5 truncate">{item.error_message}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "failed" && <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleAction("retry", item.id)}><RotateCcw className="h-2.5 w-2.5" />Retry</Button>}
                    {item.status === "pending" && <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleAction("cancel", item.id)}><XCircle className="h-2.5 w-2.5" />Cancel</Button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">
              <ListOrdered className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No emails in the queue{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
