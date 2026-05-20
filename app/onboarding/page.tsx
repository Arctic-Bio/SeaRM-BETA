"use client"

import useSWR from "swr"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  Plus, Loader2, ClipboardList, CheckCircle2, Clock, Trash2,
  ChevronDown, ChevronRight, Search, AlertTriangle, User, Ship,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const TEMPLATES = ["Standard Onboarding", "Volunteer Onboarding", "Officer Onboarding"]

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-muted text-muted-foreground border-border" },
  in_progress: { label: "In Progress", class: "bg-warning/15 text-warning border-warning/25" },
  completed: { label: "Completed", class: "bg-success/15 text-success border-success/25" },
}

export default function OnboardingPage() {
  const { data, isLoading, mutate } = useSWR("/api/checklists", fetcher)
  const { data: crewData } = useSWR("/api/crew?limit=500", fetcher)
  const { data: voyagesData } = useSWR("/api/voyages", fetcher)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({ crew_id: "", voyage_id: "", template_name: "Standard Onboarding", auto_tasks: true })

  const checklists = Array.isArray(data) ? data : []
  const crew = crewData?.data || []
  const voyages = Array.isArray(voyagesData) ? voyagesData : voyagesData?.data ?? []

  const filtered = useMemo(() => {
    return checklists.filter((c: any) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (search) {
        const s = search.toLowerCase()
        const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase()
        const tmpl = (c.template_name || "").toLowerCase()
        const voyage = (c.voyage_name || "").toLowerCase()
        if (!name.includes(s) && !tmpl.includes(s) && !voyage.includes(s)) return false
      }
      return true
    })
  }, [checklists, statusFilter, search])

  const stats = {
    total: checklists.length,
    pending: checklists.filter((c: any) => c.status === "pending").length,
    inProgress: checklists.filter((c: any) => c.status === "in_progress").length,
    completed: checklists.filter((c: any) => c.status === "completed").length,
  }

  const handleCreate = async () => {
    if (!form.crew_id) { toast.error("Select a crew member"); return }
    setSaving(true)
    const res = await fetch("/api/checklists", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Checklist created" + (form.auto_tasks ? " with tasks" : ""))
      setCreateOpen(false)
      setForm({ crew_id: "", voyage_id: "", template_name: "Standard Onboarding", auto_tasks: true })
      mutate()
    } else {
      const err = await res.json().catch(() => null)
      toast.error(err?.error || "Failed to create checklist")
    }
  }

  const toggleItem = async (checklistId: string, items: any[], itemKey: string) => {
    const updated = items.map((i: any) => i.key === itemKey ? { ...i, done: !i.done } : i)
    const res = await fetch(`/api/checklists/${checklistId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: updated }),
    })
    if (res.ok) mutate()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/checklists/${deleteId}`, { method: "DELETE" })
    toast.success("Checklist deleted")
    setDeleteId(null)
    if (expandedId === deleteId) setExpandedId(null)
    mutate()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Onboarding Checklists</h1>
          <p className="text-sm text-muted-foreground mt-1">Track crew onboarding progress with templated checklists</p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Checklist</Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: ClipboardList, iconClass: "text-primary", bgClass: "bg-primary/10" },
          { label: "Pending", value: stats.pending, icon: Clock, iconClass: "text-muted-foreground", bgClass: "bg-muted" },
          { label: "In Progress", value: stats.inProgress, icon: AlertTriangle, iconClass: "text-warning", bgClass: "bg-warning/10" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, iconClass: "text-success", bgClass: "bg-success/10" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", s.bgClass)}>
                <s.icon className={cn("h-4 w-4", s.iconClass)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search crew, template, voyage..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-3">Pending</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs px-3">Active</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-3">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Checklist Cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {checklists.length === 0 ? "No onboarding checklists yet. Create one for a crew member to get started." : "No checklists match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : filtered.map((cl: any) => {
          const items: { key: string; label: string; done: boolean }[] = typeof cl.items === "string" ? JSON.parse(cl.items) : cl.items || []
          const isExpanded = expandedId === cl.id
          const doneCount = items.filter((i) => i.done).length
          const totalCount = items.length

          return (
            <Card key={cl.id} className={cn("transition-all group", isExpanded && "ring-1 ring-primary/20")}>
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : cl.id)}
              >
                <div className="shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                {/* Avatar placeholder */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/crew/${cl.crew_id}`}
                      className="text-sm font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {cl.first_name} {cl.last_name}
                    </Link>
                    <Badge variant="outline" className="text-[10px] shrink-0">{cl.template_name.replace(" Onboarding", "")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cl.voyage_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ship className="h-3 w-3" />{cl.voyage_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{doneCount}/{totalCount} items</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 w-32">
                    <Progress value={cl.progress} className="h-2" />
                    <span className="text-xs font-mono font-medium text-muted-foreground w-9 text-right">{cl.progress}%</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_CONFIG[cl.status]?.class)}>
                    {STATUS_CONFIG[cl.status]?.label || cl.status}
                  </Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(cl.id) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded checklist items */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="ml-[3.25rem] border rounded-lg overflow-hidden">
                    {items.map((item, idx) => (
                      <label
                        key={item.key}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40",
                          idx < items.length - 1 && "border-b",
                          item.done && "bg-success/5",
                        )}
                      >
                        <Checkbox
                          checked={item.done}
                          onCheckedChange={() => toggleItem(cl.id, items, item.key)}
                          className="shrink-0"
                        />
                        <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.label}</span>
                        {item.done && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                      </label>
                    ))}
                  </div>

                  {/* Progress summary bar */}
                  <div className="ml-[3.25rem] mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{doneCount} of {totalCount} completed</span>
                    <div className="flex items-center gap-1.5">
                      {cl.status !== "completed" && doneCount === totalCount && (
                        <span className="text-xs text-success font-medium">All items done</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this onboarding checklist and its progress. Auto-generated tasks will not be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Onboarding Checklist</DialogTitle>
            <DialogDescription>Select a crew member, template, and optionally link to a voyage.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Crew Member *</label>
              <Select value={form.crew_id} onValueChange={(v) => setForm((f) => ({ ...f, crew_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select crew member..." /></SelectTrigger>
                <SelectContent>
                  {crew.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Template</label>
              <Select value={form.template_name} onValueChange={(v) => setForm((f) => ({ ...f, template_name: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Voyage (optional)</label>
              <Select value={form.voyage_id} onValueChange={(v) => setForm((f) => ({ ...f, voyage_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Link to a voyage..." /></SelectTrigger>
                <SelectContent>
                  {voyages.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Switch checked={form.auto_tasks} onCheckedChange={(v) => setForm((f) => ({ ...f, auto_tasks: v }))} />
              <div>
                <p className="text-sm font-medium">Auto-generate tasks</p>
                <p className="text-xs text-muted-foreground">Create a task for each checklist item</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
