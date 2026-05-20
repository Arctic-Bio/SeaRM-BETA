"use client"

import { use, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  VOYAGE_STATUSES, VOYAGE_STATUS_LABELS, VOYAGE_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_COLORS,
  COMMON_POSITIONS, DEPARTMENTS,
  type VoyageStatus, type AssignmentStatus,
  type Voyage, type CrewPosition, type CrewAssignment,
} from "@/lib/db"
import { ActivityTimeline } from "@/components/activity-timeline"
import {
  ArrowLeft, Anchor, MapPin, Calendar, Users, Loader2, Plus,
  Ship, UserCheck, UserX,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function VoyageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/voyages/${id}`, fetcher)
  const { data: activitiesData, mutate: mutateActivities } = useSWR(`/api/activities?voyageId=${id}`, fetcher)
  const [posOpen, setPosOpen] = useState(false)
  const [posForm, setPosForm] = useState({ position_name: "", department: "" })
  const [saving, setSaving] = useState(false)

  const voyage: Voyage | null = data?.data || null
  const positions: CrewPosition[] = data?.positions || []
  const assignments: CrewAssignment[] = data?.assignments || []

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/voyages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Voyage status updated")
      mutate()
    } catch { toast.error("Failed to update") }
  }

  const handleAddPosition = async () => {
    if (!posForm.position_name) { toast.error("Position name required"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/voyages/${id}/positions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(posForm) })
      if (!res.ok) throw new Error("Failed")
      toast.success("Position added")
      mutate(); mutateActivities()
      setPosOpen(false)
      setPosForm({ position_name: "", department: "" })
    } catch { toast.error("Failed to add position") }
    finally { setSaving(false) }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!voyage) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><p className="text-muted-foreground">Voyage not found</p><Button variant="outline" asChild><Link href="/voyages">Back to Voyages</Link></Button></div>

  const openPositions = positions.filter((p) => p.status !== "filled" && p.status !== "cancelled")
  const filledPositions = positions.filter((p) => p.status === "filled")

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild><Link href="/voyages"><ArrowLeft className="mr-1 h-4 w-4" />Voyages</Link></Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{voyage.voyage_name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {voyage.ship_name && <span className="flex items-center gap-1"><Anchor className="h-3 w-3" />{voyage.ship_name}</span>}
              {voyage.departure_port && <><span>&middot;</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{voyage.departure_port}</span></>}
              {voyage.departure_date && <><span>&middot;</span><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(voyage.departure_date).toLocaleDateString()}</span></>}
            </div>
          </div>
        </div>
        <Select value={voyage.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{VOYAGE_STATUSES.map((s) => (<SelectItem key={s} value={s}>{VOYAGE_STATUS_LABELS[s]}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-primary" /><div><p className="text-lg font-bold">{positions.length}</p><p className="text-xs text-muted-foreground">Total Positions</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><UserCheck className="h-5 w-5 text-success" /><div><p className="text-lg font-bold">{filledPositions.length}</p><p className="text-xs text-muted-foreground">Filled</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><UserX className="h-5 w-5 text-warning" /><div><p className="text-lg font-bold">{openPositions.length}</p><p className="text-xs text-muted-foreground">Open</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Ship className="h-5 w-5 text-chart-1" /><div><p className="text-lg font-bold">{assignments.filter((a) => a.status === "on_board" || a.status === "active").length}</p><p className="text-xs text-muted-foreground">On Board</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="positions" className="flex flex-col gap-4">
        <TabsList className="w-auto self-start">
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="crew">Crew ({assignments.length})</TabsTrigger>
          <TabsTrigger value="details">Mission Details</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Dialog open={posOpen} onOpenChange={setPosOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-3.5 w-3.5" />Add Position</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Position</DialogTitle><DialogDescription>Open a new crew position for this voyage.</DialogDescription></DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div><Label>Position *</Label>
                      <Select value={posForm.position_name} onValueChange={(v) => setPosForm({ ...posForm, position_name: v })}>
                        <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                        <SelectContent>{COMMON_POSITIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Department</Label>
                      <Select value={posForm.department} onValueChange={(v) => setPosForm({ ...posForm, department: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">No department</SelectItem>{DEPARTMENTS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setPosOpen(false)}>Cancel</Button><Button onClick={handleAddPosition} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {positions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No positions defined. Add positions to start crewing.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {positions.map((pos) => (
                  <Card key={pos.id} className={cn(pos.status === "filled" ? "border-success/20" : "")}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pos.position_name}</p>
                        <p className="text-xs text-muted-foreground">{pos.department || "No department"}</p>
                        {pos.assigned_crew_name && <p className="mt-1 text-xs text-success">{pos.assigned_crew_name}</p>}
                      </div>
                      <Badge variant="outline" className={cn("text-xs", pos.status === "filled" ? "bg-success/15 text-success border-success/25" : pos.status === "open" ? "bg-warning/15 text-warning border-warning/25" : "")}>
                        {pos.status === "filled" ? "Filled" : pos.status === "open" ? "Open" : pos.status.replace("_", " ")}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="crew">
          {assignments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No crew assigned to this voyage yet.</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(a as { crew_name?: string }).crew_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                      </div>
                      <div>
                        <Link href={`/crew/${a.crew_id}`} className="text-sm font-medium text-foreground hover:text-primary">{(a as { crew_name?: string }).crew_name}</Link>
                        <p className="text-xs text-muted-foreground">{a.role}{a.department ? ` - ${a.department}` : ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", ASSIGNMENT_STATUS_COLORS[a.status as AssignmentStatus])}>
                      {ASSIGNMENT_STATUS_LABELS[a.status as AssignmentStatus]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Departure Port", value: voyage.departure_port },
                  { label: "Destination Port", value: voyage.destination_port },
                  { label: "Departure Date", value: voyage.departure_date ? new Date(voyage.departure_date).toLocaleDateString() : "" },
                  { label: "Return Date", value: voyage.return_date ? new Date(voyage.return_date).toLocaleDateString() : "" },
                  { label: "Mission Type", value: voyage.mission_type },
                  { label: "Ship", value: voyage.ship_name || "" },
                ].filter((f) => f.value).map((f) => (
                  <div key={f.label}><p className="text-xs text-muted-foreground">{f.label}</p><p className="text-sm font-medium text-foreground">{f.value}</p></div>
                ))}
              </div>
              {voyage.mission_objectives && (
                <div className="mt-4 pt-4 border-t"><p className="text-xs text-muted-foreground mb-1">Mission Objectives</p><p className="text-sm text-foreground whitespace-pre-wrap">{voyage.mission_objectives}</p></div>
              )}
              {voyage.notes && (
                <div className="mt-4 pt-4 border-t"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground whitespace-pre-wrap">{voyage.notes}</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimeline activities={activitiesData?.data || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
