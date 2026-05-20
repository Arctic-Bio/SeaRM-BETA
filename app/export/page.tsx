"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Download, FileSpreadsheet, FileJson, Users, Ship, Navigation,
  Briefcase, CheckSquare, Clock, Wrench, Loader2, Anchor,
} from "lucide-react"

const EXPORT_TYPES = [
  { key: "crew", label: "Crew Applications", icon: Users, description: "All crew applicant data including skills, qualifications, and contact information" },
  { key: "ships", label: "Ships / Fleet", icon: Ship, description: "Vessel specifications, status, and registration details" },
  { key: "voyages", label: "Campaigns & Voyages", icon: Navigation, description: "All voyages with ship assignments, ports, dates, and mission details" },
  { key: "positions", label: "Crew Positions", icon: Briefcase, description: "Open and filled positions across all voyages with assignment details" },
  { key: "tasks", label: "Tasks", icon: CheckSquare, description: "All tasks with assignments, priorities, and completion status" },
  { key: "assignments", label: "Crew Assignments", icon: Anchor, description: "Crew-to-voyage assignments with roles, status, and review data" },
  { key: "sea_time", label: "Sea Time Records", icon: Clock, description: "Crew sea time logs with embarkation, disembarkation, and days at sea" },
  { key: "maintenance", label: "Ship Maintenance", icon: Wrench, description: "Maintenance logs with categories, costs, and completion status" },
] as const

export default function ExportPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [format, setFormat] = useState<"csv" | "json">("csv")

  const handleExport = async (type: string) => {
    setLoading(type)
    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = format === "json" ? "json" : "csv"
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${type} data exported as ${format.toUpperCase()}`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const exportAll = async () => {
    setLoading("all")
    try {
      for (const t of EXPORT_TYPES) {
        const res = await fetch(`/api/export?type=${t.key}&format=${format}`)
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const ext = format === "json" ? "json" : "csv"
        a.download = `${t.key}_${new Date().toISOString().slice(0, 10)}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      toast.success(`All data exported as ${format.toUpperCase()}`)
    } catch {
      toast.error("Export failed")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Export Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download your CRM data as CSV or JSON files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <span className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</span>
              </SelectItem>
              <SelectItem value="json">
                <span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5" /> JSON</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportAll} disabled={!!loading} className="gap-2">
            {loading === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export All
          </Button>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_TYPES.map((t) => {
          const Icon = t.icon
          const isLoading = loading === t.key
          return (
            <Card key={t.key} className="group transition-colors hover:border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm">{t.label}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{format}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-3">{t.description}</CardDescription>
                <Button
                  variant="outline" size="sm" className="w-full gap-2"
                  onClick={() => handleExport(t.key)}
                  disabled={!!loading}
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download {format.toUpperCase()}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
