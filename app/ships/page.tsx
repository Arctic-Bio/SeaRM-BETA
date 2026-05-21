"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  SHIP_TYPES, SHIP_TYPE_LABELS, SHIP_STATUS_LABELS, SHIP_STATUS_COLORS,
  SHIP_STATUSES,
  type Ship, type ShipType, type ShipStatus,
} from "@/lib/db"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Anchor, Plus, Ship as ShipIcon, Loader2, Users, MapPin, Ruler, Trash2,
  Pencil, Search, Filter,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const emptyForm = {
  name: "", type: "research" as ShipType, status: "active" as ShipStatus,
  flag: "", imo_number: "", call_sign: "", mmsi: "",
  length_m: "", beam_m: "", draft_m: "", gross_tonnage: "",
  crew_capacity: "", year_built: "", hull_material: "", engine_type: "",
  max_speed_knots: "", home_port: "", notes: "",
}

type FormState = typeof emptyForm

export default function ShipsPage() {
  const { data, isLoading, mutate } = useSWR("/api/ships", fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editingShipId, setEditingShipId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ShipStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<ShipType | "all">("all")
  const [form, setForm] = useState<FormState>({ ...emptyForm })

  const ships: (Ship & { voyage_count: number; active_crew: number })[] = data?.data || []

  // Filter ships
  const filtered = ships.filter(ship => {
    if (statusFilter !== "all" && ship.status !== statusFilter) return false
    if (typeFilter !== "all" && ship.type !== typeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        ship.name.toLowerCase().includes(q) ||
        ship.imo_number?.toLowerCase().includes(q) ||
        ship.mmsi?.toLowerCase().includes(q) ||
        ship.call_sign?.toLowerCase().includes(q) ||
        ship.flag?.toLowerCase().includes(q) ||
        ship.home_port?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const openCreate = useCallback(() => {
    setForm({ ...emptyForm })
    setEditingShipId(null)
    setDialogMode("create")
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((ship: Ship) => {
    setForm({
      name: ship.name || "",
      type: ship.type as ShipType || "research",
      status: ship.status as ShipStatus || "active",
      flag: ship.flag || "",
      imo_number: ship.imo_number || "",
      call_sign: ship.call_sign || "",
      mmsi: ship.mmsi || "",
      length_m: ship.length_m ? String(ship.length_m) : "",
      beam_m: ship.beam_m ? String(ship.beam_m) : "",
      draft_m: ship.draft_m ? String(ship.draft_m) : "",
      gross_tonnage: ship.gross_tonnage ? String(ship.gross_tonnage) : "",
      crew_capacity: ship.crew_capacity ? String(ship.crew_capacity) : "",
      year_built: ship.year_built ? String(ship.year_built) : "",
      hull_material: ship.hull_material || "",
      engine_type: ship.engine_type || "",
      max_speed_knots: ship.max_speed_knots ? String(ship.max_speed_knots) : "",
      home_port: ship.home_port || "",
      notes: ship.notes || "",
    })
    setEditingShipId(ship.id)
    setDialogMode("edit")
    setDialogOpen(true)
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/ships/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Ship deleted from fleet")
      mutate()
    } catch { toast.error("Failed to delete ship") }
    finally { setDeleteId(null) }
  }

  const handleSave = async () => {
    if (!form.name) { toast.error("Ship name is required"); return }
    setSaving(true)

    const payload = {
      ...form,
      length_m: parseFloat(form.length_m) || 0,
      beam_m: parseFloat(form.beam_m) || 0,
      draft_m: parseFloat(form.draft_m) || 0,
      gross_tonnage: parseFloat(form.gross_tonnage) || 0,
      crew_capacity: parseInt(form.crew_capacity) || 0,
      year_built: parseInt(form.year_built) || 0,
      max_speed_knots: parseFloat(form.max_speed_knots) || 0,
    }

    try {
      if (dialogMode === "edit" && editingShipId) {
        const res = await fetch(`/api/ships/${editingShipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to update ship")
        }
        toast.success(`"${form.name}" updated successfully`)
      } else {
        const res = await fetch("/api/ships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to create ship")
        }
        toast.success(`"${form.name}" added to fleet`)
      }
      mutate()
      setDialogOpen(false)
    } catch (e: any) {
      toast.error(e.message || "Failed to save ship")
    } finally {
      setSaving(false)
    }
  }

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fleet Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ships.length} vessel{ships.length !== 1 ? "s" : ""} in fleet
            {filtered.length !== ships.length && ` (${filtered.length} shown)`}
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Ship</Button>
      </div>

      {/* Filters */}
      {ships.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, IMO, MMSI, flag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ShipStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SHIP_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{SHIP_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as ShipType | "all")}>
            <SelectTrigger className="w-[160px]">
              <ShipIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SHIP_TYPES.map(t => (
                <SelectItem key={t} value={t}>{SHIP_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Ships grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : ships.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShipIcon className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-foreground">No ships in fleet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your first vessel to get started.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-foreground">No ships match your filters</p>
            <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filter criteria.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all") }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ship) => (
            <Card key={ship.id} className="h-full transition-colors hover:border-primary/30 group relative">
              <Link href={`/ships/${ship.id}`} className="block">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Anchor className="h-4 w-4 text-primary shrink-0" />
                      <CardTitle className="text-base truncate">{ship.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0 ml-2", SHIP_STATUS_COLORS[ship.status as ShipStatus])}>
                      {SHIP_STATUS_LABELS[ship.status as ShipStatus]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5"><ShipIcon className="h-3.5 w-3.5" />{SHIP_TYPE_LABELS[ship.type as ShipType]}</span>
                      {ship.flag && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{ship.flag}</span>}
                    </div>
                    {(ship.imo_number || ship.mmsi) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/70 font-mono">
                        {ship.imo_number && <span>IMO {ship.imo_number}</span>}
                        {ship.mmsi && <span>MMSI {ship.mmsi}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-muted-foreground">
                      {ship.length_m > 0 && <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" />{ship.length_m}m</span>}
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{ship.active_crew}/{ship.crew_capacity || "?"} crew</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 pt-2 border-t text-xs text-muted-foreground">
                      <span>{ship.voyage_count} voyage{Number(ship.voyage_count) !== 1 ? "s" : ""}</span>
                      {ship.home_port && <span className="text-muted-foreground/50">&middot; {ship.home_port}</span>}
                    </div>
                  </div>
                </CardContent>
              </Link>
              {/* Action buttons on hover */}
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(ship) }}
                  title="Edit ship"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(ship.id) }}
                  title="Delete ship"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit Ship" : "Add New Ship"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update the vessel details below. Changes are saved immediately."
                : "Enter vessel details. You can update these later."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Identity */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Identity</p>
            </div>
            <div className="col-span-2">
              <Label>Ship Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="M/Y John Paul DeJoria" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => updateField("type", v as ShipType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIP_TYPES.map(t => (<SelectItem key={t} value={t}>{SHIP_TYPE_LABELS[t]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => updateField("status", v as ShipStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIP_STATUSES.map(s => (<SelectItem key={s} value={s}>{SHIP_STATUS_LABELS[s]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Flag</Label><Input value={form.flag} onChange={e => updateField("flag", e.target.value)} placeholder="Palau" /></div>
            <div><Label>Home Port</Label><Input value={form.home_port} onChange={e => updateField("home_port", e.target.value)} placeholder="Koror, Palau" /></div>

            {/* Registration */}
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Registration &amp; Identification</p>
            </div>
            <div><Label>IMO Number</Label><Input value={form.imo_number} onChange={e => updateField("imo_number", e.target.value)} placeholder="9876543" /></div>
            <div><Label>Call Sign</Label><Input value={form.call_sign} onChange={e => updateField("call_sign", e.target.value)} placeholder="T8A2345" /></div>
            <div><Label>MMSI</Label><Input value={form.mmsi} onChange={e => updateField("mmsi", e.target.value)} placeholder="511123456" /></div>
            <div><Label>Year Built</Label><Input type="number" value={form.year_built} onChange={e => updateField("year_built", e.target.value)} placeholder="2010" /></div>

            {/* Specifications */}
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Specifications</p>
            </div>
            <div><Label>Length (m)</Label><Input type="number" step="0.1" value={form.length_m} onChange={e => updateField("length_m", e.target.value)} placeholder="56.4" /></div>
            <div><Label>Beam (m)</Label><Input type="number" step="0.1" value={form.beam_m} onChange={e => updateField("beam_m", e.target.value)} placeholder="10.5" /></div>
            <div><Label>Draft (m)</Label><Input type="number" step="0.1" value={form.draft_m} onChange={e => updateField("draft_m", e.target.value)} placeholder="3.2" /></div>
            <div><Label>Gross Tonnage</Label><Input type="number" value={form.gross_tonnage} onChange={e => updateField("gross_tonnage", e.target.value)} placeholder="850" /></div>
            <div><Label>Hull Material</Label><Input value={form.hull_material} onChange={e => updateField("hull_material", e.target.value)} placeholder="Steel" /></div>
            <div><Label>Engine Type</Label><Input value={form.engine_type} onChange={e => updateField("engine_type", e.target.value)} placeholder="Twin Diesel" /></div>
            <div><Label>Max Speed (kn)</Label><Input type="number" step="0.1" value={form.max_speed_knots} onChange={e => updateField("max_speed_knots", e.target.value)} placeholder="14.5" /></div>
            <div><Label>Crew Capacity</Label><Input type="number" value={form.crew_capacity} onChange={e => updateField("crew_capacity", e.target.value)} placeholder="24" /></div>

            {/* Notes */}
            <div className="col-span-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</p>
            </div>
            <div className="col-span-2"><Textarea value={form.notes} onChange={e => updateField("notes", e.target.value)} rows={3} placeholder="Additional information about the vessel..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "edit" ? "Save Changes" : "Add Ship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ship</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this ship from the fleet along with all its maintenance logs and supply records.
              Voyages referencing this ship will have their ship unlinked. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Ship
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
