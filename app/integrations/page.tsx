"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Plus, Trash2, Copy, Eye, EyeOff, RefreshCw, Code, ChevronRight, ChevronLeft,
  Check, Loader2, ExternalLink, LayoutGrid, List, Table, BarChart3, Clock,
  Minimize2, GalleryHorizontalEnd, Building2, Filter, Palette, ArrowUpDown, Settings2,
  Sparkles, Ship, Users, AlertTriangle, Activity, Zap, Anchor, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── DATA SOURCE DEFINITIONS (mirrored from lib for client use) ───
const DATA_SOURCES = [
  { key: "voyages", label: "Voyages", category: "Operations", description: "Active and past voyages with routes, dates, and crew counts" },
  { key: "ships", label: "Ships / Vessels", category: "Operations", description: "Fleet information including vessel specs and status" },
  { key: "crew_applications", label: "Crew Applications", category: "Crew", description: "Submitted crew membership applications" },
  { key: "crew_assignments", label: "Crew Assignments", category: "Crew", description: "Crew member voyage assignments and roles" },
  { key: "crew_sea_time", label: "Sea Time Records", category: "Crew", description: "Logged sea time entries for crew members" },
  { key: "tasks", label: "Tasks", category: "Operations", description: "Task management records" },
  { key: "incidents", label: "Incidents & Reports", category: "Safety", description: "Safety incidents and event reports" },
  { key: "activities", label: "Activity Log", category: "System", description: "System-wide activity trail" },
  { key: "crew_checkins", label: "Crew Check-Ins", category: "Crew", description: "Crew check-in records with location tracking" },
]

const SOURCE_COLUMNS: Record<string, { key: string; label: string; type: string; defaultVisible: boolean }[]> = {
  voyages: [
    { key: "voyage_name", label: "Voyage Name", type: "text", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "departure_port", label: "Departure Port", type: "text", defaultVisible: true },
    { key: "destination_port", label: "Destination Port", type: "text", defaultVisible: true },
    { key: "departure_date", label: "Departure Date", type: "date", defaultVisible: true },
    { key: "return_date", label: "Return Date", type: "date", defaultVisible: true },
    { key: "mission_type", label: "Mission Type", type: "badge", defaultVisible: true },
    { key: "mission_objectives", label: "Mission Objectives", type: "text", defaultVisible: false },
    { key: "description", label: "Description", type: "text", defaultVisible: false },
    { key: "notes", label: "Notes", type: "text", defaultVisible: false },
    { key: "created_at", label: "Created", type: "date", defaultVisible: false },
  ],
  ships: [
    { key: "name", label: "Ship Name", type: "text", defaultVisible: true },
    { key: "type", label: "Vessel Type", type: "badge", defaultVisible: true },
    { key: "flag", label: "Flag State", type: "text", defaultVisible: true },
    { key: "length_m", label: "Length (m)", type: "number", defaultVisible: true },
    { key: "gross_tonnage", label: "Gross Tonnage", type: "number", defaultVisible: true },
    { key: "crew_capacity", label: "Crew Capacity", type: "number", defaultVisible: true },
    { key: "year_built", label: "Year Built", type: "number", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "home_port", label: "Home Port", type: "text", defaultVisible: false },
    { key: "engine_type", label: "Engine Type", type: "text", defaultVisible: false },
    { key: "max_speed_knots", label: "Max Speed (kts)", type: "number", defaultVisible: false },
  ],
  crew_applications: [
    { key: "first_name", label: "First Name", type: "text", defaultVisible: true },
    { key: "last_name", label: "Last Name", type: "text", defaultVisible: true },
    { key: "email", label: "Email", type: "email", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "country", label: "Country", type: "text", defaultVisible: true },
    { key: "department_preference", label: "Dept. Preference", type: "text", defaultVisible: true },
    { key: "rating", label: "Rating", type: "number", defaultVisible: false },
    { key: "availability_start_date", label: "Available From", type: "date", defaultVisible: false },
    { key: "created_at", label: "Applied", type: "date", defaultVisible: true },
  ],
  crew_assignments: [
    { key: "crew_id", label: "Crew ID", type: "text", defaultVisible: true },
    { key: "voyage_id", label: "Voyage ID", type: "text", defaultVisible: true },
    { key: "role", label: "Role", type: "badge", defaultVisible: true },
    { key: "department", label: "Department", type: "badge", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "expected_join_date", label: "Expected Join", type: "date", defaultVisible: true },
    { key: "days_at_sea", label: "Days at Sea", type: "number", defaultVisible: true },
    { key: "created_at", label: "Created", type: "date", defaultVisible: false },
  ],
  crew_sea_time: [
    { key: "crew_id", label: "Crew ID", type: "text", defaultVisible: true },
    { key: "role", label: "Role", type: "badge", defaultVisible: true },
    { key: "embarked_at", label: "Embarked", type: "date", defaultVisible: true },
    { key: "disembarked_at", label: "Disembarked", type: "date", defaultVisible: true },
    { key: "days", label: "Days", type: "number", defaultVisible: true },
    { key: "notes", label: "Notes", type: "text", defaultVisible: false },
  ],
  tasks: [
    { key: "title", label: "Title", type: "text", defaultVisible: true },
    { key: "task_type", label: "Type", type: "badge", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "priority", label: "Priority", type: "badge", defaultVisible: true },
    { key: "assigned_to", label: "Assigned To", type: "text", defaultVisible: true },
    { key: "due_date", label: "Due Date", type: "date", defaultVisible: true },
    { key: "completed_at", label: "Completed", type: "date", defaultVisible: false },
  ],
  incidents: [
    { key: "title", label: "Title", type: "text", defaultVisible: true },
    { key: "category", label: "Category", type: "badge", defaultVisible: true },
    { key: "severity", label: "Severity", type: "badge", defaultVisible: true },
    { key: "status", label: "Status", type: "badge", defaultVisible: true },
    { key: "location", label: "Location", type: "text", defaultVisible: true },
    { key: "reported_by", label: "Reported By", type: "text", defaultVisible: true },
    { key: "occurred_at", label: "Occurred At", type: "date", defaultVisible: true },
  ],
  activities: [
    { key: "activity_type", label: "Activity Type", type: "badge", defaultVisible: true },
    { key: "title", label: "Title", type: "text", defaultVisible: true },
    { key: "description", label: "Description", type: "text", defaultVisible: true },
    { key: "actor_name", label: "Actor", type: "text", defaultVisible: true },
    { key: "created_at", label: "When", type: "date", defaultVisible: true },
  ],
  crew_checkins: [
    { key: "crew_id", label: "Crew ID", type: "text", defaultVisible: true },
    { key: "check_type", label: "Check Type", type: "badge", defaultVisible: true },
    { key: "checked_at", label: "Checked At", type: "date", defaultVisible: true },
    { key: "location", label: "Location", type: "text", defaultVisible: true },
    { key: "recorded_by", label: "Recorded By", type: "text", defaultVisible: true },
    { key: "notes", label: "Notes", type: "text", defaultVisible: false },
  ],
}

