"use client"

import useSWR from "swr"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AlertTriangle, Plus, Loader2, Shield, Search, Eye, Trash2, Pencil } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-warning/15 text-warning border-warning/25",
  high: "bg-chart-5/15 text-chart-5 border-chart-5/25",
  critical: "bg-destructive/15 text-destructive border-destructive/25",
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/25",
  investigating: "bg-warning/15 text-warning border-warning/25",
  resolved: "bg-success/15 text-success border-success/25",
  closed: "bg-muted text-muted-foreground border-border",
}

const CATEGORIES = ["general", "injury", "equipment_failure", "environmental", "navigation", "security", "fire", "man_overboard", "collision", "grounding"]

export default function IncidentsPage() {
  const { data, isLoading, mutate } = useSWR("/api/incidents", fetcher)
  const { data: voyagesData } = useSWR("/api/voyages", fetcher)
  const { data: shipsData } = useSWR("/api/ships", fetcher)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")

  const emptyForm = {
    title: "", description: "", severity: "medium", category: "general",
    voyage_id: "", ship_id: "", location: "", reported_by: "",
    corrective_actions: "", follow_up: "",
  }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  const incidents = Array.isArray(data) ? data : []
  const voyages = Array.isArray(voyagesData) ? voyagesData : voyagesData?.data ?? []
  const ships = Array.isArray(shipsData) ? shipsData : shipsData?.data ?? []

  const filtered = incidents.filter((i: any) => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false
    if (filterSeverity !== "all" && i.severity !== filterSeverity) return false
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    open: incidents.filter((i: any) => i.status === "open").length,
    investigating: incidents.filter((i: any) => i.status === "investigating").length,
    critical: incidents.filter((i: any) => i.severity === "critical" && i.status !== "closed").length,
    total: incidents.length,
  }

  const handleCreate = async () => {
    setSaving(true)
    const res = await fetch("/api/incidents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Incident reported")
      setCreateOpen(false)
      setForm(emptyForm)
      mutate()
    } else toast.error("Failed to create incident")
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/incidents/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    toast.success("Status updated")
    mutate()
    if (selected?.id === id) setSelected({ ...selected, status })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/incidents/${deleteId}`, { method: "DELETE" })
    toast.success("Incident deleted")
    setDeleteId(null)
    if (selected?.id === deleteId) { setDetailOpen(false); setSelected(null) }
    mutate()
  }

  const openEdit = (inc: any) => {
    setEditForm({
      title: inc.title || "", description: inc.description || "",
      severity: inc.severity || "medium", category: inc.category || "general",
      voyage_id: inc.voyage_id || "", ship_id: inc.ship_id || "",
      location: inc.location || "", reported_by: inc.reported_by || "",
      corrective_actions: inc.corrective_actions || "", follow_up: inc.follow_up || "",
    })
    setSelected(inc)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`/api/incidents/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Incident updated")
      setEditOpen(false)
      mutate()
    } else toast.error("Failed to update incident")
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Incident Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Safety incident tracking and management</p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Report Incident</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Open</p><p className="text-lg font-bold">{stats.open}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center"><Search className="h-4 w-4 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Investigating</p><p className="text-lg font-bold">{stats.investigating}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center"><Shield className="h-4 w-4 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Critical Active</p><p className="text-lg font-bold">{stats.critical}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Reports</p><p className="text-lg font-bold">{stats.total}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["open", "investigating", "resolved", "closed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Incident</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Ship/Voyage</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No incidents found</TableCell></TableRow>
              ) : filtered.map((inc: any) => (
                <TableRow key={inc.id} className="group cursor-pointer" onClick={() => { setSelected(inc); setDetailOpen(true) }}>
                  <TableCell>
                    <div><span className="text-sm font-medium">{inc.title}</span></div>
                    {inc.description && <p className="text-xs text-muted-foreground truncate max-w-64 mt-0.5">{inc.description}</p>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", SEVERITY_COLORS[inc.severity])}>{inc.severity}</Badge></TableCell>
                  <TableCell>
                    <Select value={inc.status} onValueChange={(v) => { handleStatusChange(inc.id, v) }} >
                      <SelectTrigger className="h-6 w-28 text-[10px] border-0 p-0" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[inc.status])}>{inc.status}</Badge>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {["open", "investigating", "resolved", "closed"].map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{inc.category?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inc.ship_name || inc.voyage_name || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(inc.occurred_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelected(inc); setDetailOpen(true) }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(inc) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(inc.id) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Safety Incident</DialogTitle>
            <DialogDescription>Document a new safety incident or near-miss event.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Incident title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Detailed description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize text-xs">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ship</label>
                <Select value={form.ship_id} onValueChange={(v) => setForm((f) => ({ ...f, ship_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{ships.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Voyage</label>
                <Select value={form.voyage_id} onValueChange={(v) => setForm((f) => ({ ...f, voyage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{voyages.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            <Input placeholder="Reported by" value={form.reported_by} onChange={(e) => setForm((f) => ({ ...f, reported_by: e.target.value }))} />
            <Textarea placeholder="Corrective actions taken..." value={form.corrective_actions} onChange={(e) => setForm((f) => ({ ...f, corrective_actions: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[selected.severity])}>{selected.severity}</Badge>
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[selected.status])}>{selected.status}</Badge>
                </div>
                <DialogTitle className="mt-2">{selected.title}</DialogTitle>
                <DialogDescription>{selected.description || "No description provided."}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-muted-foreground block">Category</span><span className="capitalize">{selected.category?.replace(/_/g, " ")}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Date</span>{new Date(selected.occurred_at).toLocaleString()}</div>
                  <div><span className="text-xs text-muted-foreground block">Location</span>{selected.location || "-"}</div>
                  <div><span className="text-xs text-muted-foreground block">Reported By</span>{selected.reported_by || "-"}</div>
                  {selected.ship_name && <div><span className="text-xs text-muted-foreground block">Ship</span>{selected.ship_name}</div>}
                  {selected.voyage_name && <div><span className="text-xs text-muted-foreground block">Voyage</span>{selected.voyage_name}</div>}
                </div>
                {selected.corrective_actions && (
                  <div><span className="text-xs text-muted-foreground block mb-1">Corrective Actions</span><p className="text-sm bg-muted/50 rounded p-2">{selected.corrective_actions}</p></div>
                )}
                {selected.follow_up && (
                  <div><span className="text-xs text-muted-foreground block mb-1">Follow-up</span><p className="text-sm bg-muted/50 rounded p-2">{selected.follow_up}</p></div>
                )}
              </div>
              <DialogFooter className="flex !justify-between">
                <Button variant="destructive" size="sm" className="gap-1" onClick={() => { setDetailOpen(false); setDeleteId(selected.id) }}>
                  <Trash2 className="h-3 w-3" />Delete
                </Button>
                <div className="flex gap-2">
                  <Select value={selected.status} onValueChange={(v) => handleStatusChange(selected.id, v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{["open", "investigating", "resolved", "closed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setDetailOpen(false); openEdit(selected) }}>
                    <Pencil className="h-3 w-3" />Edit
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this safety incident report and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Incident Report</DialogTitle>
            <DialogDescription>Update the details of this safety incident.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Incident title *" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Detailed description..." value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                <Select value={editForm.severity} onValueChange={(v) => setEditForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize text-xs">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ship</label>
                <Select value={editForm.ship_id} onValueChange={(v) => setEditForm((f) => ({ ...f, ship_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{ships.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Voyage</label>
                <Select value={editForm.voyage_id} onValueChange={(v) => setEditForm((f) => ({ ...f, voyage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{voyages.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Location" value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
            <Input placeholder="Reported by" value={editForm.reported_by} onChange={(e) => setEditForm((f) => ({ ...f, reported_by: e.target.value }))} />
            <Textarea placeholder="Corrective actions taken..." value={editForm.corrective_actions} onChange={(e) => setEditForm((f) => ({ ...f, corrective_actions: e.target.value }))} rows={2} />
            <Textarea placeholder="Follow-up notes..." value={editForm.follow_up} onChange={(e) => setEditForm((f) => ({ ...f, follow_up: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.title || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
