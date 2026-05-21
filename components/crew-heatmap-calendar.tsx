"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface CrewMember {
  id: string
  first_name: string
  last_name: string
  availability_start_date: string | null
  duration: string | null
  department_preference: string | null
}

interface Assignment {
  crew_id: string
  voyage_id: string
  voyage_name: string
  role: string
  assignment_status: string
  departure_date: string | null
  return_date: string | null
  ship_name: string | null
}

interface Props {
  crew: CrewMember[]
  assignments: Assignment[]
}

// Heat color scale: white -> light -> medium -> dark red
// 0 = nobody, 1-N = progressively darker
function getHeatColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/30"
  if (max <= 0) return "bg-muted/30"
  const ratio = count / max
  if (ratio <= 0.2) return "bg-red-100 dark:bg-red-950/40"
  if (ratio <= 0.4) return "bg-red-200 dark:bg-red-900/50"
  if (ratio <= 0.6) return "bg-red-300 dark:bg-red-800/60"
  if (ratio <= 0.8) return "bg-red-400 dark:bg-red-700/70"
  return "bg-red-500 dark:bg-red-600/80"
}

function getHeatTextColor(count: number, max: number): string {
  if (count === 0) return "text-muted-foreground/40"
  const ratio = max > 0 ? count / max : 0
  if (ratio <= 0.4) return "text-red-900 dark:text-red-200"
  return "text-white dark:text-red-100"
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun, we want Mon=0
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CrewHeatmapCalendar({ crew, assignments }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Build a map of date -> list of available crew names
  const { dayMap, maxCount } = useMemo(() => {
    const map = new Map<string, { names: string[]; departments: string[] }>()
    const daysInMonth = getDaysInMonth(year, month)

    // Initialize all days
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      map.set(key, { names: [], departments: [] })
    }

    for (const c of crew) {
      if (!c.availability_start_date) continue
      const availStart = new Date(c.availability_start_date)
      const dur = c.duration ? parseInt(c.duration) || 90 : 90
      const availEnd = new Date(availStart.getTime() + dur * 86400000)

      // Check this crew member is NOT on an active assignment during this month
      const crewAssignments = assignments.filter(
        (a) => a.crew_id === c.id && ["active", "on_board", "assigned", "travel"].includes(a.assignment_status)
      )

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        // Is this date within availability window?
        if (date < availStart || date > availEnd) continue

        // Is this date blocked by an assignment?
        const blocked = crewAssignments.some((a) => {
          if (!a.departure_date) return false
          const dep = new Date(a.departure_date)
          const ret = a.return_date ? new Date(a.return_date) : new Date(dep.getTime() + 60 * 86400000)
          return date >= dep && date <= ret
        })
        if (blocked) continue

        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
        const entry = map.get(key)
        if (entry) {
          const fullName = `${c.first_name} ${c.last_name}`
          entry.names.push(fullName)
          if (c.department_preference) entry.departments.push(c.department_preference)
        }
      }
    }

    let max = 0
    map.forEach((v) => { if (v.names.length > max) max = v.names.length })

    return { dayMap: map, maxCount: max }
  }, [crew, assignments, year, month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const isToday = (d: number) =>
    year === now.getFullYear() && month === now.getMonth() && d === now.getDate()

  // Build grid cells
  const cells: (null | number)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-sm font-semibold min-w-40 justify-center" onClick={goToday}>
            {MONTH_NAMES[month]} {year}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          <span className="h-4 w-4 rounded-sm bg-muted/30 border border-border/50" />
          <span className="h-4 w-4 rounded-sm bg-red-100 dark:bg-red-950/40" />
          <span className="h-4 w-4 rounded-sm bg-red-200 dark:bg-red-900/50" />
          <span className="h-4 w-4 rounded-sm bg-red-300 dark:bg-red-800/60" />
          <span className="h-4 w-4 rounded-sm bg-red-400 dark:bg-red-700/70" />
          <span className="h-4 w-4 rounded-sm bg-red-500 dark:bg-red-600/80" />
          <span>More</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square border-b border-r border-border/30 bg-muted/10" />
            }

            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const entry = dayMap.get(key)
            const count = entry?.names.length ?? 0
            const heatBg = getHeatColor(count, maxCount)
            const heatText = getHeatTextColor(count, maxCount)

            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square border-b border-r border-border/30 p-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-default relative",
                      heatBg,
                      isToday(day) && "ring-2 ring-inset ring-blue-500"
                    )}
                  >
                    <span className={cn("text-xs font-medium", isToday(day) ? "text-blue-600 dark:text-blue-400 font-bold" : heatText)}>
                      {day}
                    </span>
                    {count > 0 && (
                      <span className={cn("text-[10px] font-bold leading-none", heatText)}>
                        {count}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  <p className="font-semibold text-xs mb-1">
                    {MONTH_NAMES[month]} {day}, {year}
                  </p>
                  {count === 0 ? (
                    <p className="text-xs text-muted-foreground">No crew available</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {count} crew available:
                      </p>
                      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                        {entry!.names.map((name, ni) => (
                          <div key={ni} className="text-xs flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                            <span>{name}</span>
                            {entry!.departments[ni] && (
                              <span className="text-muted-foreground">({entry!.departments[ni]})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Peak: <strong className="text-foreground">{maxCount}</strong> crew on a single day</span>
        <span>Total crew tracked: <strong className="text-foreground">{crew.length}</strong></span>
      </div>
    </div>
  )
}
