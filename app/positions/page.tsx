"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import {
  DEPARTMENTS, COMMON_POSITIONS, SKILL_FIELDS, SKILL_LEVELS,
  POSITION_STATUS_LABELS, POSITION_STATUS_COLORS, TASK_PRIORITIES,
  type PositionStatus,
} from "@/lib/db"
import {
  Briefcase, Plus, Loader2, Wand2, X, UserCheck, UserX, Ship, Calendar, Star,
  CheckCircle2, XCircle, Trash2, DollarSign,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PositionsPage() {
  const [statusFilter, setStatusFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchPositionId, setMatchPositionId] = useState("")
  const [matchData, setMatchData] = useState<any>(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [unassignId, setUnassignId] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState({
    voyage_id: "", position_name: "", department: "", priority: "medium",
    min_skill_level: "Basic", notes: "",
    required_skills: [] as { skill: string; level: string }[],
    is_paid: false, hourly_rate: "", daily_rate: "", estimated_hours: "",
  })
  const [newSkill, setNewSkill] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState("Basic")

  const params = new URLSearchParams()
  if (statusFilter) params.set("status", statusFilter)
  if (deptFilter) params.set("department", deptFilter)

  const { data: positions, isLoading, mutate } = useSWR(`/api/positions?${params}`, fetcher)
  const { data: voyages } = useSWR("/api/voyages", fetcher)

  const voyageList = Array.isArray(voyages) ? voyages : voyages?.data ?? []

  const openCount = (positions || []).filter((p: any) => p.status === "open" || p.status === "candidates_identified" || p.status === "interviewing").length
  const filledCount = (positions || []).filter((p: any) => p.status === "filled").length
  const paidCount = (positions || []).filter((p: any) => p.is_paid).length

  const handleCreate = async () => {
    if (!form.voyage_id || !form.position_name) {
      toast.error("Voyage and position name are required")
      return
    }
    await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    toast.success("Position created")
    setCreateOpen(false)
    setForm({ voyage_id: "", position_name: "", department: "", priority: "medium", min_skill_level: "Basic", notes: "", required_skills: [], is_paid: false, hourly_rate: "", daily_rate: "", estimated_hours: "" })
    mutate()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    mutate()
  }

  const openAutoMatch = async (posId: string) => {
    setMatchPositionId(posId)
    setMatchOpen(true)
    setMatchLoading(true)
    setMatchData(null)
    try {
      const res = await fetch(`/api/positions/${posId}/match`)
      const data = await res.json()
      setMatchData(data)
    } catch {
      toast.error("Failed to run auto-match")
    } finally {
      setMatchLoading(false)
    }
  }

  const assignCrew = async (posId: string, crewId: string) => {
    await fetch(`/api/positions/${posId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_crew_id: crewId, status: "filled" }),
    })
    toast.success("Crew member assigned to position")
    setMatchOpen(false)
    mutate()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/positions/${deleteId}`, { method: "DELETE" })
    toast.success("Position deleted")
    setDeleteId(null)
    mutate()
  }

  const handleUnassign = async () => {
    if (!unassignId) return
    await fetch(`/api/positions/${unassignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_crew_id: null, status: "open" }),
    })
    toast.success("Assignment removed")
    setUnassignId(null)
    mutate()
  }

  const addRequiredSkill = () => {
    if (!newSkill) return
    setForm((f) => ({
      ...f,
      required_skills: [...f.required_skills, { skill: newSkill, level: newSkillLevel }],
    }))
    setNewSkill("")
    setNewSkillLevel("Basic")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Positions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage open positions across all voyages and campaigns
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Position
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Positions</p>
            <p className="text-2xl font-bold">{(positions || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Open / Active</p>
            <p className="text-2xl font-bold text-warning">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Filled</p>
            <p className="text-2xl font-bold text-success">{filledCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Paid Positions</p>
            <p className="text-2xl font-bold text-chart-2">{paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Fill Rate</p>
            <p className="text-2xl font-bold">
              {(positions || []).length > 0 ? Math.round((filledCount / (positions || []).length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(POSITION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter || "all"} onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Positions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !positions?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Briefcase className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No positions found</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a position to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Position</TableHead>
                  <TableHead className="text-xs">Voyage / Ship</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Assigned To</TableHead>
                  <TableHead className="text-xs">Pay</TableHead>
                  <TableHead className="text-xs">Required Skills</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(positions || []).map((pos: any) => (
                  <TableRow key={pos.id} className="group">
                    <TableCell className="font-medium text-sm">{pos.position_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{pos.voyage_name || "No voyage"}</div>
                      {pos.ship_name && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Ship className="h-3 w-3" />{pos.ship_name}</div>}
                      {pos.departure_date && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(pos.departure_date).toLocaleDateString()}
                          {pos.return_date && ` - ${new Date(pos.return_date).toLocaleDateString()}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pos.department || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] capitalize",
                        pos.priority === "urgent" && "border-destructive/40 text-destructive",
                        pos.priority === "high" && "border-chart-5/40 text-chart-5",
                      )}>
                        {pos.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={pos.status} onValueChange={(v) => handleStatusChange(pos.id, v)}>
                        <SelectTrigger className="h-7 w-auto border-none bg-transparent p-0 shadow-none">
                          <Badge variant="outline" className={cn("text-[10px]", POSITION_STATUS_COLORS[pos.status as PositionStatus])}>
                            {POSITION_STATUS_LABELS[pos.status as PositionStatus] || pos.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(POSITION_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {pos.assigned_first_name ? (
                        <Link href={`/crew/${pos.assigned_crew_id}`} className="text-sm hover:underline flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-success" />
                          {pos.assigned_first_name} {pos.assigned_last_name}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pos.is_paid ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-[10px] border-chart-2/40 text-chart-2 gap-0.5 w-fit">
                            <DollarSign className="h-2.5 w-2.5" /> Paid
                          </Badge>
                          {Number(pos.hourly_rate) > 0 && (
                            <span className="text-[10px] text-muted-foreground">${Number(pos.hourly_rate).toFixed(2)}/hr</span>
                          )}
                          {Number(pos.daily_rate) > 0 && (
                            <span className="text-[10px] text-muted-foreground">${Number(pos.daily_rate).toFixed(2)}/day</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Volunteer</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-48">
                        {(() => {
                          const skills = typeof pos.required_skills === "string" ? JSON.parse(pos.required_skills) : pos.required_skills ?? []
                          return skills.map((s: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {s.skill}: {s.level}
                            </Badge>
                          ))
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {pos.status !== "filled" && pos.status !== "cancelled" && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => openAutoMatch(pos.id)}>
                            <Wand2 className="h-3 w-3" /> Auto-Match
                          </Button>
                        )}
                        {pos.assigned_crew_id && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-warning" onClick={() => setUnassignId(pos.id)}>
                            <UserX className="h-3 w-3" /> Unassign
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(pos.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Position Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Position</DialogTitle>
            <DialogDescription>Define the role and required skills for this position.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Voyage</label>
              <Select value={form.voyage_id} onValueChange={(v) => setForm((f) => ({ ...f, voyage_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select voyage..." /></SelectTrigger>
                <SelectContent>
                  {voyageList.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Position</label>
                <Select value={form.position_name} onValueChange={(v) => setForm((f) => ({ ...f, position_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select position..." /></SelectTrigger>
                  <SelectContent>
                    {COMMON_POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select dept..." /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Skill Level</label>
                <Select value={form.min_skill_level} onValueChange={(v) => setForm((f) => ({ ...f, min_skill_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.filter(Boolean).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Required skills builder */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Required Skills</label>
              <div className="flex items-center gap-2">
                <Select value={newSkill} onValueChange={setNewSkill}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Skill..." /></SelectTrigger>
                  <SelectContent>
                    {SKILL_FIELDS.map((s) => <SelectItem key={s.key} value={s.label}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newSkillLevel} onValueChange={setNewSkillLevel}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.filter(Boolean).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addRequiredSkill} disabled={!newSkill}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {form.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.required_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {s.skill}: {s.level}
                      <button onClick={() => setForm((f) => ({ ...f, required_skills: f.required_skills.filter((_, j) => j !== i) }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Paid position toggle */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-foreground">Paid Position</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enable to set wages for this role</p>
                </div>
                <Switch checked={form.is_paid} onCheckedChange={(v) => setForm((f) => ({ ...f, is_paid: v }))} />
              </div>
              {form.is_paid && (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Hourly Rate ($)</label>
                    <Input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Daily Rate ($)</label>
                    <Input type="number" step="0.01" min="0" value={form.daily_rate} onChange={(e) => setForm((f) => ({ ...f, daily_rate: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Est. Hours</label>
                    <Input type="number" step="1" min="0" value={form.estimated_hours} onChange={(e) => setForm((f) => ({ ...f, estimated_hours: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Position</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this position and remove any crew assignment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Position
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign Confirmation */}
      <AlertDialog open={!!unassignId} onOpenChange={(open) => !open && setUnassignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the crew member from this position and set the position status back to Open. The crew member will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>Remove Assignment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Match Dialog */}
      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> Auto-Match Candidates
            </DialogTitle>
            <DialogDescription>
              Candidates ranked by skill match, department fit, qualifications, and rating.
            </DialogDescription>
          </DialogHeader>

          {matchLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : matchData?.candidates ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Position: <strong>{matchData.position.position_name}</strong> -- {matchData.position.department}
              </p>
              {matchData.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No matching candidates found.</p>
              ) : (
                matchData.candidates.map((c: any, idx: number) => (
                  <Card key={c.crew_id} className={cn("transition-colors", idx === 0 && "border-success/30 bg-success/5")}>
                    <CardContent className="py-3 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground w-5">#{idx + 1}</span>
                          <Link href={`/crew/${c.crew_id}`} className="font-medium text-sm hover:underline">
                            {c.first_name} {c.last_name}
                          </Link>
                          <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                          {c.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-warning">
                              <Star className="h-3 w-3 fill-warning" />{c.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{c.country} -- {c.department_preference || "No dept"} -- Available: {c.availability_start_date || "Not set"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={c.match_score} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-10 text-right">{c.match_score}%</span>
                        </div>
                        {c.skill_matches.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {c.skill_matches.map((sm: any, i: number) => (
                              <Badge key={i} variant="outline" className={cn("text-[10px] gap-0.5",
                                sm.met ? "border-success/30 text-success" : "border-destructive/30 text-destructive"
                              )}>
                                {sm.met ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                {sm.skill}: {sm.has} / {sm.required}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => assignCrew(matchPositionId, c.crew_id)} className="shrink-0 gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> Assign
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
