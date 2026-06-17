"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown, ChevronRight, RefreshCw, Trash2, Inbox, CheckCircle2, XCircle,
  RefreshCcw, MinusCircle, Copy, Check, Clock, Globe, ArrowDownToLine, Hash,
} from "lucide-react"
import { toast } from "sonner"
import type { IntegrationLog } from "@/lib/integrations/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  received: { label: "Received", className: "bg-chart-2/10 text-chart-2 border-chart-2/20", icon: ArrowDownToLine },
  success: { label: "Created", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  duplicate: { label: "Updated", className: "bg-chart-4/10 text-chart-4 border-chart-4/20", icon: RefreshCcw },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground border-border", icon: MinusCircle },
  error: { label: "Error", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
}

const STATUS_FILTERS = ["all", "success", "duplicate", "skipped", "error", "received"] as const

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 gap-1 px-2 text-[10px]"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success(`${label} copied`)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      Copy
    </Button>
  )
}

function CodeBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined || (typeof value === "object" && Object.keys(value).length === 0)) {
    return (
      <div className="min-w-0 max-w-full w-full">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 truncate">{title}</p>
        <p className="text-[11px] italic text-muted-foreground/60 bg-muted/30 rounded-md p-2">empty</p>
      </div>
    )
  }
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  return (
    <div className="min-w-0 max-w-full w-full flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate flex-1">{title}</p>
        <CopyButton value={text} label={title} />
      </div>
      <div className="bg-muted/40 rounded-md max-h-56 overflow-hidden flex flex-col min-w-0 w-full">
        <div className="overflow-y-auto overflow-x-hidden p-2 flex-1 min-w-0 w-full" style={{ wordBreak: "break-word" }}>
          <pre className="text-[11px] font-mono text-xs leading-relaxed m-0 p-0 whitespace-pre-wrap break-words" style={{ wordBreak: "break-word" }}>
            {text}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function IntegrationLogs({ connectionId }: { connectionId: string }) {
  const { data, mutate, isLoading } = useSWR<IntegrationLog[]>(
    `/api/integrations/${connectionId}/logs`,
    fetcher,
    { refreshInterval: 10000 },
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const allLogs = Array.isArray(data) ? data : []
  const logs = filter === "all" ? allLogs : allLogs.filter((l) => l.status === filter)

  const counts = allLogs.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const clearLogs = async () => {
    const res = await fetch(`/api/integrations/${connectionId}/logs`, { method: "DELETE" })
    if (res.ok) { toast.success("Logs cleared"); mutate() }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Full request history — every inbound call is recorded for debugging (auto-refreshes every 10s).
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => mutate()}>
            <RefreshCw className="h-3 w-3" />Refresh
          </Button>
          {allLogs.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={clearLogs}>
              <Trash2 className="h-3 w-3" />Clear
            </Button>
          )}
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f
          const count = f === "all" ? allLogs.length : counts[f] || 0
          const label = f === "all" ? "All" : STATUS_META[f]?.label || f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                active ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground hover:bg-accent/10"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {logs.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg">
          <Inbox className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          {isLoading
            ? "Loading..."
            : filter === "all"
              ? "No submissions yet. Send a test from your form tool or Zapier to see it appear here instantly."
              : `No "${filter}" entries.`}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {logs.map((log) => {
            const meta = STATUS_META[log.status] || STATUS_META.error
            const Icon = meta.icon
            const isOpen = expanded === log.id
            return (
              <div key={log.id} className="border rounded-lg bg-card">
                <button
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/5 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <Icon className={`h-4 w-4 shrink-0 ${meta.className.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{log.crew_name || "Unidentified submission"}</span>
                      <Badge variant="outline" className={`text-[9px] ${meta.className}`}>{meta.label}</Badge>
                      {log.http_method && (
                        <Badge variant="outline" className="text-[9px] font-mono">{log.http_method}</Badge>
                      )}
                      {typeof log.matched_count === "number" && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                          <Hash className="h-2.5 w-2.5" />{log.matched_count} mapped
                        </span>
                      )}
                    </div>
                    {log.error_message && <p className="text-[11px] text-destructive mt-0.5 line-clamp-1">{log.error_message}</p>}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                    {typeof log.duration_ms === "number" && (
                      <span className="text-[9px] text-muted-foreground/70 inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{log.duration_ms}ms
                      </span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t max-w-full w-full overflow-hidden">
                    <div className="p-4 flex flex-col gap-4 overflow-x-hidden max-w-full w-full" style={{ overflowX: "hidden" }}>
                      {/* Request metadata row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] w-full min-w-0">
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                          <p className="font-medium truncate">{meta.label}{typeof log.response_status === "number" ? ` (${log.response_status})` : ""}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Method</p>
                          <p className="font-mono truncate">{log.http_method || "—"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1"><Globe className="h-2.5 w-2.5 shrink-0" />Source IP</p>
                          <p className="font-mono truncate text-[10px]">{log.request_ip || "—"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Content-Type</p>
                          <p className="font-mono truncate text-[10px]">{log.content_type || "—"}</p>
                        </div>
                      </div>

                      {log.crew_id && (
                        <div className="text-[11px] min-w-0 w-full">
                          <span className="text-muted-foreground">Crew record: </span>
                          <a href={`/crew/${log.crew_id}`} className="font-mono text-chart-2 hover:underline break-all">{log.crew_id}</a>
                        </div>
                      )}

                      {log.error_message && (
                        <div className="min-w-0 w-full">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-destructive mb-1">Error / Reason</p>
                          <div className="bg-destructive/5 text-destructive rounded-md p-2 max-h-48 overflow-y-auto w-full overflow-x-hidden">
                            <pre className="text-[11px] font-mono text-xs m-0 p-0 whitespace-pre-wrap break-words" style={{ wordBreak: "break-word" }}>
                              {log.error_message}
                            </pre>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 w-full min-w-0">
                        <CodeBlock title="Raw body received" value={log.raw_body} />
                        <CodeBlock title="Parsed payload" value={log.payload} />
                        <CodeBlock title="Mapped to crew fields" value={log.mapped_data} />
                        <CodeBlock title="Response sent" value={log.response_body} />
                      </div>

                      <CodeBlock title="Request headers" value={log.headers} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
