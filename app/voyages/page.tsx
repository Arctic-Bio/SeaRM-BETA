"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  VOYAGE_STATUS_LABELS, VOYAGE_STATUS_COLORS,
  type Ship, type Voyage, type VoyageStatus,
} from "@/lib/db"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus, Navigation, Loader2, MapPin, Calendar, Users, Ship as ShipIcon, Anchor, Trash2,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function VoyagesPage() {
  const { data, isLoading, mutate } = useSWR("/api/voyages", fetcher)
  const { data: shipsData } = useSWR("/api/ships", fetcher)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    ship_id: "", voyage_name: "", description: "",
    departure_port: "", destination_port: "",
    departure_date: "", return_date: "",
    mission_type: "", mission_objectives: "", notes: "",
  })

  const voyages: Voyage[] = data?.data || []
  const ships: Ship[] = shipsData?.data || []

  const handleCreate = async () => {
    if (!form.voyage_name) { toast.error("Voyage name is required"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/voyages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ship_id: form.ship_id || null }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Voyage created")
      mutate()
      setOpen(false)
      setForm({ ship_id: "", voyage_name: "", description: "", departure_port: "", destination_port: "", departure_date: "", return_date: "", mission_type: "", mission_objectives: "", notes: "" })
    } catch { toast.error("Failed to create voyage") }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/voyages/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast.success("Campaign deleted")
      mutate()
    } catch { toast.error("Failed to delete campaign") }
    finally { setDeleteId(null) }
  }

  const active = voyages.filter((v) => v.status === "active")
  const planned = voyages.filter((v) => ["planned", "crewing", "ready"].includes(v.status))
  const completed = voyages.filter((v) => ["completed", "cancelled"].includes(v.status))

  const VoyageCard = ({ voyage }: { voyage: Voyage }) => (
    <Card className="transition-colors hover:border-primary/30 h-full group relative">
      <Link href={`/voyages/${voyage.id}`} className="block">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-foreground">{voyage.voyage_name}</p>
            <Badge variant="outline" className={cn("text-xs shrink-0 ml-2", VOYAGE_STATUS_COLORS[voyage.status as VoyageStatus])}>
              {VOYAGE_STATUS_LABELS[voyage.status as VoyageStatus]}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            {voyage.ship_name && <span className="flex items-center gap-1.5"><Anchor className="h-3 w-3" />{voyage.ship_name}</span>}
            {voyage.departure_port && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{voyage.departure_port}{voyage.destination_port ? ` to ${voyage.destination_port}` : ""}</span>}
            {voyage.departure_date && <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{new Date(voyage.departure_date).toLocaleDateString()}{voyage.return_date ? ` - ${new Date(voyage.return_date).toLocaleDateString()}` : ""}</span>}
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{voyage.filled_positions || 0}/{voyage.positions_count || 0} positions filled</span>
          </div>
        </CardContent>
      </Link>
      <Button
        variant="ghost" size="icon"
        className="absolute top-2 right-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(voyage.id) }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </Card>
  )

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaigns & Voyages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan expeditions, assign crew, and track missions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Voyage</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Voyage</DialogTitle>
              <DialogDescription>Define the mission details. Assign crew after creation.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2"><Label>Voyage Name *</Label><Input value={form.voyage_name} onChange={(e) => setForm({ ...form, voyage_name: e.target.value })} placeholder="Operation Southern Ocean 2025" /></div>
              <div className="col-span-2"><Label>Ship</Label>
                <Select value={form.ship_id} onValueChange={(v) => setForm({ ...form, ship_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select a ship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No ship assigned</SelectItem>
                    {ships.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Departure Port</Label><Input value={form.departure_port} onChange={(e) => setForm({ ...form, departure_port: e.target.value })} /></div>
              <div><Label>Destination Port</Label><Input value={form.destination_port} onChange={(e) => setForm({ ...form, destination_port: e.target.value })} /></div>
              <div><Label>Departure Date</Label><Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} /></div>
              <div><Label>Return Date</Label><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></div>
              <div className="col-span-2"><Label>Mission Objectives</Label><Textarea value={form.mission_objectives} onChange={(e) => setForm({ ...form, mission_objectives: e.target.value })} rows={3} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Voyage</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : voyages.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16">
          <Navigation className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">No voyages yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first mission to start planning crew assignments.</p>
        </CardContent></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><ShipIcon className="h-4 w-4 text-success" />Active ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{active.map((v) => <VoyageCard key={v.id} voyage={v} />)}</div>
            </section>
          )}
          {planned.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-chart-1" />Planned & Crewing ({planned.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{planned.map((v) => <VoyageCard key={v.id} voyage={v} />)}</div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Navigation className="h-4 w-4 text-muted-foreground" />Completed ({completed.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{completed.map((v) => <VoyageCard key={v.id} voyage={v} />)}</div>
            </section>
          )}
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this campaign/voyage and all associated positions and crew assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
