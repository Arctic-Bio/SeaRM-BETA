"use client"

import { useState } from "react"
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
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  SHIP_TYPES, SHIP_TYPE_LABELS, SHIP_STATUS_LABELS, SHIP_STATUS_COLORS,
  type Ship, type ShipType, type ShipStatus,
} from "@/lib/db"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Anchor, Plus, Ship as ShipIcon, Loader2, Users, MapPin, Ruler, Trash2,
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ShipsPage() {
  const { data, isLoading, mutate } = useSWR("/api/ships", fetcher)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", type: "research" as ShipType, flag: "", imo_number: "",
    call_sign: "", mmsi: "", length_m: "", beam_m: "", draft_m: "",
    gross_tonnage: "", crew_capacity: "", year_built: "",
    hull_material: "", engine_type: "", max_speed_knots: "", home_port: "", notes: "",
  })

  const ships: (Ship & { voyage_count: number; active_crew: number })[] = data?.data || []

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

  const handleCreate = async () => {
    if (!form.name) { toast.error("Ship name is required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/ships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          length_m: parseFloat(form.length_m) || 0,
          beam_m: parseFloat(form.beam_m) || 0,
          draft_m: parseFloat(form.draft_m) || 0,
          gross_tonnage: parseFloat(form.gross_tonnage) || 0,
          crew_capacity: parseInt(form.crew_capacity) || 0,
          year_built: parseInt(form.year_built) || 0,
          max_speed_knots: parseFloat(form.max_speed_knots) || 0,
        }),
      })
      if (!res.ok) throw new Error("Failed to create ship")
      toast.success("Ship added to fleet")
      mutate()
      setOpen(false)
      setForm({
        name: "", type: "research", flag: "", imo_number: "",
        call_sign: "", mmsi: "", length_m: "", beam_m: "", draft_m: "",
        gross_tonnage: "", crew_capacity: "", year_built: "",
        hull_material: "", engine_type: "", max_speed_knots: "", home_port: "", notes: "",
      })
    } catch { toast.error("Failed to create ship") }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fleet Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage vessels, view capacity, and track voyages.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Ship</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Ship</DialogTitle>
              <DialogDescription>Enter vessel details. You can update these later.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2"><Label>Ship Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="M/Y John Paul DeJoria" /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ShipType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIP_TYPES.map((t) => (<SelectItem key={t} value={t}>{SHIP_TYPE_LABELS[t]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Flag</Label><Input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} placeholder="Palau" /></div>
              <div><Label>IMO Number</Label><Input value={form.imo_number} onChange={(e) => setForm({ ...form, imo_number: e.target.value })} /></div>
              <div><Label>Call Sign</Label><Input value={form.call_sign} onChange={(e) => setForm({ ...form, call_sign: e.target.value })} /></div>
              <div><Label>MMSI</Label><Input value={form.mmsi} onChange={(e) => setForm({ ...form, mmsi: e.target.value })} /></div>
              <div><Label>Home Port</Label><Input value={form.home_port} onChange={(e) => setForm({ ...form, home_port: e.target.value })} /></div>
              <div><Label>Length (m)</Label><Input type="number" value={form.length_m} onChange={(e) => setForm({ ...form, length_m: e.target.value })} /></div>
              <div><Label>Beam (m)</Label><Input type="number" value={form.beam_m} onChange={(e) => setForm({ ...form, beam_m: e.target.value })} /></div>
              <div><Label>Draft (m)</Label><Input type="number" value={form.draft_m} onChange={(e) => setForm({ ...form, draft_m: e.target.value })} /></div>
              <div><Label>Gross Tonnage</Label><Input type="number" value={form.gross_tonnage} onChange={(e) => setForm({ ...form, gross_tonnage: e.target.value })} /></div>
              <div><Label>Crew Capacity</Label><Input type="number" value={form.crew_capacity} onChange={(e) => setForm({ ...form, crew_capacity: e.target.value })} /></div>
              <div><Label>Year Built</Label><Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} /></div>
              <div><Label>Hull Material</Label><Input value={form.hull_material} onChange={(e) => setForm({ ...form, hull_material: e.target.value })} placeholder="Steel" /></div>
              <div><Label>Engine Type</Label><Input value={form.engine_type} onChange={(e) => setForm({ ...form, engine_type: e.target.value })} /></div>
              <div><Label>Max Speed (kn)</Label><Input type="number" value={form.max_speed_knots} onChange={(e) => setForm({ ...form, max_speed_knots: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Ship
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ships.map((ship) => (
            <Card key={ship.id} className="h-full transition-colors hover:border-primary/30 group relative">
              <Link href={`/ships/${ship.id}`} className="block">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Anchor className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{ship.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", SHIP_STATUS_COLORS[ship.status as ShipStatus])}>
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
                    <div className="flex items-center justify-between text-muted-foreground">
                      {ship.length_m > 0 && <span className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" />{ship.length_m}m</span>}
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{ship.active_crew}/{ship.crew_capacity || "?"} crew</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 pt-2 border-t text-xs text-muted-foreground">
                      <span>{ship.voyage_count} voyage{Number(ship.voyage_count) !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </CardContent>
              </Link>
              <Button
                variant="ghost" size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(ship.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ship</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this ship from the fleet along with all its maintenance logs and supply records. Voyages referencing this ship will have their ship unlinked. This action cannot be undone.
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