const VIEW_TYPES = [
  { value: "table", label: "Data Table", icon: Table, description: "Classic sortable table" },
  { value: "cards", label: "Card Grid", icon: LayoutGrid, description: "Visual cards in a grid" },
  { value: "list", label: "List View", icon: List, description: "Compact vertical list" },
  { value: "stats", label: "Stats / KPI", icon: BarChart3, description: "Aggregate statistics" },
  { value: "timeline", label: "Timeline", icon: Clock, description: "Chronological timeline" },
  { value: "minimal", label: "Minimal", icon: Minimize2, description: "Ultra-clean entries" },
]

const STYLE_PRESETS = [
  { value: "modern", label: "Modern", description: "Clean professional with blue accents", colors: { bg: "#ffffff", text: "#0f172a", accent: "#3b82f6", border: "#e2e8f0", headerBg: "#f8fafc", accentLight: "#dbeafe" } },
  { value: "ocean", label: "Ocean", description: "Deep maritime blues with cyan highlights", colors: { bg: "#0f172a", text: "#e2e8f0", accent: "#06b6d4", border: "#334155", headerBg: "#1e293b", accentLight: "#165e7d" } },
  { value: "minimal", label: "Minimal", description: "High contrast monochrome", colors: { bg: "#ffffff", text: "#000000", accent: "#000000", border: "#d1d5db", headerBg: "#ffffff", accentLight: "#f3f4f6" } },
  { value: "vibrant", label: "Vibrant", description: "Bold orange and warm sunset tones", colors: { bg: "#fafaf9", text: "#1c1917", accent: "#ea580c", border: "#fed7aa", headerBg: "#fff7ed", accentLight: "#ffedd5" } },
  { value: "corporate", label: "Corporate", description: "Professional purple with gold accents", colors: { bg: "#f5f3ff", text: "#3f3f46", accent: "#7c3aed", border: "#ddd6fe", headerBg: "#eae5ff", accentLight: "#f3e8ff" } },
  { value: "seafoam", label: "Seafoam", description: "Soft mint and teal for maritime themes", colors: { bg: "#f0fdfa", text: "#164e63", accent: "#0d9488", border: "#b2dfdb", headerBg: "#e0f2f1", accentLight: "#ccf7f3" } },
]

const FILTER_OPERATORS = [
  { value: "eq", label: "Equals" }, { value: "neq", label: "Not Equals" },
  { value: "gt", label: "Greater Than" }, { value: "gte", label: "Greater or Equal" },
  { value: "lt", label: "Less Than" }, { value: "lte", label: "Less or Equal" },
  { value: "like", label: "Contains" }, { value: "in", label: "In List" },
  { value: "notnull", label: "Is Not Empty" }, { value: "isnull", label: "Is Empty" },
]

type WFilter = { column: string; operator: string; value: string }

