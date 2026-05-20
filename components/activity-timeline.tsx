"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity } from "@/lib/db"
import {
  ArrowRightLeft, FileText, CheckSquare, MessageSquare, Users,
  Ship, Anchor, Star, Clock, Bell, ScrollText, UserCheck,
} from "lucide-react"

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: ArrowRightLeft,
  note_added: MessageSquare,
  document_uploaded: FileText,
  document_verified: CheckSquare,
  task_created: Bell,
  task_completed: CheckSquare,
  interview_scheduled: Clock,
  interview_completed: UserCheck,
  assigned_to_voyage: Ship,
  signed_on: Anchor,
  signed_off: Anchor,
  role_changed: ArrowRightLeft,
  rating_changed: Star,
  communication_logged: MessageSquare,
  application_received: ScrollText,
  forms_sent: FileText,
  forms_completed: CheckSquare,
  welcome_guide_sent: FileText,
  position_opened: Users,
  position_filled: UserCheck,
  general: Bell,
}

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: "text-chart-1 bg-chart-1/10",
  note_added: "text-chart-2 bg-chart-2/10",
  document_uploaded: "text-chart-3 bg-chart-3/10",
  task_created: "text-warning bg-warning/10",
  task_completed: "text-success bg-success/10",
  assigned_to_voyage: "text-primary bg-primary/10",
  signed_on: "text-success bg-success/10",
  signed_off: "text-muted-foreground bg-muted",
  general: "text-muted-foreground bg-muted",
}

interface ActivityTimelineProps {
  activities: Activity[]
  emptyMessage?: string
}

export function ActivityTimeline({ activities, emptyMessage = "No activity recorded yet" }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Clock className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex flex-col gap-0">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          {activities.map((activity, idx) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] || Bell
            const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.general

            return (
              <div key={activity.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                <div className={cn(
                  "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  colorClass,
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  {activity.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(activity.created_at).toLocaleString()}</span>
                    <span>&middot;</span>
                    <span>{activity.actor_name}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
