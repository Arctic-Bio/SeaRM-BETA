"use client"

import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/status-badge"
import { StarRating } from "@/components/star-rating"
import type { ApplicantStatus } from "@/lib/db"
import {
  Users,
  Anchor,
  Globe,
  ArrowRight,
  Loader2,
  UserCheck,
  FileText,
  Ship,
  Navigation,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  CalendarClock,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CHART_COLORS = [
  "oklch(0.55 0.15 250)",
  "oklch(0.60 0.15 170)",
  "oklch(0.72 0.14 75)",
  "oklch(0.50 0.10 290)",
  "oklch(0.65 0.20 30)",
]

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive border-destructive/25",
  high: "bg-warning/15 text-warning border-warning/25",
  medium: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  low: "bg-muted text-muted-foreground border-border",
}

const PIPELINE_STAGES = [
  { key: "new_applicant", label: "New", color: "oklch(0.55 0.15 250)" },
  { key: "reviewed", label: "Reviewed", color: "oklch(0.60 0.15 170)" },
  { key: "awaiting_interview", label: "Interview", color: "oklch(0.72 0.14 75)" },
  { key: "interview_completed", label: "Interviewed", color: "oklch(0.65 0.20 30)" },
  { key: "candidate", label: "Candidate", color: "oklch(0.50 0.10 290)" },
  { key: "approved", label: "Approved", color: "oklch(0.55 0.16 155)" },
  { key: "confirmed", label: "Confirmed", color: "oklch(0.45 0.18 155)" },
] as const

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "No date"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useSWR("/api/stats", fetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 p-6 lg:p-8 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-32 bg-muted rounded-md" />
            <div className="h-4 w-56 bg-muted rounded-md mt-2" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted rounded-md" />
            <div className="h-9 w-24 bg-muted rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2"><CardContent className="p-6"><div className="h-48 bg-muted rounded" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-48 bg-muted rounded" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!stats || stats.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Anchor className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center max-w-lg">
          <h2 className="text-xl font-bold tracking-tight text-foreground text-balance">
            {"Welcome to SeaRM"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-pretty">
            Your crew management command center. Get started by adding vessels to your fleet or uploading crew application data from CSV.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" asChild>
            <Link href="/ships">
              <Ship className="mr-2 h-4 w-4" />
              Add a Ship
            </Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/upload">
              <FileText className="mr-2 h-4 w-4" />
              Upload Crew CSV
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const newCount =
    stats.statusCounts?.find(
      (s: { status: string; count: number }) => s.status === "new_applicant"
    )?.count || 0
  const confirmedCount =
    stats.statusCounts?.find(
      (s: { status: string; count: number }) => s.status === "confirmed"
    )?.count || 0
  const inPipeline = stats.statusCounts
    ?.filter(
      (s: { status: string; count: number }) =>
        s.status !== "new_applicant" &&
        s.status !== "rejected" &&
        s.status !== "confirmed"
    )
    .reduce((sum: number, s: { count: number }) => sum + s.count, 0) || 0

  // Pipeline funnel data
  const pipelineData = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: parseInt(stats.pipeline?.[stage.key] || "0"),
  })).filter((s) => s.count > 0 || s.key === "new_applicant")

  // Skill chart data
  const skillData = stats.skillStats
    ? [
        { name: "Small Boats", value: parseInt(stats.skillStats.small_boats) || 0 },
        { name: "Engineering", value: parseInt(stats.skillStats.engineering) || 0 },
        { name: "Mechanical", value: parseInt(stats.skillStats.mechanical) || 0 },
        { name: "Scuba", value: parseInt(stats.skillStats.scuba_diving) || 0 },
        { name: "Electrical", value: parseInt(stats.skillStats.electrical) || 0 },
        { name: "Electronics", value: parseInt(stats.skillStats.electronics) || 0 },
        { name: "Cooking", value: parseInt(stats.skillStats.cooking) || 0 },
        { name: "Media", value: parseInt(stats.skillStats.media) || 0 },
        { name: "Drone", value: parseInt(stats.skillStats.drone) || 0 },
        { name: "Photo", value: parseInt(stats.skillStats.photography) || 0 },
        { name: "Video", value: parseInt(stats.skillStats.videography) || 0 },
        { name: "Medical", value: parseInt(stats.skillStats.medical) || 0 },
        { name: "Welding", value: parseInt(stats.skillStats.welding) || 0 },
        { name: "Crane", value: parseInt(stats.skillStats.crane_operation) || 0 },
        { name: "Bio/Sci", value: parseInt(stats.skillStats.biology_science) || 0 },
      ]
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : []

  // Department pie chart data
  const deptData =
    stats.departmentCounts?.slice(0, 6).map(
      (d: { department: string; count: number }, i: number) => ({
        name: d.department || "Unspecified",
        value: d.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })
    ) || []

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Crew operations command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/pipeline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/crew">
              <Users className="mr-2 h-4 w-4" />
              All Crew
            </Link>
          </Button>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {stats.total}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Total Crew
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10">
                <FileText className="h-4 w-4 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {newCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  New
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                <TrendingUp className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {inPipeline}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  In Pipeline
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {confirmedCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Confirmed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10">
                <Ship className="h-4 w-4 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {stats.fleet?.ships || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ships
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-5/10">
                <Navigation className="h-4 w-4 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {stats.fleet?.activeVoyages || 0}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Voyages
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Alerts bar (overdue tasks, urgent items) */}
      {(stats.overdueTasks > 0 || stats.openTasks > 0) && (
        <div className="flex items-center gap-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div className="flex items-center gap-4 text-sm">
            {stats.overdueTasks > 0 && (
              <span className="font-medium text-warning">
                {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? "s" : ""}
              </span>
            )}
            {stats.overdueTasks > 0 && stats.openTasks > 0 && (
              <span className="text-muted-foreground">&middot;</span>
            )}
            {stats.openTasks > 0 && (
              <span className="text-muted-foreground">
                {stats.openTasks} open task{stats.openTasks > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="ml-auto text-xs">
            <Link href="/tasks">
              View Tasks
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

      {/* Row 3: Pipeline Funnel + Status Breakdown + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Recruitment Pipeline</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/pipeline">
                Kanban View
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 ? (
              <div className="flex flex-col gap-3">
                {pipelineData.map((stage) => {
                  const maxCount = Math.max(
                    ...pipelineData.map((s) => s.count),
                    1
                  )
                  const pct = (stage.count / maxCount) * 100
                  return (
                    <div key={stage.key} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                        {stage.label}
                      </span>
                      <div className="flex-1 h-7 rounded-md bg-accent/50 overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: stage.color,
                          }}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-foreground">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No pipeline data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {stats.recentActivity?.length > 0 ? (
                stats.recentActivity.map(
                  (a: {
                    id: string
                    activity_type: string
                    title: string
                    description: string
                    actor_name: string
                    created_at: string
                    first_name: string | null
                    last_name: string | null
                  }) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {a.first_name
                            ? `${a.first_name} ${a.last_name}`
                            : a.actor_name}
                          {" \u00B7 "}
                          {formatRelativeTime(a.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Activity className="h-7 w-7 text-muted-foreground/25" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    No activity yet
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Upcoming Tasks + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Upcoming Tasks
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/tasks">
                All Tasks
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {stats.upcomingTasks?.length > 0 ? (
                stats.upcomingTasks.map(
                  (task: {
                    id: string
                    title: string
                    priority: string
                    status: string
                    due_date: string | null
                    task_type: string
                    first_name: string | null
                    last_name: string | null
                  }) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md border p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {task.priority === "urgent" ||
                        task.priority === "high" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                        ) : (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {task.first_name
                              ? `${task.first_name} ${task.last_name}`
                              : "Unassigned"}
                            {task.due_date && (
                              <>
                                {" \u00B7 "}
                                <CalendarClock className="inline h-3 w-3 -mt-px" />{" "}
                                {formatDate(task.due_date)}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ml-2 ${PRIORITY_STYLES[task.priority] || ""}`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  )
                )
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckSquare className="h-7 w-7 text-muted-foreground/25" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    No pending tasks
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {stats.statusCounts?.length > 0 ? (
                stats.statusCounts.map(
                  (s: { status: string; count: number }) => {
                    const pct =
                      stats.total > 0
                        ? Math.round((s.count / stats.total) * 100)
                        : 0
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <StatusBadge
                          status={s.status as ApplicantStatus}
                        />
                        <div className="flex-1">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <span className="text-sm font-medium text-foreground w-8 text-right tabular-nums">
                          {s.count}
                        </span>
                      </div>
                    )
                  }
                )
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Skills Chart + Countries + Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Skills Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Skills Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skillData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={skillData}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.90 0.01 240)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "oklch(0.48 0.015 250)" }}
                    axisLine={{ stroke: "oklch(0.90 0.01 240)" }}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.48 0.015 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(1 0 0)",
                      border: "1px solid oklch(0.91 0.01 240)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {skillData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-xs text-muted-foreground">
                  No skill data yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {stats.countryCounts?.length > 0 ? (
                stats.countryCounts
                  .slice(0, 8)
                  .map(
                    (
                      c: { country: string; count: number },
                      idx: number
                    ) => (
                      <div
                        key={c.country}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 tabular-nums">
                            {idx + 1}.
                          </span>
                          <span className="text-sm text-foreground">
                            {c.country}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {c.count}
                        </span>
                      </div>
                    )
                  )
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Maritime Quals + Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Maritime Qualifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Maritime Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {stats.maritimeQualCounts?.length > 0 ? (
                stats.maritimeQualCounts.map(
                  (q: { qualification: string; count: number }) => (
                    <div
                      key={q.qualification}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-foreground truncate max-w-56">
                        {q.qualification}
                      </span>
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {q.count}
                      </span>
                    </div>
                  )
                )
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Recent Applications
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/crew">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5">
              {stats.recentApplications?.length > 0 ? (
                stats.recentApplications.map(
                  (app: {
                    id: string
                    first_name: string
                    last_name: string
                    email: string
                    status: string
                    rating: number
                    country: string
                    created_at: string
                  }) => (
                    <Link
                      key={app.id}
                      href={`/crew/${app.id}`}
                      className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {app.first_name?.[0]}
                          {app.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {app.first_name} {app.last_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {app.country || app.email}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={app.status as ApplicantStatus}
                      />
                    </Link>
                  )
                )
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Users className="h-7 w-7 text-muted-foreground/25" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    No applications yet
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