// ─── PRE-MADE WIDGET TEMPLATES ───
const WIDGET_TEMPLATES = [
  {
    id: "fleet-overview",
    name: "Fleet Overview",
    description: "Live dashboard of your entire fleet showing vessel name, type, flag, status, tonnage, and home port in a sleek card grid.",
    icon: Ship,
    color: "#3b82f6",
    data_source: "ships",
    columns: ["name", "type", "flag", "status", "gross_tonnage", "crew_capacity", "year_built", "home_port"],
    view_type: "cards",
    style_preset: "ocean",
    sort_by: "name",
    sort_dir: "asc" as const,
    max_rows: 50,
    filters: [] as WFilter[],
    show_header: true,
    show_footer: true,
    show_pagination: true,
    show_search: true,
    header_title: "Fleet Overview",
    footer_text: "Powered by SeaRM",
  },
  {
    id: "active-voyages",
    name: "Active Voyages",
    description: "Timeline of current and upcoming voyages with departure/destination ports, dates, mission type, and status badges.",
    icon: Anchor,
    color: "#06b6d4",
    data_source: "voyages",
    columns: ["voyage_name", "status", "departure_port", "destination_port", "departure_date", "return_date", "mission_type"],
    view_type: "timeline",
    style_preset: "modern",
    sort_by: "departure_date",
    sort_dir: "desc" as const,
    max_rows: 25,
    filters: [] as WFilter[],
    show_header: true,
    show_footer: true,
    show_pagination: true,
    show_search: false,
    header_title: "Active Voyages",
    footer_text: "Powered by SeaRM",
  },
  {
    id: "crew-pipeline",
    name: "Crew Pipeline",
    description: "Crew application tracker showing applicant names, status, country, department preference, and application date as a compact list.",
    icon: Users,
    color: "#0d9488",
    data_source: "crew_applications",
    columns: ["first_name", "last_name", "status", "country", "department_preference", "email", "created_at"],
    view_type: "list",
    style_preset: "seafoam",
    sort_by: "created_at",
    sort_dir: "desc" as const,
    max_rows: 50,
    filters: [] as WFilter[],
    show_header: true,
    show_footer: true,
    show_pagination: true,
    show_search: true,
    header_title: "Crew Applications",
    footer_text: "Powered by SeaRM",
  },
  {
    id: "safety-incidents",
    name: "Safety Dashboard",
    description: "Safety incident stats showing severity breakdowns, category distribution, status counts, and occurrence date ranges.",
    icon: AlertTriangle,
    color: "#ea580c",
    data_source: "incidents",
    columns: ["title", "severity", "category", "status", "location", "reported_by", "occurred_at"],
    view_type: "stats",
    style_preset: "vibrant",
    sort_by: "occurred_at",
    sort_dir: "desc" as const,
    max_rows: 100,
    filters: [] as WFilter[],
    show_header: true,
    show_footer: true,
    show_pagination: false,
    show_search: false,
    header_title: "Safety Dashboard",
    footer_text: "Powered by SeaRM",
  },
  {
    id: "task-board",
    name: "Operations Board",
    description: "Full task table with title, type, priority, status, assignee, and due date. Sortable with search and pagination for operational tracking.",
    icon: Activity,
    color: "#7c3aed",
    data_source: "tasks",
    columns: ["title", "task_type", "status", "priority", "assigned_to", "due_date", "completed_at"],
    view_type: "table",
    style_preset: "corporate",
    sort_by: "due_date",
    sort_dir: "asc" as const,
    max_rows: 25,
    filters: [] as WFilter[],
    show_header: true,
    show_footer: true,
    show_pagination: true,
    show_search: true,
    header_title: "Operations Board",
    footer_text: "Powered by SeaRM",
  },
]

// ─── MAIN PAGE ───
export default function WidgetBuilderPage() {
  const [tab, setTab] = useState<"widgets" | "create" | "templates">("widgets")
  const [templateToApply, setTemplateToApply] = useState<typeof WIDGET_TEMPLATES[number] | null>(null)
  const tabs = [
    { id: "widgets" as const, label: "My Widgets" },
    { id: "templates" as const, label: "Templates" },
    { id: "create" as const, label: "Create Widget" },
  ]

  const handleDeployTemplate = (tpl: typeof WIDGET_TEMPLATES[number]) => {
    setTemplateToApply(tpl)
    setTab("create")
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Widget Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">Create embeddable widgets that display live data on external websites</p>
          </div>
          <div className="flex gap-2">
            {tab === "widgets" && <Button variant="outline" onClick={() => setTab("templates")} className="gap-1"><Sparkles className="h-4 w-4" />Templates</Button>}
            {tab !== "create" && <Button onClick={() => { setTemplateToApply(null); setTab("create") }} className="gap-1"><Plus className="h-4 w-4" />New Widget</Button>}
          </div>
        </div>
        <div className="flex gap-1 mb-6 border-b">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "widgets" && <WidgetsList onEdit={() => { setTemplateToApply(null); setTab("create") }} />}
        {tab === "templates" && <WidgetTemplates onDeploy={handleDeployTemplate} />}
        {tab === "create" && <WidgetCreator onDone={() => setTab("widgets")} template={templateToApply} />}
      </div>
    </div>
  )
}

