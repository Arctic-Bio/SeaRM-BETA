"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TASK_TYPES, TASK_TYPE_LABELS, TASK_PRIORITIES, TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS,
  type Task, type TaskType, type TaskPriority, type TaskStatus,
} from "@/lib/db"
import {
  Plus, CheckSquare, Loader2, Calendar, AlertTriangle, Clock, User,
  Search, Ship, Navigation, Anchor, X, Trash2, MoreHorizontal, Filter,
  ArrowUpDown, Link2, Tag, ChevronDown,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Entity Autocomplete ────────────────────────────────────────────
type EntityType = "crew" | "ship" | "voyage"
interface EntityResult { type: EntityType; id: string; label: string; sublabel: string }

function EntitySearch({
  onSelect, exclude, placeholder = "Search crew, ships, voyages...",
}: {
  onSelect: (e: EntityResult) => void
  exclude?: { type: EntityType; id: string }[]
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<EntityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search/entities?q=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json()
      setResults(data.data || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  const handleInput = (v: string) => {
    setQuery(v)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 250)
  }

  const entityIcon = (type: EntityType) => {
    if (type === "crew") return <User className="h-3.5 w-3.5 text-chart-1" />
    if (type === "ship") return <Ship className="h-3.5 w-3.5 text-chart-2" />
    return <Navigation className="h-3.5 w-3.5 text-chart-3" />
  }

  const filtered = exclude
    ? results.filter((r) => !exclude.some((e) => e.type === r.type && e.id === r.id))
    : results

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 1 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="pl-8 h-9 text-sm"
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
          {filtered.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); setQuery(""); setOpen(false) }}
            >
              {entityIcon(r.type)}
              <span className="font-medium">{r.label}</span>
              <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{r.type}</Badge>
              <span className="text-xs text-muted-foreground truncate max-w-32">{r.sublabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Entity Tag ─────────────────────────────────────────────────────
function EntityTag({ type, label, href, onRemove }: {
  type: EntityType; label: string; href: string; onRemove?: () => void
}) {
  const colors: Record<EntityType, string> = {
    crew: "bg-chart-1/10 text-chart-1 border-chart-1/20 hover:bg-chart-1/20",
    ship: "bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/20",
    voyage: "bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/20",
  }
  const icons: Record<EntityType, React.ReactNode> = {
    crew: <User className="h-3 w-3" />,
    ship: <Ship className="h-3 w-3" />,
    voyage: <Navigation className="h-3 w-3" />,
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border transition-colors", colors[type])}>
      {icons[type]}
      <Link href={href} className="hover:underline">{label}</Link>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="ml-0.5 opacity-60 hover:opacity-100">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function TasksPage() {
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [sortField, setSortField] = useState<"priority" | "due_date" | "created_at">("priority")

  // Build query string
  const buildUrl = () => {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
    if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter)
    if (typeFilter && typeFilter !== "all") params.set("task_type", typeFilter)
    if (searchQuery) params.set("search", searchQuery)
    const qs = params.toString()
    return `/api/tasks${qs ? `?${qs}` : ""}`
  }

  const { data, isLoading, mutate } = useSWR(buildUrl(), fetcher)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", task_type: "general" as TaskType,
    priority: "medium" as TaskPriority, due_date: "", assigned_to: "",
    crew_id: "" as string, ship_id: "" as string, voyage_id: "" as string,
  })
  const [linkedEntities, setLinkedEntities] = useState<EntityResult[]>([])

  // Detail / edit
  const [editTask, setEditTask] = useState<(Task & { crew_name?: string; ship_name?: string; voyage_name?: string }) | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Search debounce
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>()
  const handleSearch = (v: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setSearchQuery(v), 300)
  }

  const tasks: (Task & { crew_name?: string; ship_name?: string; voyage_name?: string })[] = data?.data || []

  // Sort locally since API already sorts by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === "due_date") {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (sortField === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return 0 // default is API priority sort
  })

  // ─── Handlers ───────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title) { toast.error("Title is required"); return }
    setSaving(true)
    const crew_id = linkedEntities.find((e) => e.type === "crew")?.id || form.crew_id || null
    const ship_id = linkedEntities.find((e) => e.type === "ship")?.id || form.ship_id || null
    const voyage_id = linkedEntities.find((e) => e.type === "voyage")?.id || form.voyage_id || null
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, crew_id, ship_id, voyage_id }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Task created")
      mutate()
      setCreateOpen(false)
      setForm({ title: "", description: "", task_type: "general", priority: "medium", due_date: "", assigned_to: "", crew_id: "", ship_id: "", voyage_id: "" })
      setLinkedEntities([])
    } catch { toast.error("Failed to create task") }
    finally { setSaving(false) }
  }

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === "completed" ? "open" : "completed"
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      mutate()
    } catch { toast.error("Failed to update") }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/tasks/${deleteId}`, { method: "DELETE" })
      toast.success("Task deleted")
      mutate()
    } catch { toast.error("Failed to delete") }
    finally { setDeleteId(null); setEditTask(null) }
  }

  const handleUpdateField = async (id: string, field: string, value: string | null) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      mutate()
      toast.success("Updated")
    } catch { toast.error("Update failed") }
  }

  const handleLinkEntity = (entity: EntityResult) => {
    // Replace same-type entity (only one crew, one ship, one voyage per task)
    setLinkedEntities((prev) => [...prev.filter((e) => e.type !== entity.type), entity])
  }

  const isOverdue = (task: Task) =>
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"

  // Stats
  const totalOpen = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length
  const overdue = tasks.filter((t) => isOverdue(t)).length
  const urgent = tasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length
  const dueToday = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false
    const d = new Date(t.due_date)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  // Group
  const urgentTasks = sortedTasks.filter((t) => t.priority === "urgent" && t.status !== "completed")
  const highTasks = sortedTasks.filter((t) => t.priority === "high" && t.status !== "completed")
  const normalTasks = sortedTasks.filter((t) => !["urgent", "high"].includes(t.priority) && t.status !== "completed")
  const completedTasks = sortedTasks.filter((t) => t.status === "completed")

  // ─── Task Row ───────────────────────────────────────────────────
  const TaskRow = ({ task }: { task: Task & { crew_name?: string; ship_name?: string; voyage_name?: string } }) => (
    <div className={cn(
      "group flex items-start gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors",
      isOverdue(task) && "bg-destructive/5",
    )}>
      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => handleToggle(task)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setEditTask(task)}
            className={cn("text-sm font-medium text-left hover:underline",
              task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {task.title}
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={cn("text-[10px]", TASK_PRIORITY_COLORS[task.priority as TaskPriority])}>
              {TASK_PRIORITY_LABELS[task.priority as TaskPriority] || task.priority}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {TASK_TYPE_LABELS[task.task_type as TaskType] || task.task_type}
            </Badge>
          </div>
        </div>
        {task.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {task.crew_name && task.crew_id && (
            <EntityTag type="crew" label={task.crew_name} href={`/crew/${task.crew_id}`} />
          )}
          {task.ship_name && task.ship_id && (
            <EntityTag type="ship" label={task.ship_name} href={`/ships/${task.ship_id}`} />
          )}
          {task.voyage_name && task.voyage_id && (
            <EntityTag type="voyage" label={task.voyage_name} href={`/voyages/${task.voyage_id}`} />
          )}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1 text-[11px]", isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground")}>
              {isOverdue(task) ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.assigned_to && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />{task.assigned_to}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditTask(task)}>Edit task</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggle(task)}>
            {task.status === "completed" ? "Re-open" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdateField(task.id, "priority", "urgent")}>Set Urgent</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateField(task.id, "priority", "high")}>Set High</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateField(task.id, "priority", "medium")}>Set Medium</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateField(task.id, "priority", "low")}>Set Low</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdateField(task.id, "status", "in_progress")}>In Progress</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteId(task.id)} className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  // ─── Task Section ───────────────────────────────────────────────
  const TaskSection = ({ title, tasks, icon, color }: { title: string; tasks: any[]; icon?: React.ReactNode; color?: string }) => {
    if (tasks.length === 0) return null
    return (
      <section>
        <div className={cn("flex items-center gap-2 mb-2 text-sm font-semibold", color || "text-foreground")}>
          {icon}
          {title} ({tasks.length})
        </div>
        <Card className="overflow-hidden">
          {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        </Card>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track action items, link to crew, ships, and campaigns.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{totalOpen}</p>
          <p className="text-xs text-muted-foreground">Open Tasks</p>
        </CardContent></Card>
        <Card className={overdue > 0 ? "border-destructive/30" : ""}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", overdue > 0 && "text-destructive")}>{overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className={urgent > 0 ? "border-warning/30" : ""}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", urgent > 0 && "text-warning")}>{urgent}</p>
            <p className="text-xs text-muted-foreground">Urgent</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{dueToday}</p>
          <p className="text-xs text-muted-foreground">Due Today</p>
        </CardContent></Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, people, ships..."
            className="pl-9"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter || "all"} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as any)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort: Priority</SelectItem>
              <SelectItem value="due_date">Sort: Due Date</SelectItem>
              <SelectItem value="created_at">Sort: Newest</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter || priorityFilter || typeFilter || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setPriorityFilter(""); setTypeFilter(""); setSearchQuery("") }} className="h-9 text-xs gap-1">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16">
          <CheckSquare className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No tasks found</p>
          <p className="mt-1 text-xs text-muted-foreground">Create tasks or adjust your filters.</p>
        </CardContent></Card>
      ) : (
        <div className="flex flex-col gap-5">
          <TaskSection title="Urgent" tasks={urgentTasks} icon={<AlertTriangle className="h-4 w-4" />} color="text-destructive" />
          <TaskSection title="High Priority" tasks={highTasks} icon={<Clock className="h-4 w-4" />} color="text-warning" />
          <TaskSection title="Open" tasks={normalTasks} />
          <TaskSection title="Completed" tasks={completedTasks} color="text-muted-foreground" />
        </div>
      )}

      {/* ─── Create Task Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add an action item and link it to crew, ships, or campaigns.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Schedule interview for bosun candidate" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Details, notes, context..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v as TaskType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Assigned To</Label>
                <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Name" />
              </div>
            </div>
            {/* Entity Linking */}
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5"><Link2 className="h-3.5 w-3.5" /> Link to Crew, Ship, or Campaign</Label>
              <EntitySearch
                onSelect={handleLinkEntity}
                exclude={linkedEntities.map((e) => ({ type: e.type, id: e.id }))}
                placeholder="Type to search and link..."
              />
              {linkedEntities.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {linkedEntities.map((e) => (
                    <EntityTag
                      key={`${e.type}-${e.id}`}
                      type={e.type}
                      label={e.label}
                      href={e.type === "crew" ? `/crew/${e.id}` : e.type === "ship" ? `/ships/${e.id}` : `/voyages/${e.id}`}
                      onRemove={() => setLinkedEntities((prev) => prev.filter((p) => !(p.type === e.type && p.id === e.id)))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit / Detail Dialog ────────────────────────────────────── */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          {editTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Checkbox
                    checked={editTask.status === "completed"}
                    onCheckedChange={() => { handleToggle(editTask); setEditTask(null) }}
                  />
                  <span className={editTask.status === "completed" ? "line-through text-muted-foreground" : ""}>{editTask.title}</span>
                </DialogTitle>
                <DialogDescription>
                  Created {new Date(editTask.created_at).toLocaleDateString()} - {TASK_TYPE_LABELS[editTask.task_type as TaskType]}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                {editTask.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p className="text-sm mt-1">{editTask.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Priority</Label>
                    <Select value={editTask.priority} onValueChange={(v) => { handleUpdateField(editTask.id, "priority", v); setEditTask({ ...editTask, priority: v as TaskPriority }) }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <Select value={editTask.status} onValueChange={(v) => { handleUpdateField(editTask.id, "status", v); setEditTask({ ...editTask, status: v as TaskStatus }) }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Type</Label>
                    <Select value={editTask.task_type} onValueChange={(v) => { handleUpdateField(editTask.id, "task_type", v); setEditTask({ ...editTask, task_type: v as TaskType }) }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{TASK_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Due Date</Label>
                    <Input
                      type="date" className="mt-1"
                      value={editTask.due_date?.split("T")[0] || ""}
                      onChange={(e) => { handleUpdateField(editTask.id, "due_date", e.target.value || null); setEditTask({ ...editTask, due_date: e.target.value }) }}
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Assigned To</Label>
                    <Input
                      className="mt-1"
                      value={editTask.assigned_to}
                      onChange={(e) => setEditTask({ ...editTask, assigned_to: e.target.value })}
                      onBlur={(e) => handleUpdateField(editTask.id, "assigned_to", e.target.value)}
                    />
                  </div>
                </div>
                {/* Linked Entities */}
                <div>
                  <Label className="text-muted-foreground text-xs flex items-center gap-1.5 mb-2"><Link2 className="h-3 w-3" /> Linked Entities</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editTask.crew_name && editTask.crew_id && (
                      <EntityTag type="crew" label={editTask.crew_name} href={`/crew/${editTask.crew_id}`}
                        onRemove={() => { handleUpdateField(editTask.id, "crew_id", null); setEditTask({ ...editTask, crew_id: null, crew_name: undefined }) }}
                      />
                    )}
                    {editTask.ship_name && editTask.ship_id && (
                      <EntityTag type="ship" label={editTask.ship_name} href={`/ships/${editTask.ship_id}`}
                        onRemove={() => { handleUpdateField(editTask.id, "ship_id", null); setEditTask({ ...editTask, ship_id: null, ship_name: undefined }) }}
                      />
                    )}
                    {editTask.voyage_name && editTask.voyage_id && (
                      <EntityTag type="voyage" label={editTask.voyage_name} href={`/voyages/${editTask.voyage_id}`}
                        onRemove={() => { handleUpdateField(editTask.id, "voyage_id", null); setEditTask({ ...editTask, voyage_id: null, voyage_name: undefined }) }}
                      />
                    )}
                  </div>
                  <div className="mt-2">
                    <EntitySearch
                      onSelect={(e) => {
                        const field = e.type === "crew" ? "crew_id" : e.type === "ship" ? "ship_id" : "voyage_id"
                        const nameField = e.type === "crew" ? "crew_name" : e.type === "ship" ? "ship_name" : "voyage_name"
                        handleUpdateField(editTask.id, field, e.id)
                        setEditTask({ ...editTask, [field]: e.id, [nameField]: e.label })
                      }}
                      placeholder="Link another entity..."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex justify-between">
                <Button variant="destructive" size="sm" onClick={() => setDeleteId(editTask.id)} className="gap-1 mr-auto">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
                <Button variant="outline" onClick={() => setEditTask(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this task. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
