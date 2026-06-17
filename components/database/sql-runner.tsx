"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Play, Loader2, Clock, Terminal, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SqlResult {
  rows: Record<string, any>[]
  fields: string[]
  rowCount: number
  duration: number
}

const SAMPLES = [
  "SELECT * FROM crew LIMIT 10;",
  "SELECT status, COUNT(*) FROM crew GROUP BY status ORDER BY 2 DESC;",
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
]

function formatCell(v: any) {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

export function SqlRunner({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || SAMPLES[0])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SqlResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!query.trim()) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_sql", query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Query failed")
      setResult({ rows: data.rows, fields: data.fields, rowCount: data.rowCount, duration: data.duration })
      toast.success(`${data.rowCount} row(s) · ${data.duration}ms`)
    } catch (e: any) {
      setError(e.message)
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">SQL Console</span>
          <span className="text-[11px] text-muted-foreground/60">Cmd/Ctrl + Enter to run</span>
          <div className="flex-1" />
          <Button size="sm" className="h-7 gap-1.5" onClick={run} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </Button>
        </div>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run() }
          }}
          spellCheck={false}
          rows={6}
          className="rounded-none border-0 font-mono text-xs resize-y focus-visible:ring-0"
          placeholder="SELECT * FROM ..."
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground self-center mr-1">Samples:</span>
        {SAMPLES.map((s, i) => (
          <button
            key={i}
            onClick={() => setQuery(s)}
            className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {s.length > 42 ? s.slice(0, 42) + "…" : s}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <code className="font-mono break-all">{error}</code>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary">{result.rowCount} rows</Badge>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{result.duration}ms</span>
          </div>
          {result.rows.length > 0 ? (
            <div className="max-h-[460px] overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow className="hover:bg-transparent">
                    {result.fields.map((f) => (
                      <TableHead key={f} className="font-mono text-xs whitespace-nowrap">{f}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.fields.map((f) => {
                        const text = formatCell(row[f])
                        return (
                          <TableCell key={f} className="max-w-[320px]">
                            <div className={cn("truncate font-mono text-xs", text === "NULL" && "text-muted-foreground/50 italic")} title={text}>
                              {text}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Query executed successfully. No rows returned.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
