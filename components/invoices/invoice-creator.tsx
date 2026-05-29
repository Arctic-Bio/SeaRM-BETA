"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2, Wand2, DollarSign, Ship, Clock, Calendar, Plus, X, User, Anchor,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Props {
  onCreated: () => void
}

type GenerationType = "sea_days" | "position" | "hours" | "manual"

const GEN_TYPE_INFO: Record<GenerationType, { label: string; description: string; icon: any }> = {
  sea_days: {
    label: "By Sea Days",
    description: "Auto-fill from saved sea time records and daily rate",
    icon: Ship,
  },
  position: {
    label: "By Position / Job",
    description: "Generate from assigned paid position and estimated hours",
    icon: DollarSign,
  },
  hours: {
    label: "By Logged Hours",
    description: "Pull approved hourly logs not yet invoiced",
    icon: Clock,
  },
  manual: {
    label: "Manual Invoice",
    description: "Create a custom invoice with manual line items",
    icon: Plus,
  },
}

export function InvoiceCreator({ onCreated }: Props) {
  const [genType, setGenType] = useState<GenerationType | "">("")
  const [crewId, setCrewId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [manualItems, setManualItems] = useState<{ description: string; quantity: string; unit: string; unit_price: string; category: string }[]>([])
  const [manualNotes, setManualNotes] = useState("")
  const [manualVoyageId, setManualVoyageId] = useState("")
  const [dailyRateOverride, setDailyRateOverride] = useState("")
  const [daysOverride, setDaysOverride] = useState("")

  // Load current crew (active/volunteer)
  const { data: currentCrew } = useSWR("/api/crew?status=active&limit=500", fetcher)
  const crewList = Array.isArray(currentCrew) ? currentCrew : currentCrew?.data ?? []

  // Load voyages/campaigns
  const { data: voyagesData } = useSWR("/api/voyages", fetcher)
  const voyagesList = Array.isArray(voyagesData) ? voyagesData : voyagesData?.data ?? []

  // Also load all assigned crew from positions
  const { data: positions } = useSWR("/api/positions?status=filled", fetcher)
  const assignedCrewIds = new Set((positions || []).filter((p: any) => p.assigned_crew_id).map((p: any) => p.assigned_crew_id))

  // Merge: active crew + filled position assigned crew
  const allCrewMap = new Map<string, any>()
  crewList.forEach((c: any) => allCrewMap.set(c.id, c))
  // No need to add positions here since they reference crew which are in crewList

  const handleGenerate = async () => {
    if (!crewId || !genType) {
      toast.error("Select a crew member and generation type")
      return
    }

    if (genType === "manual") {
      if (manualItems.length === 0) {
        toast.error("Add at least one line item")
        return
      }
      setGenerating(true)
      try {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crew_id: crewId,
            voyage_id: manualVoyageId && manualVoyageId !== "none" ? manualVoyageId : null,
            notes: manualNotes,
            line_items: manualItems.map((item) => ({
              description: item.description,
              category: item.category,
              quantity: Number(item.quantity),
              unit: item.unit,
              unit_price: Number(item.unit_price),
            })),
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error || "Failed to create invoice")
        } else {
          toast.success("Invoice created successfully")
          resetForm()
          onCreated()
        }
      } catch {
        toast.error("Failed to create invoice")
      } finally {
        setGenerating(false)
      }
      return
    }

    setGenerating(true)
    setPreview(null)
    try {
      const body: any = { crew_id: crewId, generation_type: genType }
      if (genType === "sea_days" && dailyRateOverride) body.daily_rate = Number(dailyRateOverride)
      if (genType === "position" && daysOverride) body.days = Number(daysOverride)

      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to generate invoice")
      } else {
        setPreview(data)
        toast.success(`Invoice ${data.invoice_number} created as draft`)
        onCreated()
      }
    } catch {
      toast.error("Failed to generate invoice")
    } finally {
      setGenerating(false)
    }
  }

  const resetForm = () => {
    setGenType("")
    setCrewId("")
    setPreview(null)
    setManualItems([])
    setManualNotes("")
    setManualVoyageId("")
    setDailyRateOverride("")
    setDaysOverride("")
  }

  const addManualItem = () => {
    setManualItems((prev) => [...prev, { description: "", quantity: "1", unit: "hours", unit_price: "0", category: "hours_worked" }])
  }

  const updateManualItem = (idx: number, field: string, value: string) => {
    setManualItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const removeManualItem = (idx: number) => {
    setManualItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const manualTotal = manualItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)

  return (
    <div className="space-y-6">
      {/* Step 1: Select Generation Type */}
      <div>
        <h3 className="text-sm font-medium mb-3">Step 1: Select Invoice Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(GEN_TYPE_INFO) as [GenerationType, typeof GEN_TYPE_INFO.sea_days][]).map(([key, info]) => {
            const Icon = info.icon
            return (
              <button
                key={key}
                onClick={() => { setGenType(key); setPreview(null) }}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:border-primary/40",
                  genType === key
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
                  genType === key ? "bg-primary/15" : "bg-muted"
                )}>
                  <Icon className={cn("h-4 w-4", genType === key ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className="text-sm font-medium">{info.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{info.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Select Crew Member */}
      {genType && (
        <div>
          <h3 className="text-sm font-medium mb-3">Step 2: Select Crew Member</h3>
          <Select value={crewId} onValueChange={setCrewId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select crew member..." />
            </SelectTrigger>
            <SelectContent>
              {crewList.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.first_name} {c.last_name}
                    {assignedCrewIds.has(c.id) && (
                      <Badge variant="outline" className="text-[9px] ml-1">Has Position</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 3: Type-specific options */}
      {genType && crewId && genType !== "manual" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generation Options</CardTitle>
            <CardDescription className="text-xs">
              {genType === "sea_days" && "Override the daily rate if needed, or leave blank to use the rate from the assigned position."}
              {genType === "position" && "Override the number of days for daily-rate positions if needed."}
              {genType === "hours" && "Approved hourly logs will be pulled automatically."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {genType === "sea_days" && (
              <div className="flex items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Daily Rate Override ($)</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={dailyRateOverride}
                    onChange={(e) => setDailyRateOverride(e.target.value)}
                    placeholder="From position"
                    className="w-40 mt-1"
                  />
                </div>
              </div>
            )}
            {genType === "position" && (
              <div className="flex items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Days Override (for daily-rate)</Label>
                  <Input
                    type="number" step="1" min="1"
                    value={daysOverride}
                    onChange={(e) => setDaysOverride(e.target.value)}
                    placeholder="30"
                    className="w-40 mt-1"
                  />
                </div>
              </div>
            )}
            {genType === "hours" && (
              <p className="text-xs text-muted-foreground">All approved, un-invoiced hourly logs will be included automatically.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Line Items */}
      {genType === "manual" && crewId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Line Items</CardTitle>
                <CardDescription className="text-xs">Add individual billing items</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addManualItem}>
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
            {/* Campaign / Voyage Selector */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Campaign / Voyage (optional)</Label>
              <Select value={manualVoyageId} onValueChange={setManualVoyageId}>
                <SelectTrigger className="w-full max-w-md mt-1">
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Campaign</SelectItem>
                  {voyagesList.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        <Anchor className="h-3.5 w-3.5 text-muted-foreground" />
                        {v.voyage_name}
                        {v.status && (
                          <Badge variant="outline" className="text-[9px] ml-1">{v.status}</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {manualItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No line items added yet. Click &quot;Add Item&quot; to begin.
              </p>
            ) : (
              <>
                {manualItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-lg border border-border p-3 bg-muted/30">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateManualItem(idx, "description", e.target.value)}
                          placeholder="Work description..."
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number" step="0.5" min="0"
                          value={item.quantity}
                          onChange={(e) => updateManualItem(idx, "quantity", e.target.value)}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Unit</Label>
                        <Select value={item.unit} onValueChange={(v) => updateManualItem(idx, "unit", v)}>
                          <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="each">Each</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Rate ($)</Label>
                        <Input
                          type="number" step="0.01" min="0"
                          value={item.unit_price}
                          onChange={(e) => updateManualItem(idx, "unit_price", e.target.value)}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 pt-3">
                      <span className="text-xs font-medium">
                        ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                      </span>
                      <button onClick={() => removeManualItem(idx)} className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{manualItems.length} item(s)</span>
                  <span className="text-sm font-semibold">Total: ${manualTotal.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Invoice notes..."
                className="mt-1 text-xs"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {genType && crewId && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generating || (genType === "manual" && manualItems.length === 0)}
            className="gap-2"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {genType === "manual" ? "Create Invoice" : "Generate Invoice"}
          </Button>
          <Button variant="outline" onClick={resetForm}>Reset</Button>
        </div>
      )}

      {/* Generated Preview */}
      {preview && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  Invoice {preview.invoice_number} Generated
                </CardTitle>
                <CardDescription className="text-xs">
                  {preview.crew_first_name} {preview.crew_last_name} -- Created as Draft
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/25">
                ${Number(preview.total_amount).toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          {preview.line_items && preview.line_items.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-1.5">
                {preview.line_items.map((li: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{li.description}</span>
                    <span className="font-medium">{li.quantity} {li.unit} x ${Number(li.unit_price).toFixed(2)} = ${Number(li.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
