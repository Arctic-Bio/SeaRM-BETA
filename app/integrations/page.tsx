"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plug, Plus, Zap, Loader2, ChevronRight, Webhook } from "lucide-react"
import { INTEGRATION_SOURCES, type IntegrationConnection } from "@/lib/integrations/types"
import { ConnectionDetail } from "@/components/integrations/connection-detail"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function IntegrationsPage() {
  const { data, mutate, isLoading } = useSWR<IntegrationConnection[]>("/api/integrations", fetcher)
  const connections = Array.isArray(data) ? data : []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newConn, setNewConn] = useState({ name: "", source: "google_forms" })

  const selected = connections.find((c) => c.id === selectedId) || connections[0] || null

  const create = async () => {
    if (!newConn.name.trim()) { toast.error("Give the connection a name"); return }
    setCreating(true)
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConn),
    })
    setCreating(false)
    if (res.ok) {
      const created = await res.json()
      toast.success("Connection created - copy your webhook URL from the Setup tab")
      setDialogOpen(false)
      setNewConn({ name: "", source: "google_forms" })
      await mutate()
      setSelectedId(created.id)
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Failed to create connection")
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pull crew profiles automatically from Google Forms and any form software via Zapier or direct webhooks. Create a connection, copy its webhook URL, and map fields.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" />New Connection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />New Integration Connection</DialogTitle>
              <DialogDescription>Create a webhook endpoint for one form or data source. You can add as many as you like.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <div>
                <Label className="text-xs">Connection Name</Label>
                <Input
                  value={newConn.name}
                  onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                  placeholder="e.g. Crew Application Form 2026"
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={newConn.source} onValueChange={(v) => setNewConn({ ...newConn, source: v })}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        <div className="flex flex-col">
                          <span>{s.label}</span>
                          <span className="text-[10px] text-muted-foreground">{s.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Webhook className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold">No connections yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {isLoading ? "Loading your connections..." : "Create your first connection to start importing crew profiles from Google Forms, Typeform, Jotform, and more."}
            </p>
            {!isLoading && (
              <Button className="mt-4 gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />Create Connection
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Connection list */}
          <div className="flex flex-col gap-1.5">
            {connections.map((c) => {
              const isActive = selected?.id === c.id
              const sourceLabel = INTEGRATION_SOURCES.find((s) => s.value === c.source)?.label || c.source
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${isActive ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-accent/5"}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${c.is_active ? "bg-primary/10" : "bg-muted"}`}>
                    <Webhook className={`h-4 w-4 ${c.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{sourceLabel}</Badge>
                      <span className="text-[10px] text-muted-foreground">{c.total_received} in</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                </button>
              )
            })}
          </div>

          {/* Detail */}
          <Card>
            <CardContent className="pt-6">
              {selected ? (
                <ConnectionDetail
                  key={selected.id}
                  connection={selected}
                  onChanged={() => mutate()}
                  onDeleted={() => { setSelectedId(null); mutate() }}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Select a connection to configure it.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
