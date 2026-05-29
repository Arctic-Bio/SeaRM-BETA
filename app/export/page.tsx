"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Download, FileSpreadsheet, FileJson, Users, Ship, Navigation,
  Briefcase, CheckSquare, Clock, Loader2, Anchor, AlertTriangle,
  Activity, MapPin, Tags, FileText, ClipboardList, Wrench, Package,
  LayoutGrid, Mail, MailCheck, UserCog, FolderDown,
} from "lucide-react"

const EXPORT_CATEGORIES = [
  {
    label: "Crew",
    items: [
      { key: "crew", label: "Crew Members", icon: Users, description: "All crew member data including skills, qualifications, ratings, and contact info" },
      { key: "assignments", label: "Crew Assignments", icon: Anchor, description: "Crew-to-voyage assignments with roles, departments, reviews, and sea days" },
      { key: "sea_time", label: "Sea Time Records", icon: Clock, description: "Embarkation/disembarkation logs with days at sea per crew member" },
      { key: "crew_checkins", label: "Crew Check-Ins", icon: MapPin, description: "Check-in records with location, type, and recording details" },
      { key: "crew_tags", label: "Crew Tags", icon: Tags, description: "All tags and labels applied to crew members" },
      { key: "onboarding", label: "Onboarding Checklists", icon: ClipboardList, description: "Onboarding progress tracking by template, crew, and voyage" },
      { key: "hourly_logs", label: "Hourly Logs", icon: Clock, description: "Crew hourly work logs with dates, hours, and categories" },
    ],
  },
  {
    label: "Fleet & Operations",
    items: [
      { key: "ships", label: "Ships / Fleet", icon: Ship, description: "Vessel specs, registration, dimensions, engine, capacity, and status" },
      { key: "voyages", label: "Voyages", icon: Navigation, description: "All voyages with ship assignments, ports, dates, and mission details" },
      { key: "positions", label: "Crew Positions", icon: Briefcase, description: "Open and filled positions with required skills and assignments" },
      { key: "maintenance", label: "Ship Maintenance", icon: Wrench, description: "Maintenance logs with categories, costs, scheduling, and status" },
      { key: "supplies", label: "Ship Supplies", icon: Package, description: "Supply inventory with quantities, costs, restock, and expiry dates" },
    ],
  },
  {
    label: "Tasks & Safety",
    items: [
      { key: "tasks", label: "Tasks", icon: CheckSquare, description: "All tasks with assignments, priorities, due dates, and completion status" },
      { key: "incidents", label: "Incidents", icon: AlertTriangle, description: "Safety incidents with severity, category, corrective actions, and follow-ups" },
      { key: "activities", label: "Activity Log", icon: Activity, description: "System-wide activity feed with actors, types, and linked records" },
    ],
  },
  {
    label: "Documents & Email",
    items: [
      { key: "documents", label: "Documents", icon: FileText, description: "All uploaded documents with verification status, expiry, and metadata" },
      { key: "email_templates", label: "Email Templates", icon: Mail, description: "Email template definitions with subjects, bodies, and variables" },
      { key: "email_queue", label: "Email Queue", icon: MailCheck, description: "Sent and queued emails with delivery status and errors" },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "invoices", label: "Invoices", icon: FileText, description: "All crew invoices with amounts, status, and payment dates" },
      { key: "invoice_items", label: "Invoice Line Items", icon: FileText, description: "Individual line items for all invoices with quantities and prices" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "users", label: "Users & Roles", icon: UserCog, description: "User accounts with names, emails, and roles (passwords excluded)" },
      { key: "roles_permissions", label: "Roles & Permissions", icon: UserCog, description: "Role definitions and permission grants" },
      { key: "widgets", label: "Widgets", icon: LayoutGrid, description: "Embeddable widget configurations with data sources and style settings" },
      { key: "saved_views", label: "Saved Views", icon: FileSpreadsheet, description: "Saved table filter and column configurations" },
      { key: "countries", label: "Countries", icon: Navigation, description: "Country reference data with codes and regions" },
      { key: "site_settings", label: "Site Settings", icon: UserCog, description: "Global site configuration key-value pairs" },
      { key: "file_storage", label: "File Storage", icon: FolderDown, description: "Uploaded file metadata and storage references" },
    ],
  },
]

const ALL_EXPORT_ITEMS = EXPORT_CATEGORIES.flatMap(c => c.items)

export default function ExportPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [format, setFormat] = useState<"csv" | "json">("csv")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === ALL_EXPORT_ITEMS.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ALL_EXPORT_ITEMS.map(i => i.key)))
    }
  }

  const handleExport = async (type: string) => {
    setLoading(type)
    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "json" ? "json" : "csv"
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${type} exported as ${format.toUpperCase()}`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const exportSelected = async () => {
    const items = selected.size > 0 ? Array.from(selected) : ALL_EXPORT_ITEMS.map(i => i.key)
    setLoading("batch")
    let count = 0
    for (const key of items) {
      try {
        const res = await fetch(`/api/export?type=${key}&format=${format}`)
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const ext = format === "json" ? "json" : "csv"
        a.download = `${key}_${new Date().toISOString().slice(0, 10)}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        count++
        // Small delay between downloads so browser doesn't block them
        await new Promise(r => setTimeout(r, 400))
      } catch { /* skip failed */ }
    }
    toast.success(`Exported ${count} ${format.toUpperCase()} file${count !== 1 ? "s" : ""}`)
    setLoading(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Export Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download data from any table as CSV or JSON. {ALL_EXPORT_ITEMS.length} data sources available.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <span className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</span>
              </SelectItem>
              <SelectItem value="json">
                <span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5" /> JSON</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === ALL_EXPORT_ITEMS.length ? "Deselect All" : "Select All"}
          </Button>
          <Button onClick={exportSelected} disabled={!!loading} className="gap-2">
            {loading === "batch" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
            {selected.size > 0 ? `Export Selected (${selected.size})` : "Export All"}
          </Button>
        </div>
      </div>

      {/* Category sections */}
      {EXPORT_CATEGORIES.map((category) => (
        <div key={category.label} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{category.label}</h2>
            <Badge variant="outline" className="text-[10px]">{category.items.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {category.items.map((t) => {
              const Icon = t.icon
              const isLoading = loading === t.key
              const isSelected = selected.has(t.key)
              return (
                <Card
                  key={t.key}
                  className={`group transition-all cursor-pointer ${isSelected ? "border-primary/50 bg-primary/[0.02] ring-1 ring-primary/20" : "hover:border-primary/30"}`}
                  onClick={() => toggleSelect(t.key)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${isSelected ? "bg-primary/15" : "bg-primary/10"}`}>
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm">{t.label}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase">{format}</Badge>
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                          {isSelected && <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs mb-3">{t.description}</CardDescription>
                    <Button
                      variant="outline" size="sm" className="w-full gap-2"
                      onClick={(e) => { e.stopPropagation(); handleExport(t.key) }}
                      disabled={!!loading}
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Download {format.toUpperCase()}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
