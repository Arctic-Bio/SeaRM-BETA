"use client"

import useSWR from "swr"
import { useState, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Loader2, ChevronLeft, ChevronRight, Search, Calendar, Users, Ship, Anchor, LayoutGrid, GanttChart } from "lucide-react"
import Link from "next/link"
import { CrewHeatmapCalendar } from "@/components/crew-heatmap-calendar"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function addMonths(date: Date, m: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + m)
  return d
}
function daysBetween(a: Date, b: Date) { return Math.ceil((b.getTime() - a.getTime()) / 86400000) }
function formatDate(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }

const VOYAGE_COLORS = [
  { bg: "bg-chart-1", bgLight: "bg-chart-1/20", text: "text-chart-1", border: "border-chart-1/40" },
  { bg: "bg-chart-2", bgLight: "bg-chart-2/20", text: "text-chart-2", border: "border-chart-2/40" },
  { bg: "bg-chart-3", bgLight: "bg-chart-3/20", text: "text-chart-3", border: "border-chart-3/40" },
  { bg: "bg-chart-4", bgLight: "bg-chart-4/20", text: "text-chart-4", border: "border-chart-4/40" },
  { bg: "bg-chart-5", bgLight: "bg-chart-5/20", text: "text-chart-5", border: "border-chart-5/40" },
  { bg: "bg-primary", bgLight: "bg-primary/20", text: "text-primary", border: "border-primary/40" },
  { bg: "bg-success", bgLight: "bg-success/20", text: "text-success", border: "border-success/40" },
]

