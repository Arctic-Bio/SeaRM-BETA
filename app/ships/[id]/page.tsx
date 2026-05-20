"use client"

import { use, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  SHIP_STATUSES, SHIP_STATUS_LABELS, SHIP_STATUS_COLORS,
  VOYAGE_STATUS_LABELS, VOYAGE_STATUS_COLORS,
  MAINTENANCE_CATEGORIES, MAINTENANCE_STATUSES, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  SUPPLY_CATEGORIES, TASK_PRIORITIES,
  type Ship, type ShipStatus, type Voyage, type VoyageStatus, type Activity,
} from "@/lib/db"
import {
  ArrowLeft, Anchor, MapPin, Ruler, Users, Loader2, Plus,
  Ship as ShipIcon, Calendar, Navigation, Wrench, Package, Trash2,
  AlertTriangle, DollarSign, UserCheck, Pencil,
} from "lucide-react"
import { ActivityTimeline } from "@/components/activity-timeline"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ShipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/ships/${id}`, fetcher)
  const { data: voyagesData } = useSWR(`/api/voyages?shipId=${id}`, fetcher)
  const { data: activitiesData } = useSWR(`/api/activities?shipId=${id}`, fetcher)
  const { data: maintenanceData, mutate: mutateMaintenance } = useSWR(`/api/ships/${id}/maintenance`, fetcher)
  const { data: suppliesData, mutate: mutateSupplies } = useSWR(`/api/ships/${id}/supplies`, fetcher)
  const { data: crewData } = useSWR(`/api/ships/${id}/crew`, fetcher)

  const [maintOpen, setMaintOpen] = useState(false)
  const [supplyOpen, setSupplyOpen] = useState(false)
  const [mForm, setMForm] = useState({ title: "", category: "general", status: "scheduled", priority: "medium", description: "", scheduled_date: "", cost: "", performed_by: "", notes: "" })
  const [sForm, setSForm] = useState({ item_name: "", category: "general", quantity: "", unit: "units", min_quantity: "", last_restocked: "", notes: "" })

  const ship: Ship | null = data?.data || null
  const voyages: Voyage[] = voyagesData?.data || []
  const activities: Activity[] = activitiesData?.data || []
  const maintenance = Array.isArray(maintenanceData) ? maintenanceData : []
  const supplies = Array.isArray(suppliesData) ? suppliesData : []
  const onBoard = crewData?.onBoard || []
  const assignedCrew = crewData?.assigned || []

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/ships/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Ship status updated")
      mutate()
    } catch { toast.error("Failed to update status") }
  }

  const addMaintenance = async () => {
    if (!mForm.title) { toast.error("Title required"); return }
    await fetch(`/api/ships/${id}/maintenance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...mForm, cost: parseFloat(mForm.cost) || 0 }),
    })
    toast.success("Maintenance record added")
    setMaintOpen(false)
    setMForm({ title: "", category: "general", status: "scheduled", priority: "medium", description: "", scheduled_date: "", cost: "", performed_by: "", notes: "" })
    mutateMaintenance()
  }

  const updateMaintStatus = async (mid: string, status: string) => {
    await fetch(`/api/ships/${id}/maintenance`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mid, status, completed_date: status === "completed" ? new Date().toISOString().slice(0, 10) : null }),
    })
    mutateMaintenance()
  }

  const deleteMaintenance = async (mid: string) => {
    await fetch(`/api/ships/${id}/maintenance?mid=${mid}`, { method: "DELETE" })
    toast.success("Maintenance record deleted")
    mutateMaintenance()
  }

  const addSupply = async () => {
    if (!sForm.item_name) { toast.error("Item name required"); return }
    await fetch(`/api/ships/${id}/supplies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sForm, quantity: parseFloat(sForm.quantity) || 0, min_quantity: parseFloat(sForm.min_quantity) || 0 }),
    })
    toast.success("Supply item added")
    setSupplyOpen(false)
    setSForm({ item_name: "", category: "general", quantity: "", unit: "units", min_quantity: "", last_restocked: "", notes: "" })
    mutateSupplies()
  }

  const deleteSupply = async (sid: string) => {
    await fetch(`/api/ships/${id}/supplies?sid=${sid}`, { method: "DELETE" })
    toast.success("Supply removed")
    mutateSupplies()
  }

  // Edit maintenance
  const [editMaintOpen, setEditMaintOpen] = useState(false)
  const [editMaintForm, setEditMaintForm] = useState({ id: "", title: "", category: "general", status: "scheduled", priority: "medium", description: "", scheduled_date: "", cost: "", performed_by: "", notes: "" })

  const openEditMaint = (m: any) => {
    setEditMaintForm({
      id: m.id, title: m.title || "", category: m.category || "general",
      status: m.status || "scheduled", priority: m.priority || "medium",
      description: m.description || "", scheduled_date: m.scheduled_date ? m.scheduled_date.slice(0, 10) : "",
      cost: m.cost > 0 ? String(m.cost) : "", performed_by: m.performed_by || "", notes: m.notes || "",
    })
    setEditMaintOpen(true)
  }

  const saveEditMaint = async () => {
    const res = await fetch(`/api/ships/${id}/maintenance`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editMaintForm, cost: parseFloat(editMaintForm.cost) || 0 }),
    })
    if (res.ok) { toast.success("Maintenance record updated"); setEditMaintOpen(false); mutateMaintenance() }
    else toast.error("Failed to update")
  }

  // Edit supply
  const [editSupplyOpen, setEditSupplyOpen] = useState(false)
  const [editSupplyForm, setEditSupplyForm] = useState({ id: "", item_name: "", category: "general", quantity: "", unit: "units", min_quantity: "", last_restocked: "", notes: "" })

  const openEditSupply = (s: any) => {
    setEditSupplyForm({
      id: s.id, item_name: s.item_name || "", category: s.category || "general",
      quantity: String(s.quantity ?? ""), unit: s.unit || "units",
      min_quantity: String(s.min_quantity ?? ""), last_restocked: s.last_restocked ? s.last_restocked.slice(0, 10) : "",
      notes: s.notes || "",
    })
    setEditSupplyOpen(true)
  }

  const saveEditSupply = async () => {
    const res = await fetch(`/api/ships/${id}/supplies`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editSupplyForm, quantity: parseFloat(editSupplyForm.quantity) || 0, min_quantity: parseFloat(editSupplyForm.min_quantity) || 0 }),
    })
    if (res.ok) { toast.success("Supply item updated"); setEditSupplyOpen(false); mutateSupplies() }
    else toast.error("Failed to update")
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  if (!ship) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><p className="text-muted-foreground">Ship not found</p><Button variant="outline" asChild><Link href="/ships">Back to Fleet</Link></Button></div>

  const specs = [
    { label: "IMO", value: ship.imo_number },
    { label: "Call Sign", value: ship.call_sign },
    { label: "MMSI", value: ship.mmsi },
    { label: "Flag", value: ship.flag },
    { label: "Home Port", value: ship.home_port },
    { label: "Year Built", value: ship.year_built > 0 ? String(ship.year_built) : "" },
    { label: "Length", value: ship.length_m > 0 ? `${ship.length_m} m` : "" },
    { label: "Beam", value: ship.beam_m > 0 ? `${ship.beam_m} m` : "" },
    { label: "Draft", value: ship.draft_m > 0 ? `${ship.draft_m} m` : "" },
    { label: "Gross Tonnage", value: ship.gross_tonnage > 0 ? String(ship.gross_tonnage) : "" },
    { label: "Hull Material", value: ship.hull_material },
    { label: "Engine", value: ship.engine_type },
    { label: "Max Speed", value: ship.max_speed_knots > 0 ? `${ship.max_speed_knots} kn` : "" },
    { label: "Crew Capacity", value: ship.crew_capacity > 0 ? String(ship.crew_capacity) : "" },
  ].filter((s) => s.value)

  const pendingMaint = maintenance.filter((m: any) => m.status === "scheduled" || m.status === "in_progress" || m.status === "overdue")
  const lowSupplies = supplies.filter((s: any) => s.min_quantity > 0 && s.quantity <= s.min_quantity)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild><Link href="/ships"><ArrowLeft className="mr-1 h-4 w-4" />Fleet</Link></Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Anchor className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{ship.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn("text-xs", SHIP_STATUS_COLORS[ship.status as ShipStatus])}>
                  {SHIP_STATUS_LABELS[ship.status as ShipStatus]}
                </Badge>
                {pendingMaint.length > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-warning/30 text-warning"><Wrench className="h-3 w-3" />{pendingMaint.length} pending</Badge>
                )}
                {lowSupplies.length > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive"><AlertTriangle className="h-3 w-3" />{lowSupplies.length} low</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Select value={ship.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{SHIP_STATUSES.map((s) => (<SelectItem key={s} value={s}>{SHIP_STATUS_LABELS[s]}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-primary" /><div><p className="text-lg font-bold">{onBoard.length}</p><p className="text-xs text-muted-foreground">On Board</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><UserCheck className="h-5 w-5 text-success" /><div><p className="text-lg font-bold">{assignedCrew.length}</p><p className="text-xs text-muted-foreground">Assigned</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Navigation className="h-5 w-5 text-chart-1" /><div><p className="text-lg font-bold">{voyages.length}</p><p className="text-xs text-muted-foreground">Voyages</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Wrench className="h-5 w-5 text-warning" /><div><p className="text-lg font-bold">{pendingMaint.length}</p><p className="text-xs text-muted-foreground">Pending Maint.</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Package className="h-5 w-5 text-chart-4" /><div><p className="text-lg font-bold">{supplies.length}</p><p className="text-xs text-muted-foreground">Supplies Tracked</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="specs" className="flex flex-col gap-4">
        <TabsList className="w-auto self-start">
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="crew">Crew ({onBoard.length} on board)</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({maintenance.length})</TabsTrigger>
          <TabsTrigger value="supplies">Supplies ({supplies.length})</TabsTrigger>
          <TabsTrigger value="voyages">Voyages ({voyages.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Specs Tab */}
        <TabsContent value="specs">
          <Card>
            <CardHeader><CardTitle className="text-sm">Vessel Particulars</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {specs.map((s) => (
                  <div key={s.label}><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-sm font-medium text-foreground">{s.value}</p></div>
                ))}
              </div>
              {ship.notes && (
                <div className="mt-4 pt-4 border-t"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground whitespace-pre-wrap">{ship.notes}</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crew Tab */}
        <TabsContent value="crew">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Currently On Board</CardTitle>
                <CardDescription>{onBoard.length === 0 ? "No crew currently checked in" : `${onBoard.length} crew member${onBoard.length !== 1 ? "s" : ""} on board`}</CardDescription>
              </CardHeader>
              {onBoard.length > 0 && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Department</TableHead>
                      <TableHead className="text-xs">Checked In</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {onBoard.map((c: any) => (
                        <TableRow key={c.crew_id}>
                          <TableCell><Link href={`/crew/${c.crew_id}`} className="text-sm font-medium hover:underline">{c.first_name} {c.last_name}</Link></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.department_preference || "-"}</TableCell>
                          <TableCell className="text-xs">{new Date(c.checked_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.location || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Assigned Crew (Active Voyages)</CardTitle>
                <CardDescription>{assignedCrew.length === 0 ? "No crew assigned" : `${assignedCrew.length} crew assigned across active voyages`}</CardDescription>
              </CardHeader>
              {assignedCrew.length > 0 && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Department</TableHead>
                      <TableHead className="text-xs">Voyage</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {assignedCrew.map((c: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell><Link href={`/crew/${c.crew_id}`} className="text-sm font-medium hover:underline">{c.first_name} {c.last_name}</Link></TableCell>
                          <TableCell className="text-sm">{c.role || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.department || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.voyage_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.assignment_status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Maintenance Log</CardTitle>
                <CardDescription>{pendingMaint.length} pending, {maintenance.filter((m: any) => m.status === "completed").length} completed</CardDescription>
              </div>
              <Button size="sm" onClick={() => setMaintOpen(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Record</Button>
            </CardHeader>
            <CardContent className="p-0">
              {maintenance.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No maintenance records yet.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Scheduled</TableHead>
                    <TableHead className="text-xs">Cost</TableHead>
                    <TableHead className="text-xs">Performed By</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Updated</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {maintenance.map((m: any) => (
                      <TableRow key={m.id} className="group">
                        <TableCell>
                          <p className="text-sm font-medium">{m.title}</p>
                          {m.description && <p className="text-[11px] text-muted-foreground max-w-48 truncate">{m.description}</p>}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{m.category.replace("_", " ")}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] capitalize",
                            m.priority === "urgent" && "border-destructive/40 text-destructive",
                            m.priority === "high" && "border-chart-5/40 text-chart-5",
                          )}>{m.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={m.status} onValueChange={(v) => updateMaintStatus(m.id, v)}>
                            <SelectTrigger className="h-7 w-auto border-none bg-transparent p-0 shadow-none">
                              <Badge variant="outline" className={cn("text-[10px]", MAINTENANCE_STATUS_COLORS[m.status])}>
                                {MAINTENANCE_STATUS_LABELS[m.status] || m.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {MAINTENANCE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{MAINTENANCE_STATUS_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">{m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-sm">{m.cost > 0 ? `$${Number(m.cost).toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.performed_by || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{m.notes || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.updated_at ? new Date(m.updated_at).toLocaleDateString() : m.created_at ? new Date(m.created_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMaint(m)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMaintenance(m.id)}>
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
        </TabsContent>

        {/* Supplies Tab */}
        <TabsContent value="supplies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Supplies & Inventory</CardTitle>
                <CardDescription>
                  {supplies.length} items tracked
                  {lowSupplies.length > 0 && <span className="text-destructive font-medium"> -- {lowSupplies.length} below minimum</span>}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setSupplyOpen(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Item</Button>
            </CardHeader>
            <CardContent className="p-0">
              {supplies.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No supplies tracked yet.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Quantity</TableHead>
                    <TableHead className="text-xs">Level</TableHead>
                    <TableHead className="text-xs">Last Restocked</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Updated</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {supplies.map((s: any) => {
                      const isLow = s.min_quantity > 0 && s.quantity <= s.min_quantity
                      const pct = s.min_quantity > 0 ? Math.min(100, (s.quantity / (s.min_quantity * 2)) * 100) : 100
                      return (
                        <TableRow key={s.id} className={cn("group", isLow && "bg-destructive/5")}>
                          <TableCell>
                            <p className="text-sm font-medium">{s.item_name}</p>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{s.category.replace("_", " ")}</Badge></TableCell>
                          <TableCell>
                            <span className={cn("text-sm font-medium", isLow && "text-destructive")}>
                              {s.quantity} {s.unit}
                            </span>
                            {s.min_quantity > 0 && <span className="text-xs text-muted-foreground"> / min {s.min_quantity}</span>}
                          </TableCell>
                          <TableCell className="w-24">
                            <Progress value={pct} className={cn("h-2", isLow && "[&>div]:bg-destructive")} />
                          </TableCell>
                          <TableCell className="text-xs">{s.last_restocked ? new Date(s.last_restocked).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{s.notes || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSupply(s)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteSupply(s.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voyages Tab */}
        <TabsContent value="voyages">
          {voyages.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <Navigation className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No voyages for this ship yet</p>
              <Button asChild className="mt-3" size="sm"><Link href="/voyages">Create Voyage</Link></Button>
            </CardContent></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {voyages.map((v) => (
                <Link key={v.id} href={`/voyages/${v.id}`}>
                  <Card className="transition-colors hover:border-primary/30 cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <ShipIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.voyage_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {v.departure_port && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{v.departure_port}</span>}
                            {v.departure_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(v.departure_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{v.filled_positions || 0}/{v.positions_count || 0}</span>
                        <Badge variant="outline" className={cn("text-xs", VOYAGE_STATUS_COLORS[v.status as VoyageStatus])}>
                          {VOYAGE_STATUS_LABELS[v.status as VoyageStatus]}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityTimeline activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Add Maintenance Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>Log a maintenance task for this vessel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input value={mForm.title} onChange={(e) => setMForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Engine oil change" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={mForm.category} onValueChange={(v) => setMForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MAINTENANCE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <Select value={mForm.priority} onValueChange={(v) => setMForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Scheduled</label>
                <Input type="date" value={mForm.scheduled_date} onChange={(e) => setMForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Input value={mForm.description} onChange={(e) => setMForm((f) => ({ ...f, description: e.target.value }))} placeholder="Details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Est. Cost ($)</label>
                <Input type="number" value={mForm.cost} onChange={(e) => setMForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Performed By</label>
                <Input value={mForm.performed_by} onChange={(e) => setMForm((f) => ({ ...f, performed_by: e.target.value }))} placeholder="Name or company" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>Cancel</Button>
            <Button onClick={addMaintenance}>Add Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={editMaintOpen} onOpenChange={setEditMaintOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record</DialogTitle>
            <DialogDescription>Update this maintenance task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input value={editMaintForm.title} onChange={(e) => setEditMaintForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={editMaintForm.category} onValueChange={(v) => setEditMaintForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MAINTENANCE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <Select value={editMaintForm.priority} onValueChange={(v) => setEditMaintForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Scheduled</label>
                <Input type="date" value={editMaintForm.scheduled_date} onChange={(e) => setEditMaintForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Input value={editMaintForm.description} onChange={(e) => setEditMaintForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cost ($)</label>
                <Input type="number" value={editMaintForm.cost} onChange={(e) => setEditMaintForm((f) => ({ ...f, cost: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Performed By</label>
                <Input value={editMaintForm.performed_by} onChange={(e) => setEditMaintForm((f) => ({ ...f, performed_by: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={editMaintForm.notes} onChange={(e) => setEditMaintForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaintOpen(false)}>Cancel</Button>
            <Button onClick={saveEditMaint} disabled={!editMaintForm.title}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supply Dialog */}
      <Dialog open={editSupplyOpen} onOpenChange={setEditSupplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supply Item</DialogTitle>
            <DialogDescription>Update this supply record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Name *</label>
              <Input value={editSupplyForm.item_name} onChange={(e) => setEditSupplyForm((f) => ({ ...f, item_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={editSupplyForm.category} onValueChange={(v) => setEditSupplyForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUPPLY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit</label>
                <Input value={editSupplyForm.unit} onChange={(e) => setEditSupplyForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Quantity</label>
                <Input type="number" value={editSupplyForm.quantity} onChange={(e) => setEditSupplyForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Quantity (alert)</label>
                <Input type="number" value={editSupplyForm.min_quantity} onChange={(e) => setEditSupplyForm((f) => ({ ...f, min_quantity: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Restocked</label>
              <Input type="date" value={editSupplyForm.last_restocked} onChange={(e) => setEditSupplyForm((f) => ({ ...f, last_restocked: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={editSupplyForm.notes} onChange={(e) => setEditSupplyForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplyOpen(false)}>Cancel</Button>
            <Button onClick={saveEditSupply} disabled={!editSupplyForm.item_name}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supply Dialog */}
      <Dialog open={supplyOpen} onOpenChange={setSupplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supply Item</DialogTitle>
            <DialogDescription>Track a new supply item for this vessel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Name *</label>
              <Input value={sForm.item_name} onChange={(e) => setSForm((f) => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Diesel Fuel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={sForm.category} onValueChange={(v) => setSForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUPPLY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit</label>
                <Input value={sForm.unit} onChange={(e) => setSForm((f) => ({ ...f, unit: e.target.value }))} placeholder="liters, kg, units..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Quantity</label>
                <Input type="number" value={sForm.quantity} onChange={(e) => setSForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Quantity (alert)</label>
                <Input type="number" value={sForm.min_quantity} onChange={(e) => setSForm((f) => ({ ...f, min_quantity: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Restocked</label>
              <Input type="date" value={sForm.last_restocked} onChange={(e) => setSForm((f) => ({ ...f, last_restocked: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={sForm.notes} onChange={(e) => setSForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Storage location, supplier, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplyOpen(false)}>Cancel</Button>
            <Button onClick={addSupply}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
