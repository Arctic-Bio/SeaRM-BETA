"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { StarRating } from "@/components/star-rating"
import {
  APPLICANT_STATUSES, STATUS_LABELS, STATUS_COLORS,
  type ApplicantStatus, type CrewApplication,
} from "@/lib/db"
import {
  Loader2, MapPin, Anchor, GripVertical, Eye,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PipelinePage() {
  const { data, isLoading, mutate } = useSWR("/api/kanban", fetcher)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)

  const columns: Record<string, Partial<CrewApplication>[]> = data?.columns || {}

  const handleDragStart = (e: React.DragEvent, crewId: string) => {
    e.dataTransfer.setData("text/plain", crewId)
    e.dataTransfer.effectAllowed = "move"
    dragRef.current = crewId
    setDragging(crewId)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(status)
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const crewId = e.dataTransfer.getData("text/plain") || dragRef.current
    setDragging(null)
    setDragOverCol(null)
    dragRef.current = null

    if (!crewId) return

    let currentStatus = ""
    for (const [status, members] of Object.entries(columns)) {
      if (members.some((m) => m.id === crewId)) {
        currentStatus = status
        break
      }
    }

    if (currentStatus === newStatus) return

    const optimistic = { ...columns }
    const member = optimistic[currentStatus]?.find((m) => m.id === crewId)
    if (member) {
      optimistic[currentStatus] = optimistic[currentStatus].filter((m) => m.id !== crewId)
      if (!optimistic[newStatus]) optimistic[newStatus] = []
      optimistic[newStatus] = [{ ...member, status: newStatus as ApplicantStatus }, ...optimistic[newStatus]]
      mutate({ columns: optimistic }, false)
    }

    try {
      const res = await fetch("/api/kanban/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crewId, newStatus }),
      })
      if (!res.ok) throw new Error("Move failed")
      toast.success(`Moved to ${STATUS_LABELS[newStatus as ApplicantStatus]}`)
      mutate()
    } catch {
      toast.error("Failed to update status")
      mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Recruitment Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag applicants between stages to update their status.
        </p>
      </div>

      {/* Kanban columns -- all fit in viewport, no horizontal scroll */}
      <div className="flex-1 grid grid-cols-8 gap-2 min-h-0">
        {APPLICANT_STATUSES.map((status) => {
          const members = columns[status] || []
          return (
            <div
              key={status}
              className={cn(
                "flex flex-col rounded-lg border bg-muted/30 transition-colors min-h-0 min-w-0",
                dragOverCol === status && "border-primary/50 bg-primary/5",
              )}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between gap-1 px-2 py-2 border-b shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none truncate",
                    STATUS_COLORS[status],
                  )}
                  title={STATUS_LABELS[status]}
                >
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
                  {members.length}
                </span>
              </div>

              {/* Cards -- vertical scroll only */}
              <div className="flex flex-col gap-1.5 p-1.5 overflow-y-auto flex-1 min-h-0">
                {members.map((member) => (
                  <div
                    key={member.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, member.id!)}
                    onDragEnd={() => {
                      setDragging(null)
                      setDragOverCol(null)
                    }}
                    className={cn(
                      "group cursor-grab active:cursor-grabbing",
                      dragging === member.id && "opacity-40",
                    )}
                  >
                    <Card className="transition-shadow hover:shadow-md py-0">
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            <p className="text-xs font-medium text-foreground leading-tight truncate">
                              {member.first_name} {member.last_name}
                            </p>
                          </div>
                          <Link
                            href={`/crew/${member.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-3 w-3 text-muted-foreground hover:text-primary" />
                          </Link>
                        </div>
                        <div className="ml-4">
                          <StarRating
                            rating={member.rating || 0}
                            readonly
                            size="sm"
                          />
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                            {member.country && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {member.country}
                              </span>
                            )}
                            {member.maritime_qualifications &&
                              member.maritime_qualifications !== "No" && (
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <Anchor className="h-2.5 w-2.5" />
                                </span>
                              )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="flex items-center justify-center flex-1 min-h-16 text-[10px] text-muted-foreground/50 italic">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