// ─── WIDGET TEMPLATES ───
function WidgetTemplates({ onDeploy }: { onDeploy: (tpl: typeof WIDGET_TEMPLATES[number]) => void }) {
  const [deploying, setDeploying] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleQuickDeploy = async (tpl: typeof WIDGET_TEMPLATES[number]) => {
    setDeploying(tpl.id)
    const res = await fetch("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tpl.name,
        slug: tpl.id,
        description: tpl.description,
        data_source: tpl.data_source,
        columns: tpl.columns,
        filters: tpl.filters,
        sort_by: tpl.sort_by,
        sort_dir: tpl.sort_dir,
        view_type: tpl.view_type,
        style_preset: tpl.style_preset,
        max_rows: tpl.max_rows,
        show_header: tpl.show_header,
        show_footer: tpl.show_footer,
        show_pagination: tpl.show_pagination,
        show_search: tpl.show_search,
        header_title: tpl.header_title,
        footer_text: tpl.footer_text,
        empty_message: "No data available",
        allowed_domains: [],
        rate_limit_per_min: 60,
        refresh_interval_sec: 300,
        is_active: true,
        is_public: true,
        custom_css: null,
      }),
    })
    setDeploying(null)
    if (res.ok) { toast.success(`"${tpl.name}" widget created! Go to My Widgets to see it.`) }
    else { const r = await res.json(); toast.error(r.error || "Failed to create widget") }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Pre-made Widget Templates</h2>
        <p className="text-sm text-muted-foreground">One-click deploy a ready-made widget, or customize it before publishing.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {WIDGET_TEMPLATES.map(tpl => {
          const Icon = tpl.icon
          const viewLabel = VIEW_TYPES.find(v => v.value === tpl.view_type)?.label || tpl.view_type
          const styleLabel = STYLE_PRESETS.find(s => s.value === tpl.style_preset)?.label || tpl.style_preset
          const sourceLabel = DATA_SOURCES.find(d => d.key === tpl.data_source)?.label || tpl.data_source
          const isExpanded = expandedId === tpl.id

          return (
            <Card key={tpl.id} className="overflow-hidden flex flex-col">
              <div className="h-2" style={{ background: tpl.color }} />
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg shrink-0" style={{ background: `${tpl.color}15` }}>
                    <Icon className="h-5 w-5" style={{ color: tpl.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <CardDescription className="text-xs mt-1 leading-relaxed">{tpl.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className="text-[10px]">{sourceLabel}</Badge>
                  <Badge variant="outline" className="text-[10px]">{viewLabel}</Badge>
                  <Badge variant="outline" className="text-[10px]">{styleLabel}</Badge>
                  <Badge variant="outline" className="text-[10px]">{tpl.columns.length} columns</Badge>
                </div>

                {/* Expandable column details */}
                <button onClick={() => setExpandedId(isExpanded ? null : tpl.id)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-3 transition-colors">
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  {isExpanded ? "Hide details" : "Show columns & settings"}
                </button>
                {isExpanded && (
                  <div className="text-[11px] text-muted-foreground mb-3 p-2.5 rounded-md bg-muted/50 flex flex-col gap-1.5">
                    <div><span className="font-medium text-foreground">Columns:</span> {tpl.columns.map(c => {
                      const col = SOURCE_COLUMNS[tpl.data_source]?.find(sc => sc.key === c)
                      return col?.label || c
                    }).join(", ")}</div>
                    <div><span className="font-medium text-foreground">Sort:</span> {tpl.sort_by} ({tpl.sort_dir})</div>
                    <div><span className="font-medium text-foreground">Max rows:</span> {tpl.max_rows} &middot; <span className="font-medium text-foreground">Search:</span> {tpl.show_search ? "On" : "Off"} &middot; <span className="font-medium text-foreground">Pagination:</span> {tpl.show_pagination ? "On" : "Off"}</div>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button size="sm" className="flex-1 gap-1 h-8 text-xs" onClick={() => handleQuickDeploy(tpl)} disabled={deploying === tpl.id}>
                    {deploying === tpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Quick Deploy
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => onDeploy(tpl)}>
                    <Settings2 className="h-3 w-3" />Customize
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── WIDGETS LIST ───
function WidgetsList({ onEdit }: { onEdit: () => void }) {
  const { data, mutate } = useSWR("/api/widgets", fetcher)
  const widgets = data?.widgets || []
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    await fetch("/api/widgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    toast.success("Widget deleted")
    mutate()
  }

  const handleToggle = async (id: string, is_active: boolean) => {
    await fetch("/api/widgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active }) })
    toast.success(is_active ? "Widget activated" : "Widget deactivated")
    mutate()
  }

  const copyEmbed = (widget: any, type: "script" | "iframe") => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const endpoint = `${baseUrl}/api/widgets/embed/${widget.id}?token=${widget.access_token}`
    let code = ""
    if (type === "script") {
      code = `<!-- SeaRM Widget: ${widget.name} -->\n<div id="searm-widget-${widget.id}" style="width:100%;max-width:100%;"></div>\n<script>\n(function(){\n  var c=document.getElementById("searm-widget-${widget.id}");\n  var endpoint="${endpoint}";\n  var page=1;\n  function load(p){page=p||1;c.innerHTML='<div style="padding:40px;text-align:center;opacity:.4">Loading...</div>';fetch(endpoint+"&page="+page).then(function(r){return r.text()}).then(function(html){c.innerHTML=html;bindEvents()}).catch(function(){c.innerHTML='<div style="padding:20px;text-align:center;color:#ef4444">Failed to load widget</div>'})}\n  function bindEvents(){var btns=c.querySelectorAll("[data-sw-page]");btns.forEach(function(b){b.addEventListener("click",function(){load(parseInt(b.dataset.swPage))})});var search=c.querySelector(".sw-search");if(search){var t;search.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){fetch(endpoint+"&page=1&search="+encodeURIComponent(search.value)).then(function(r){return r.text()}).then(function(html){c.innerHTML=html;bindEvents()})},400)})}}\n  load(1);\n})();\n</script>\n<!-- End SeaRM Widget -->`
    } else {
      code = `<iframe src="${endpoint}&iframe=1" width="100%" height="500" frameborder="0" style="border:none;border-radius:8px;max-width:100%;" loading="lazy" title="${widget.name}"></iframe>`
    }
    navigator.clipboard.writeText(code)
    setCopied(`${widget.id}-${type}`)
    toast.success(`${type === "script" ? "Embed" : "iframe"} code copied!`)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!data) return <div className="text-center py-12 text-muted-foreground">Loading widgets...</div>
  if (widgets.length === 0) return (
    <div className="flex flex-col gap-6">
      <Card><CardContent className="py-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4">No widgets created yet. Build your first embeddable widget or start from a template.</p>
        <Button onClick={onEdit} className="gap-1"><Plus className="h-4 w-4" />Create Widget</Button>
      </CardContent></Card>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Quick Start Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WIDGET_TEMPLATES.slice(0, 3).map(tpl => {
            const Icon = tpl.icon
            return (
              <Card key={tpl.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: tpl.color }} />
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md" style={{ background: `${tpl.color}15` }}>
                      <Icon className="h-4 w-4" style={{ color: tpl.color }} />
                    </div>
                    <div>
                      <div className="font-medium text-xs">{tpl.name}</div>
                      <p className="text-[10px] text-muted-foreground">{tpl.view_type} &middot; {tpl.style_preset}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed line-clamp-2">{tpl.description}</p>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={() => {
                    // Quick deploy
                    fetch("/api/widgets", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: tpl.name, slug: tpl.id, description: tpl.description,
                        data_source: tpl.data_source, columns: tpl.columns, filters: tpl.filters,
                        sort_by: tpl.sort_by, sort_dir: tpl.sort_dir, view_type: tpl.view_type,
                        style_preset: tpl.style_preset, max_rows: tpl.max_rows,
                        show_header: tpl.show_header, show_footer: tpl.show_footer,
                        show_pagination: tpl.show_pagination, show_search: tpl.show_search,
                        header_title: tpl.header_title, footer_text: tpl.footer_text,
                        empty_message: "No data available", allowed_domains: [],
                        rate_limit_per_min: 60, refresh_interval_sec: 300,
                        is_active: true, is_public: true, custom_css: null,
                      }),
                    }).then(r => { if (r.ok) { toast.success(`"${tpl.name}" created!`); mutate() } else { toast.error("Failed to create widget") } })
                  }}>
                    <Zap className="h-3 w-3" />Deploy Now
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {widgets.map((w: any) => (
        <Card key={w.id} className="overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{w.name}</h3>
                <Badge variant={w.is_active ? "default" : "secondary"} className="text-[10px]">{w.is_active ? "Active" : "Inactive"}</Badge>
                <Badge variant="outline" className="text-[10px]">{w.view_type}</Badge>
                <Badge variant="outline" className="text-[10px]">{w.style_preset}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Source: {DATA_SOURCES.find(d => d.key === w.data_source)?.label || w.data_source} &middot; {w.total_views || 0} views &middot; Rate: {w.rate_limit_per_min}/min
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                <Code className="h-3 w-3" />Embed
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleToggle(w.id, !w.is_active)}>
                {w.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {w.is_active ? "Disable" : "Enable"}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(w.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {expandedId === w.id && (
            <div className="px-4 pb-4 pt-0 border-t">
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium w-20 shrink-0">Access Token</Label>
                  <code className="text-[10px] bg-muted px-2 py-1 rounded flex-1 truncate font-mono">{w.access_token}</code>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyEmbed(w, "script")}>
                    {copied === `${w.id}-script` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}Copy Embed Code
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyEmbed(w, "iframe")}>
                    {copied === `${w.id}-iframe` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}Copy iframe Code
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={`/api/widgets/embed/${w.id}?token=${w.access_token}&iframe=1`} target="_blank" rel="noopener">
                      <ExternalLink className="h-3 w-3" />Preview Live
                    </a>
                  </Button>
                </div>
                {(w.allowed_domains as string[])?.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">Allowed domains: {(w.allowed_domains as string[]).join(", ")}</div>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ─── WIDGET CREATOR (multi-step wizard) ───
function WidgetCreator({ onDone, template }: { onDone: () => void; template?: typeof WIDGET_TEMPLATES[number] | null }) {
  const [step, setStep] = useState(template ? 5 : 1)
  const totalSteps = 6
  const [saving, setSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewing, setPreviewing] = useState(false)

  // Form state (pre-populate from template if provided)
  const [name, setName] = useState(template?.name || "")
  const [slug, setSlug] = useState(template?.id || "")
  const [description, setDescription] = useState(template?.description || "")
  const [dataSource, setDataSource] = useState(template?.data_source || "")
  const [selectedCols, setSelectedCols] = useState<string[]>(template?.columns || [])
  const [filters, setFilters] = useState<WFilter[]>(template?.filters || [])
  const [sortBy, setSortBy] = useState(template?.sort_by || "")
  const [sortDir, setSortDir] = useState<"asc" | "desc">(template?.sort_dir || "asc")
  const [viewType, setViewType] = useState(template?.view_type || "table")
  const [stylePreset, setStylePreset] = useState(template?.style_preset || "modern")
  const [maxRows, setMaxRows] = useState(template?.max_rows || 25)
  const [showHeader, setShowHeader] = useState(template?.show_header ?? true)
  const [showFooter, setShowFooter] = useState(template?.show_footer ?? true)
  const [showPagination, setShowPagination] = useState(template?.show_pagination ?? true)
  const [showSearch, setShowSearch] = useState(template?.show_search ?? false)
  const [headerTitle, setHeaderTitle] = useState(template?.header_title || "")
  const [footerText, setFooterText] = useState(template?.footer_text || "Powered by SeaRM")
  const [emptyMessage, setEmptyMessage] = useState("No data available")
  const [refreshInterval, setRefreshInterval] = useState(300)
  const [rateLimit, setRateLimit] = useState(60)
  const [allowedDomains, setAllowedDomains] = useState("")
  const [customCss, setCustomCss] = useState("")

  const availableCols = SOURCE_COLUMNS[dataSource] || []

  // Auto-slug from name
  useEffect(() => {
    if (name && !slug) setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
  }, [name, slug])

  // Auto-select default visible columns when source changes
  useEffect(() => {
    if (dataSource && availableCols.length > 0) {
      setSelectedCols(availableCols.filter(c => c.defaultVisible).map(c => c.key))
      setFilters([])
      setSortBy("")
    }
  }, [dataSource]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCol = (key: string) => {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // Build the preview config object (changes on every relevant state change)
  const previewConfig = {
    data_source: dataSource, columns: selectedCols, filters, sort_by: sortBy, sort_dir: sortDir,
    view_type: viewType, style_preset: stylePreset, max_rows: maxRows,
    show_header: showHeader, show_footer: showFooter, show_pagination: showPagination,
    show_search: showSearch, header_title: headerTitle || name, footer_text: footerText,
    empty_message: emptyMessage,
  }
  const previewConfigJson = JSON.stringify(previewConfig)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch preview -- used by both useEffect and manual button
  const fetchPreview = useCallback(async () => {
    if (!dataSource) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setPreviewing(true)
    try {
      const res = await fetch("/api/widgets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: previewConfigJson,
        signal: ac.signal,
      })
      const result = await res.json()
      if (!ac.signal.aborted) {
        setPreviewHtml(result.html || `<div style="padding:20px;color:#ef4444">${result.error || "Preview failed"}</div>`)
        setPreviewing(false)
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setPreviewing(false)
    }
  }, [previewConfigJson, dataSource])

  // Auto-preview on step >= 5, re-triggers any time previewConfigJson changes
  useEffect(() => {
    if (step < 5 || !dataSource) return
    const timer = setTimeout(fetchPreview, 150) // small debounce to batch rapid changes
    return () => clearTimeout(timer)
  }, [step, dataSource, fetchPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name || !dataSource || !viewType) { toast.error("Please complete all required fields"); return }
    setSaving(true)
    const res = await fetch("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description, data_source: dataSource, columns: selectedCols, filters,
        sort_by: sortBy || null, sort_dir: sortDir, view_type: viewType,
        style_preset: stylePreset, custom_css: customCss || null,
        max_rows: maxRows, refresh_interval_sec: refreshInterval,
        show_header: showHeader, show_footer: showFooter, show_pagination: showPagination,
        show_search: showSearch, header_title: headerTitle || name,
        footer_text: footerText, empty_message: emptyMessage,
        allowed_domains: allowedDomains ? allowedDomains.split(",").map(d => d.trim()).filter(Boolean) : [],
        rate_limit_per_min: rateLimit, is_active: true, is_public: true,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Widget created!"); onDone() }
    else { const r = await res.json(); toast.error(r.error || "Failed to create widget") }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <button key={s} onClick={() => s < step ? setStep(s) : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${step === s ? "bg-primary text-primary-foreground" : s < step ? "bg-primary/15 text-primary cursor-pointer" : "bg-muted text-muted-foreground"}`}>
            {s < step ? <Check className="h-3 w-3" /> : s}
            <span className="hidden sm:inline">{["Source", "Columns", "Filters", "View", "Style", "Publish"][s - 1]}</span>
          </button>
        ))}
      </div>

      {/* Step 1: Data Source */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5" />Select Data Source</CardTitle>
            <CardDescription>Choose which data to display in your widget</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DATA_SOURCES.map(ds => (
                <button key={ds.key} onClick={() => { setDataSource(ds.key); setStep(2) }}
                  className={`p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-accent/5 ${dataSource === ds.key ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{ds.label}</span>
                    <Badge variant="outline" className="text-[10px]">{ds.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ds.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Columns */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="h-5 w-5" />Select Columns</CardTitle>
            <CardDescription>Choose which fields to display. Click to toggle.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableCols.map(col => (
                <button key={col.key} onClick={() => toggleCol(col.key)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selectedCols.includes(col.key) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                  {selectedCols.includes(col.key) && <Check className="h-3 w-3 inline mr-1" />}
                  {col.label}
                  <span className="ml-1 opacity-50">({col.type})</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{selectedCols.length} column{selectedCols.length !== 1 ? "s" : ""} selected</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters & Sort */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" />Filters & Sorting</CardTitle>
            <CardDescription>Narrow down the data and set sort order</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <Label className="text-xs font-medium mb-2 block">Filters</Label>
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Select value={f.column} onValueChange={v => { const nf = [...filters]; nf[i].column = v; setFilters(nf) }}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{availableCols.map(c => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={f.operator} onValueChange={v => { const nf = [...filters]; nf[i].operator = v; setFilters(nf) }}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{FILTER_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {!["notnull", "isnull"].includes(f.operator) && (
                    <Input className="h-8 text-xs flex-1" placeholder="Value..." value={f.value}
                      onChange={e => { const nf = [...filters]; nf[i].value = e.target.value; setFilters(nf) }} />
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setFilters(filters.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setFilters([...filters, { column: availableCols[0]?.key || "", operator: "eq", value: "" }])}>
                <Plus className="h-3 w-3" />Add Filter
              </Button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs font-medium mb-1 block">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>{availableCols.map(c => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label className="text-xs font-medium mb-1 block">Direction</Label>
                <Select value={sortDir} onValueChange={v => setSortDir(v as "asc" | "desc")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                    <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label className="text-xs font-medium mb-1 block">Max Rows</Label>
                <Input type="number" className="h-8 text-xs" value={maxRows} onChange={e => setMaxRows(Math.min(500, Math.max(1, parseInt(e.target.value) || 25)))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: View Type */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><GalleryHorizontalEnd className="h-5 w-5" />Choose View Type</CardTitle>
            <CardDescription>Select how the data should be displayed</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VIEW_TYPES.map(vt => {
                const Icon = vt.icon
                return (
                  <button key={vt.value} onClick={() => setViewType(vt.value)}
                    className={`p-4 rounded-lg border text-left transition-all hover:border-primary/50 ${viewType === vt.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}>
                    <Icon className={`h-6 w-6 mb-2 ${viewType === vt.value ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-medium text-sm">{vt.label}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{vt.description}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Style & Options */}
      {step === 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" />Style & Options</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="text-xs font-medium mb-3 block">Visual Style</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STYLE_PRESETS.map(sp => (
                    <button 
                      key={sp.value} 
                      onClick={() => setStylePreset(sp.value)}
                      className={`group relative rounded-xl border-2 overflow-hidden transition-all ${stylePreset === sp.value ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"}`}
                    >
                      {/* Mini preview swatch */}
                      <div className="h-16 relative" style={{ background: sp.colors.bg }}>
                        <div className="absolute inset-x-0 top-0 h-5 flex items-center px-2 gap-1" style={{ background: sp.colors.headerBg, borderBottom: `1px solid ${sp.colors.border}` }}>
                          <div className="w-6 h-1.5 rounded-full" style={{ background: sp.colors.accent, opacity: 0.8 }} />
                          <div className="w-10 h-1.5 rounded-full" style={{ background: sp.colors.text, opacity: 0.3 }} />
                        </div>
                        <div className="absolute inset-x-2 top-7 flex flex-col gap-1">
                          <div className="flex gap-1">
                            <div className="h-1.5 rounded-full flex-1" style={{ background: sp.colors.text, opacity: 0.15 }} />
                            <div className="h-1.5 rounded-full flex-1" style={{ background: sp.colors.text, opacity: 0.15 }} />
                            <div className="h-1.5 rounded-full flex-1" style={{ background: sp.colors.text, opacity: 0.15 }} />
                          </div>
                          <div className="flex gap-1">
                            <div className="h-1.5 rounded-full flex-[2]" style={{ background: sp.colors.text, opacity: 0.08 }} />
                            <div className="h-1.5 rounded-full w-4" style={{ background: sp.colors.accent, opacity: 0.3 }} />
                            <div className="h-1.5 rounded-full flex-1" style={{ background: sp.colors.text, opacity: 0.08 }} />
                          </div>
                          <div className="flex gap-1">
                            <div className="h-1.5 rounded-full flex-1" style={{ background: sp.colors.text, opacity: 0.08 }} />
                            <div className="h-1.5 rounded-full w-5" style={{ background: sp.colors.accentLight }} />
                            <div className="h-1.5 rounded-full flex-[2]" style={{ background: sp.colors.text, opacity: 0.08 }} />
                          </div>
                        </div>
                        {stylePreset === sp.value && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 py-2 bg-card text-left">
                        <div className="font-semibold text-xs">{sp.label}</div>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sp.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between"><Label className="text-xs">Show Header</Label><Switch checked={showHeader} onCheckedChange={setShowHeader} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">Show Footer</Label><Switch checked={showFooter} onCheckedChange={setShowFooter} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">Show Pagination</Label><Switch checked={showPagination} onCheckedChange={setShowPagination} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">Show Search</Label><Switch checked={showSearch} onCheckedChange={setShowSearch} /></div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Header Title</Label>
                <Input className="h-8 text-xs" value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} placeholder={name || "Widget Title"} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Footer Text</Label>
                <Input className="h-8 text-xs" value={footerText} onChange={e => setFooterText(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Custom CSS (optional)</Label>
                <Textarea className="text-xs font-mono h-16 resize-none" value={customCss} onChange={e => setCustomCss(e.target.value)} placeholder="Override styles..." />
              </div>
              <Button variant="outline" size="sm" className="gap-1 self-start" onClick={fetchPreview} disabled={previewing}>
                {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}Refresh Preview
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5" />Live Preview</CardTitle></CardHeader>
            <CardContent>
              {previewing ? (
                <div className="py-20 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading preview...</div>
              ) : previewHtml ? (
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;}</style></head><body>${previewHtml}</body></html>`}
                  className="w-full rounded-lg border bg-background"
                  style={{ minHeight: 320, height: "auto", border: "none" }}
                  sandbox="allow-same-origin"
                  title="Widget Preview"
                  onLoad={e => {
                    const iframe = e.target as HTMLIFrameElement
                    if (iframe.contentDocument?.body) {
                      iframe.style.height = Math.max(320, iframe.contentDocument.body.scrollHeight + 16) + "px"
                    }
                  }}
                />
              ) : (
                <div className="py-20 text-center text-muted-foreground text-sm">Preview will appear here</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 6: Name & Publish */}
      {step === 6 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" />Name & Publish</CardTitle>
              <CardDescription>Give your widget a name and configure security</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="text-xs font-medium mb-1 block">Widget Name *</Label>
                <Input className="h-8 text-xs" value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")) }} placeholder="e.g. Active Voyages" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">URL Slug *</Label>
                <Input className="h-8 text-xs font-mono" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))} placeholder="active-voyages" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Description</Label>
                <Textarea className="text-xs h-14 resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this widget displays..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Rate Limit (req/min)</Label>
                  <Input type="number" className="h-8 text-xs" value={rateLimit} onChange={e => setRateLimit(parseInt(e.target.value) || 60)} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Refresh Interval (sec)</Label>
                  <Input type="number" className="h-8 text-xs" value={refreshInterval} onChange={e => setRefreshInterval(parseInt(e.target.value) || 300)} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Allowed Domains (comma-separated, blank = all)</Label>
                <Input className="h-8 text-xs" value={allowedDomains} onChange={e => setAllowedDomains(e.target.value)} placeholder="example.com, sub.example.com" />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank to allow embedding from any domain</p>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">Empty State Message</Label>
                <Input className="h-8 text-xs" value={emptyMessage} onChange={e => setEmptyMessage(e.target.value)} />
              </div>
              <Button onClick={handleSave} disabled={saving || !name || !dataSource} className="gap-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Create & Publish Widget
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5" />Final Preview</CardTitle></CardHeader>
            <CardContent>
              {previewHtml ? (
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;}</style></head><body>${previewHtml}</body></html>`}
                  className="w-full rounded-lg border bg-background"
                  style={{ minHeight: 320, height: "auto", border: "none" }}
                  sandbox="allow-same-origin"
                  title="Widget Final Preview"
                  onLoad={e => {
                    const iframe = e.target as HTMLIFrameElement
                    if (iframe.contentDocument?.body) {
                      iframe.style.height = Math.max(320, iframe.contentDocument.body.scrollHeight + 16) + "px"
                    }
                  }}
                />
              ) : (
                <div className="py-20 text-center text-muted-foreground text-sm">No preview available</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onDone()} className="gap-1">
          <ChevronLeft className="h-4 w-4" />{step > 1 ? "Back" : "Cancel"}
        </Button>
        {step < totalSteps && (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !dataSource} className="gap-1">
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