export default function AvailabilityPage() {
  const { data, isLoading } = useSWR("/api/availability", fetcher)
  const [search, setSearch] = useState("")
  const [monthOffset, setMonthOffset] = useState(0)
  const [viewMode, setViewMode] = useState<"timeline" | "heatmap">("timeline")
  const scrollRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const viewStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const viewEnd = addMonths(viewStart, 3)
  const totalDays = daysBetween(viewStart, viewEnd)

  // Build week markers
  const weeks = useMemo(() => {
    const result: { date: Date; dayOffset: number }[] = []
    const d = new Date(viewStart)
    // Align to Monday
    const dayOfWeek = d.getDay()
    if (dayOfWeek !== 1) d.setDate(d.getDate() + (dayOfWeek === 0 ? 1 : 8 - dayOfWeek))
    while (d < viewEnd) {
      result.push({ date: new Date(d), dayOffset: daysBetween(viewStart, d) })
      d.setDate(d.getDate() + 7)
    }
    return result
  }, [viewStart.getTime(), viewEnd.getTime()])

  // Build month markers
  const months = useMemo(() => {
    const result: { label: string; startPct: number; widthPct: number }[] = []
    let d = new Date(viewStart)
    while (d < viewEnd) {
      const monthStart = new Date(Math.max(d.getTime(), viewStart.getTime()))
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const clampedEnd = new Date(Math.min(monthEnd.getTime(), viewEnd.getTime()))
      const startDay = daysBetween(viewStart, monthStart)
      const endDay = daysBetween(viewStart, clampedEnd) + 1
      result.push({
        label: d.toLocaleString("default", { month: "long", year: "numeric" }),
        startPct: (startDay / totalDays) * 100,
        widthPct: ((endDay - startDay) / totalDays) * 100,
      })
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
    return result
  }, [viewStart.getTime(), viewEnd.getTime(), totalDays])

  const crew = data?.crew ?? []
  const assignments = data?.assignments ?? []
  const voyages = data?.voyages ?? []

  const voyageColorMap = useMemo(() => {
    const map: Record<string, typeof VOYAGE_COLORS[0]> = {}
    voyages.forEach((v: any, i: number) => { map[v.id] = VOYAGE_COLORS[i % VOYAGE_COLORS.length] })
    return map
  }, [voyages])

  const filteredCrew = useMemo(() => crew.filter((c: any) => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(s) ||
      c.department_preference?.toLowerCase().includes(s)
  }), [crew, search])

  const activeAssignments = assignments.filter((a: any) => ["active", "on_board"].includes(a.assignment_status))
  const upcomingAssignments = assignments.filter((a: any) => ["assigned", "travel"].includes(a.assignment_status))
  const availableCrew = crew.filter((c: any) => !assignments.some((a: any) => a.crew_id === c.id && ["active", "on_board"].includes(a.assignment_status)))

  // Today marker position
  const todayOffset = daysBetween(viewStart, now)
  const todayPct = totalDays > 0 ? (todayOffset / totalDays) * 100 : -1

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 md:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">Crew Availability</h1>
            <p className="text-sm text-muted-foreground mt-1">Timeline view of crew assignments across voyages</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5", viewMode !== "timeline" && "text-muted-foreground")}
                onClick={() => setViewMode("timeline")}
              >
                <GanttChart className="h-3.5 w-3.5" />
                Timeline
              </Button>
              <Button
                variant={viewMode === "heatmap" ? "default" : "ghost"}
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5", viewMode !== "heatmap" && "text-muted-foreground")}
                onClick={() => setViewMode("heatmap")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Heatmap
              </Button>
            </div>

            {viewMode === "timeline" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((m) => m - 3)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs font-medium min-w-24 justify-center" onClick={() => setMonthOffset(0)}>
                  {monthOffset === 0 ? "Current" : months[0]?.label.split(" ")[0]}
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((m) => m + 3)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Crew Tracked", value: crew.length, icon: Users, iconClass: "text-primary", bgClass: "bg-primary/10" },
            { label: "Active", value: activeAssignments.length, icon: Ship, iconClass: "text-success", bgClass: "bg-success/10" },
            { label: "Upcoming", value: upcomingAssignments.length, icon: Calendar, iconClass: "text-chart-2", bgClass: "bg-chart-2/10" },
            { label: "Available", value: availableCrew.length, icon: Anchor, iconClass: "text-warning", bgClass: "bg-warning/10" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", s.bgClass)}>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search crew..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {voyages.filter((v: any) => v.departure_date).slice(0, 6).map((v: any) => {
              const colors = voyageColorMap[v.id]
              return (
                <Badge key={v.id} variant="outline" className={cn("text-[10px] gap-1.5 font-medium", colors?.border)}>
                  <span className={cn("h-2 w-2 rounded-full", colors?.bg)} />
                  {v.voyage_name}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Heatmap Calendar View */}
        {viewMode === "heatmap" && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <CrewHeatmapCalendar crew={crew} assignments={assignments} />
            </CardContent>
          </Card>
        )}

        {/* Timeline View */}
        {viewMode === "timeline" && <Card className="overflow-hidden">
          <div className="overflow-x-auto" ref={scrollRef}>
            <div className="min-w-[1000px]">

              {/* Month headers */}
              <div className="flex border-b bg-muted/30 sticky top-0 z-20">
                <div className="w-52 shrink-0 px-4 py-2 text-xs font-semibold text-muted-foreground border-r bg-card flex items-center">
                  Crew Member
                </div>
                <div className="flex-1 relative h-9">
                  {months.map((m) => (
                    <div
                      key={m.label}
                      className="absolute top-0 h-full flex items-center px-3 text-xs font-semibold text-foreground border-r"
                      style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Week sub-headers */}
              <div className="flex border-b bg-muted/15 sticky top-9 z-10">
                <div className="w-52 shrink-0 border-r" />
                <div className="flex-1 relative h-6">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex items-center text-[10px] text-muted-foreground/70 border-r border-dashed border-border/50"
                      style={{ left: `${(w.dayOffset / totalDays) * 100}%`, width: `${(7 / totalDays) * 100}%` }}
                    >
                      <span className="pl-1">{formatDate(w.date)}</span>
                    </div>
                  ))}
                  {/* Today marker */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 h-full z-10" style={{ left: `${todayPct}%` }}>
                      <div className="w-px h-full bg-destructive" />
                    </div>
                  )}
                </div>
              </div>

              {/* Crew rows */}
              {filteredCrew.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {crew.length === 0 ? "No crew members found." : "No results for your search."}
                </div>
              ) : filteredCrew.map((c: any, rowIdx: number) => {
                const crewAssignments = assignments.filter((a: any) => a.crew_id === c.id)
                const isActive = crewAssignments.some((a: any) => ["active", "on_board"].includes(a.assignment_status))

                return (
                  <div key={c.id} className={cn("flex border-b last:border-b-0 group hover:bg-muted/20 transition-colors", rowIdx % 2 === 0 && "bg-muted/5")}>
                    {/* Name */}
                    <div className="w-52 shrink-0 px-4 py-2 border-r flex items-center gap-2.5">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      )}>
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/crew/${c.id}`} className="text-xs font-medium hover:underline truncate block">
                          {c.first_name} {c.last_name}
                        </Link>
                        {c.department_preference && (
                          <span className="text-[10px] text-muted-foreground truncate block">{c.department_preference}</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline bar */}
                    <div className="flex-1 relative" style={{ minHeight: 44 }}>
                      {/* Week gridlines */}
                      {weeks.map((w, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full border-r border-dashed border-border/20"
                          style={{ left: `${(w.dayOffset / totalDays) * 100}%` }}
                        />
                      ))}

                      {/* Availability window */}
                      {c.availability_start_date && (() => {
                        const availStart = new Date(c.availability_start_date)
                        const availDur = c.duration ? parseInt(c.duration) || 90 : 90
                        const availEnd = new Date(availStart.getTime() + availDur * 86400000)
                        const s = Math.max(0, daysBetween(viewStart, availStart))
                        const e = Math.min(totalDays, daysBetween(viewStart, availEnd))
                        if (e <= 0 || s >= totalDays) return null
                        return (
                          <div
                            className="absolute top-1 bottom-1 bg-success/8 border border-dashed border-success/20 rounded"
                            style={{ left: `${(s / totalDays) * 100}%`, width: `${((e - s) / totalDays) * 100}%` }}
                          />
                        )
                      })()}

                      {/* Assignment bars */}
                      {crewAssignments.map((a: any) => {
                        if (!a.departure_date) return null
                        const dep = new Date(a.departure_date)
                        const ret = a.return_date ? new Date(a.return_date) : addMonths(dep, 2)
                        const s = Math.max(0, daysBetween(viewStart, dep))
                        const e = Math.min(totalDays, daysBetween(viewStart, ret))
                        if (e <= 0 || s >= totalDays) return null
                        const colors = voyageColorMap[a.voyage_id] || VOYAGE_COLORS[0]
                        const widthPct = Math.max(0.8, ((e - s) / totalDays) * 100)

                        return (
                          <Tooltip key={a.voyage_id}>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/voyages/${a.voyage_id}`}
                                className={cn(
                                  "absolute top-2 flex items-center rounded-sm px-2 text-[10px] font-semibold truncate cursor-pointer transition-all hover:brightness-110 hover:shadow-sm",
                                  colors.bgLight, colors.text, "border", colors.border,
                                )}
                                style={{ left: `${(s / totalDays) * 100}%`, width: `${widthPct}%`, height: 28 }}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shrink-0", colors.bg)} />
                                <span className="truncate">{a.voyage_name}</span>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-64">
                              <p className="font-semibold">{a.voyage_name}</p>
                              <p className="text-muted-foreground">
                                {formatDate(dep)} - {a.return_date ? formatDate(ret) : "TBD"}
                              </p>
                              {a.role && <p className="text-muted-foreground">Role: {a.role}</p>}
                              {a.ship_name && <p className="text-muted-foreground">Ship: {a.ship_name}</p>}
                              <p className="capitalize text-muted-foreground">Status: {a.assignment_status?.replace("_", " ")}</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}

                      {/* Today marker */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute top-0 h-full z-10 pointer-events-none" style={{ left: `${todayPct}%` }}>
                          <div className="w-px h-full bg-destructive/60" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredCrew.length} crew member{filteredCrew.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Today</span>
              <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-success" /> Available</span>
            </div>
          </div>
        </Card>}
        
      </div>
    </TooltipProvider>
  )
}
