"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Search, Table2, Eye, ShieldCheck, Database } from "lucide-react"
import type { TableInfo } from "./types"

interface TableListProps {
  tables: TableInfo[]
  selected: { schema: string; name: string } | null
  onSelect: (t: TableInfo) => void
}

export function TableList({ tables, selected, onSelect }: TableListProps) {
  const [q, setQ] = useState("")

  const grouped = useMemo(() => {
    const filtered = tables.filter((t) =>
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.schema.toLowerCase().includes(q.toLowerCase()),
    )
    const map = new Map<string, TableInfo[]>()
    for (const t of filtered) {
      if (!map.has(t.schema)) map.set(t.schema, [])
      map.get(t.schema)!.push(t)
    }
    return Array.from(map.entries())
  }, [tables, q])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative p-2 shrink-0">
        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tables..."
          className="pl-9 h-9"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {grouped.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No tables match</p>
        ) : (
          grouped.map(([schema, items]) => (
            <div key={schema} className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                <Database className="h-3 w-3" />
                {schema}
                <span className="ml-auto font-normal">{items.length}</span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.map((t) => {
                  const isActive = selected?.schema === t.schema && selected?.name === t.name
                  const Icon = t.type === "view" ? Eye : Table2
                  return (
                    <li key={`${t.schema}.${t.name}`}>
                      <button
                        onClick={() => onSelect(t)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-foreground/70 hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate font-mono">{t.name}</span>
                        {t.has_rls && <ShieldCheck className="h-3 w-3 text-success shrink-0" />}
                        <Badge variant="secondary" className="ml-auto text-[10px] py-0 px-1.5 font-normal shrink-0">
                          {t.rows.toLocaleString()}
                        </Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
