"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Settings, LayoutDashboard, Users, Ship, Map, Calendar,
  CheckSquare, ClipboardList, AlertTriangle, Download, Kanban, Shield, Loader2, Save,
  FileText, Plus, Trash2, GripVertical, PenLine, Eye, EyeOff, X, XCircle, Upload, Globe,
} from "lucide-react"
import { Switch as SwitchToggle } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PAGE_TOGGLES = [
  { key: "page_dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Main analytics overview" },
  { key: "page_crew", label: "Crew Management", icon: Users, description: "Crew database and profiles" },
  { key: "page_pipeline", label: "Recruitment Pipeline", icon: Kanban, description: "Kanban-style crew pipeline" },
  { key: "page_ships", label: "Ships", icon: Ship, description: "Fleet management, maintenance, supplies" },
  { key: "page_voyages", label: "Campaigns", icon: Map, description: "Voyage/campaign management" },
  { key: "page_availability", label: "Crew Calendar", icon: Calendar, description: "Availability timeline/Gantt view" },
  { key: "page_tasks", label: "Tasks", icon: CheckSquare, description: "Task management system" },
  { key: "page_onboarding", label: "Onboarding", icon: ClipboardList, description: "Onboarding checklists and tracking" },
  { key: "page_incidents", label: "Incidents", icon: AlertTriangle, description: "Safety incident reporting" },
  { key: "page_export", label: "Data Export", icon: Download, description: "CSV/JSON data export tools" },
  { key: "page_users", label: "Users & Roles", icon: Shield, description: "Account management (sysadmin only)" },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: settings, mutate } = useSWR("/api/settings", fetcher)
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Pending document verification queue
  const { data: pendingDocs, mutate: mutatePending } = useSWR("/api/documents?unverified=true", fetcher)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)

  const handleVerifyDoc = async (docId: string) => {
    setVerifying(docId)
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: true, verified_by: user?.name || "admin" }),
    })
    setVerifying(null)
    if (res.ok) { toast.success("Document verified"); mutatePending() }
    else toast.error("Failed to verify")
  }

  const handleRejectDoc = async (docId: string) => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason for rejection"); return }
    setVerifying(docId)
    const res = await fetch(`/api/documents/${docId}`, {
      method: "DELETE",
    })
    setVerifying(null)
    if (res.ok) {
      toast.success("Document rejected and removed")
      setRejecting(null)
      setRejectReason("")
      mutatePending()
    } else toast.error("Failed to reject document")
  }

  // Required documents management
  type RequiredDoc = { type: string; label: string; description: string }
  const savedReqDocs: RequiredDoc[] = (() => { try { return settings?.required_documents ? JSON.parse(settings.required_documents) : [] } catch { return [] } })()
  const [reqDocs, setReqDocs] = useState<RequiredDoc[] | null>(null)
  const [newDocType, setNewDocType] = useState("")
  const [newDocLabel, setNewDocLabel] = useState("")
  const [newDocDesc, setNewDocDesc] = useState("")
  const [savingDocs, setSavingDocs] = useState(false)
  const activeReqDocs = reqDocs ?? savedReqDocs
  const reqDocsChanged = reqDocs !== null && JSON.stringify(reqDocs) !== JSON.stringify(savedReqDocs)

  // Required e-signature documents management
  const savedEsignDocs: RequiredDoc[] = (() => { try { return settings?.required_esign_documents ? JSON.parse(settings.required_esign_documents) : [] } catch { return [] } })()
  const [esignDocs, setEsignDocs] = useState<RequiredDoc[] | null>(null)
  const [newEsignType, setNewEsignType] = useState("")
  const [newEsignLabel, setNewEsignLabel] = useState("")
  const [newEsignDesc, setNewEsignDesc] = useState("")
  const [savingEsign, setSavingEsign] = useState(false)
  const activeEsignDocs = esignDocs ?? savedEsignDocs
  const esignDocsChanged = esignDocs !== null && JSON.stringify(esignDocs) !== JSON.stringify(savedEsignDocs)

  const addEsignDoc = () => {
    if (!newEsignType.trim() || !newEsignLabel.trim()) { toast.error("Type and label are required"); return }
    const typeSlug = newEsignType.trim().toLowerCase().replace(/\s+/g, "_")
    if (activeEsignDocs.some((d) => d.type === typeSlug)) { toast.error("This document type already exists"); return }
    setEsignDocs([...activeEsignDocs, { type: typeSlug, label: newEsignLabel.trim(), description: newEsignDesc.trim() }])
    setNewEsignType(""); setNewEsignLabel(""); setNewEsignDesc("")
  }

  const removeEsignDoc = (type: string) => {
    setEsignDocs(activeEsignDocs.filter((d) => d.type !== type))
  }

  const saveEsignDocs = async () => {
    setSavingEsign(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required_esign_documents: JSON.stringify(activeEsignDocs) }),
    })
    setSavingEsign(false)
    if (res.ok) { toast.success("E-Signature documents updated"); setEsignDocs(null); mutate() }
    else toast.error("Failed to save")
  }

  const addRequiredDoc = () => {
    if (!newDocType.trim() || !newDocLabel.trim()) { toast.error("Type and label are required"); return }
    const typeSlug = newDocType.trim().toLowerCase().replace(/\s+/g, "_")
    if (activeReqDocs.some((d) => d.type === typeSlug)) { toast.error("This document type already exists"); return }
    setReqDocs([...activeReqDocs, { type: typeSlug, label: newDocLabel.trim(), description: newDocDesc.trim() }])
    setNewDocType(""); setNewDocLabel(""); setNewDocDesc("")
  }

  const removeRequiredDoc = (type: string) => {
    setReqDocs(activeReqDocs.filter((d) => d.type !== type))
  }

  const saveRequiredDocs = async () => {
    setSavingDocs(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required_documents: JSON.stringify(activeReqDocs) }),
    })
    setSavingDocs(false)
    if (res.ok) { toast.success("Required documents updated"); setReqDocs(null); mutate() }
    else toast.error("Failed to save")
  }

  // Global always-required documents
  const { data: globalDocs, mutate: mutateGlobalDocs } = useSWR("/api/settings/global-documents", fetcher)
  const [globalUploading, setGlobalUploading] = useState(false)
  const [globalDocType, setGlobalDocType] = useState("")
  const [globalDocLabel, setGlobalDocLabel] = useState("")
  const [globalRequiresSig, setGlobalRequiresSig] = useState(true)
  const [deletingGlobalId, setDeletingGlobalId] = useState<string | null>(null)

  const handleGlobalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!globalDocType.trim()) { toast.error("Please enter a document type"); return }
    setGlobalUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("document_type", globalDocType.trim().toLowerCase().replace(/\s+/g, "_"))
    formData.append("label", globalDocLabel.trim() || globalDocType.trim())
    formData.append("requires_signature", globalRequiresSig ? "true" : "false")
    const res = await fetch("/api/settings/global-documents", { method: "POST", body: formData })
    setGlobalUploading(false)
    e.target.value = ""
    if (res.ok) {
      toast.success("Global document uploaded successfully")
      setGlobalDocType("")
      setGlobalDocLabel("")
      setGlobalRequiresSig(true)
      mutateGlobalDocs()
    } else {
      const err = await res.json()
      toast.error(err.error || "Upload failed")
    }
  }

  const handleDeleteGlobal = async (id: string) => {
    setDeletingGlobalId(id)
    const res = await fetch("/api/settings/global-documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setDeletingGlobalId(null)
    if (res.ok) { toast.success("Global document deleted"); mutateGlobalDocs() }
    else toast.error("Failed to delete")
  }

  if (!user || user.role !== "sysadmin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Only sysadmin can access settings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getValue = (key: string): boolean => {
    if (key in pending) return pending[key] === "true"
    return settings?.[key] === "true" || settings?.[key] === undefined
  }

  const toggleValue = (key: string) => {
    const current = getValue(key)
    setPending((p) => ({ ...p, [key]: current ? "false" : "true" }))
  }

  const hasChanges = Object.keys(pending).length > 0

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Settings saved")
      setPending({})
      mutate()
    } else {
      toast.error("Failed to save settings")
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Control what pages and features are visible across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="outline" className="text-xs text-warning border-warning/30">Unsaved changes</Badge>}
          <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Page Visibility</CardTitle>
          <CardDescription>Toggle which pages are visible in the sidebar for captain and HR users. Sysadmin always has access to everything.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {PAGE_TOGGLES.map((page, i) => {
            const Icon = page.icon
            const enabled = getValue(page.key)
            const changed = page.key in pending
            return (
              <div key={page.key}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{page.label}</span>
                        {changed && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-warning border-warning/30">modified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                  </div>
                  <Switch checked={enabled} onCheckedChange={() => toggleValue(page.key)} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Required Documents Manager */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Required Documents
              </CardTitle>
              <CardDescription>Define which documents crew members must upload. These are shown as a checklist in the crew portal.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {reqDocsChanged && <Badge variant="outline" className="text-xs text-warning border-warning/30">Unsaved</Badge>}
              <Button onClick={saveRequiredDocs} disabled={!reqDocsChanged || savingDocs} size="sm" className="gap-1.5">
                {savingDocs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing required docs */}
          {activeReqDocs.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {activeReqDocs.map((doc) => (
                <div key={doc.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{doc.label}</span>
                      <Badge variant="outline" className="text-[9px]">{doc.type}</Badge>
                    </div>
                    {doc.description && <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeRequiredDoc(doc.type)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg mb-4">No required documents configured yet.</div>
          )}

          {/* Add new required doc */}
          <Separator className="mb-4" />
          <p className="text-xs font-medium text-muted-foreground mb-3">Add New Required Document</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Type Slug</label>
              <Input value={newDocType} onChange={(e) => setNewDocType(e.target.value)} placeholder="e.g. passport" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Display Label</label>
              <Input value={newDocLabel} onChange={(e) => setNewDocLabel(e.target.value)} placeholder="e.g. Passport" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Description (optional)</label>
              <Input value={newDocDesc} onChange={(e) => setNewDocDesc(e.target.value)} placeholder="e.g. Valid government-issued passport" className="h-8 text-xs" />
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addRequiredDoc}>
            <Plus className="h-3 w-3" /> Add Document Type
          </Button>
        </CardContent>
      </Card>

      {/* Required E-Signature Documents Manager */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                Required E-Signature Documents
              </CardTitle>
              <CardDescription>Define documents that crew must electronically sign. These appear in the crew portal E-Sign tab and on the onboarding timeline.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {esignDocsChanged && <Badge variant="outline" className="text-xs text-warning border-warning/30">Unsaved</Badge>}
              <Button onClick={saveEsignDocs} disabled={!esignDocsChanged || savingEsign} size="sm" className="gap-1.5">
                {savingEsign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeEsignDocs.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {activeEsignDocs.map((doc) => (
                <div key={doc.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-8 w-8 rounded-md bg-chart-4/10 flex items-center justify-center shrink-0">
                    <PenLine className="h-4 w-4 text-chart-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{doc.label}</span>
                      <Badge variant="outline" className="text-[9px]">{doc.type}</Badge>
                      <Badge variant="outline" className="text-[9px] bg-chart-4/10 text-chart-4 border-chart-4/20">E-Sign</Badge>
                    </div>
                    {doc.description && <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeEsignDoc(doc.type)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg mb-4">No required e-signature documents configured yet.</div>
          )}

          <Separator className="mb-4" />
          <p className="text-xs font-medium text-muted-foreground mb-3">Add New E-Signature Document</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Type Slug</label>
              <Input value={newEsignType} onChange={(e) => setNewEsignType(e.target.value)} placeholder="e.g. crew_contract" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Display Label</label>
              <Input value={newEsignLabel} onChange={(e) => setNewEsignLabel(e.target.value)} placeholder="e.g. Crew Contract" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Description (optional)</label>
              <Input value={newEsignDesc} onChange={(e) => setNewEsignDesc(e.target.value)} placeholder="e.g. Standard crew employment agreement" className="h-8 text-xs" />
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addEsignDoc}>
            <Plus className="h-3 w-3" /> Add E-Signature Document
          </Button>
        </CardContent>
      </Card>

      {/* Always Required Documents (Global) */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Always Required Documents
              </CardTitle>
              <CardDescription>
                Upload documents here once and they will automatically appear in every crew member and applicant portal.
                Documents marked for e-signature will require each crew member to sign individually.
              </CardDescription>
            </div>
            {Array.isArray(globalDocs) && globalDocs.length > 0 && (
              <Badge variant="outline" className="text-xs">{globalDocs.length} global</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing global documents */}
          {Array.isArray(globalDocs) && globalDocs.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {globalDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-8 w-8 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-chart-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{doc.file_name}</span>
                      <Badge variant="outline" className="text-[9px]">{doc.document_type?.replace(/_/g, " ")}</Badge>
                      {doc.requires_signature && (
                        <Badge variant="outline" className="text-[9px] bg-chart-4/10 text-chart-4 border-chart-4/20 gap-0.5">
                          <PenLine className="h-2 w-2" />E-Sign Required
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] bg-chart-2/10 text-chart-2 border-chart-2/20">Global</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.notes && <span>{doc.notes} -- </span>}
                      Uploaded by {doc.uploaded_by || "admin"} on {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                      <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3 w-3" />View
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteGlobal(doc.id)}
                      disabled={deletingGlobalId === doc.id}
                    >
                      {deletingGlobalId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg mb-4">
              <Globe className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              No global documents uploaded yet. Upload a document below and it will appear in all crew portals automatically.
            </div>
          )}

          {/* Upload new global document */}
          <Separator className="mb-4" />
          <p className="text-xs font-medium text-muted-foreground mb-3">Upload New Global Document</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Document Type</label>
              <Input
                value={globalDocType}
                onChange={(e) => setGlobalDocType(e.target.value)}
                placeholder="e.g. crew_contract, safety_policy"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Display Label (optional)</label>
              <Input
                value={globalDocLabel}
                onChange={(e) => setGlobalDocLabel(e.target.value)}
                placeholder="e.g. Crew Employment Contract"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Switch
                id="global-esign"
                checked={globalRequiresSig}
                onCheckedChange={setGlobalRequiresSig}
              />
              <Label htmlFor="global-esign" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                <PenLine className="h-3 w-3 text-chart-4" />
                Require E-Signature from each crew member
              </Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 relative" disabled={globalUploading || !globalDocType.trim()}>
              {globalUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {globalUploading ? "Uploading..." : "Choose File & Upload"}
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleGlobalUpload}
                disabled={globalUploading || !globalDocType.trim()}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
            </Button>
            <p className="text-[10px] text-muted-foreground">PDF, DOC, DOCX, PNG, JPG up to 10MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Document Verification Queue */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Document Verification Queue
              </CardTitle>
              <CardDescription>Review and verify uploaded crew documents. Verified documents are marked with a green checkmark across the platform.</CardDescription>
            </div>
            {Array.isArray(pendingDocs) && pendingDocs.length > 0 && (
              <Badge variant="outline" className="text-xs">{pendingDocs.length} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!Array.isArray(pendingDocs) || pendingDocs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">
              <CheckSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              All documents have been verified.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingDocs.slice(0, 20).map((doc: any) => {
                const isRequired = (() => { try { return savedReqDocs.some((rd) => rd.type === doc.document_type) } catch { return false } })()
                const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date()
                const isPreviewing = previewDocId === doc.id
                const isPreviewable = doc.mime_type && (doc.mime_type.startsWith("image/") || doc.mime_type === "application/pdf")
                return (
                  <div key={doc.id} className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="h-8 w-8 rounded-md bg-chart-3/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-chart-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{doc.file_name}</span>
                          <Badge variant="outline" className="text-[9px]">{doc.document_type?.replace(/_/g, " ")}</Badge>
                          {isRequired && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Required</Badge>}
                          {isExpired && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded by {doc.uploaded_by || "unknown"} on {new Date(doc.created_at).toLocaleDateString()}
                          {doc.expiry_date && ` \u00b7 Expires ${new Date(doc.expiry_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPreviewable && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setPreviewDocId(isPreviewing ? null : doc.id)}
                          >
                            {isPreviewing ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {isPreviewing ? "Hide" : "Review"}
                          </Button>
                        )}
                        {!isPreviewable && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                            <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />Download
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleVerifyDoc(doc.id)}
                          disabled={verifying === doc.id}
                        >
                          {verifying === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRejecting(rejecting === doc.id ? null : doc.id)}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </div>
                    {/* Rejection Reason */}
                    {rejecting === doc.id && (
                      <div className="border-t bg-destructive/[0.03] p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-destructive">Reject Document</p>
                            <p className="text-xs text-muted-foreground mt-0.5">This will permanently delete the document. The crew member will need to re-upload it.</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (e.g. blurry image, expired document, wrong type...)"
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs gap-1 shrink-0"
                            onClick={() => handleRejectDoc(doc.id)}
                            disabled={verifying === doc.id}
                          >
                            {verifying === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Confirm Reject
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => { setRejecting(null); setRejectReason("") }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Inline Preview */}
                    {isPreviewing && (
                      <div className="border-t bg-muted/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Document Preview</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPreviewDocId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {doc.mime_type?.startsWith("image/") ? (
                          <div className="rounded-md overflow-hidden border bg-background flex items-center justify-center max-h-96">
                            <img
                              src={`/api/documents/${doc.id}?inline=true`}
                              alt={doc.file_name}
                              className="max-w-full max-h-96 object-contain"
                            />
                          </div>
                        ) : doc.mime_type === "application/pdf" ? (
                          <iframe
                            src={`/api/documents/${doc.id}?inline=true`}
                            className="w-full h-[500px] rounded-md border bg-background"
                            title={`Preview: ${doc.file_name}`}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
              {pendingDocs.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">Showing first 20 of {pendingDocs.length} pending documents.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Role Overview</CardTitle>
          <CardDescription>Summary of access levels per role.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              { role: "Sysadmin", desc: "Full access to everything including settings, account management, and all pages regardless of toggles.", color: "bg-destructive/10 text-destructive" },
              { role: "Captain", desc: "Access to all operational pages (crew, ships, voyages, tasks, incidents, documents). Cannot manage accounts or settings.", color: "bg-primary/10 text-primary" },
              { role: "HR", desc: "Same as Captain -- full operational access including crew management, onboarding, and document verification.", color: "bg-chart-2/15 text-chart-2" },
              { role: "Crew", desc: "Portal-only access. Can view own profile, assignments, requirements, and e-sign provided documents. Cannot access admin pages.", color: "bg-chart-4/15 text-chart-4" },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className={`${r.color} border-0 text-xs shrink-0`}>{r.role}</Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Attribution */}
      <div className="mt-8 py-4 border-t text-center">
        <p className="text-[10px] text-muted-foreground/60">Created by BMK 2026, as part of project EVO</p>
      </div>
    </div>
  )
}
