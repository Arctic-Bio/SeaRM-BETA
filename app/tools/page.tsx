"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Wrench, Play, Save, Star, Trash2, Plus, X, ChevronDown, ChevronRight,
  Database, Search, Loader2, Clock, Copy, Download, AlertTriangle,
  BarChart3, Hash, Type, ToggleLeft, Calendar, List, Code2,
  Braces, ArrowUpDown, Filter, PanelLeftClose, PanelLeft, RefreshCw,
  TableIcon, LayoutGrid, GripVertical, Pencil,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// --- Types ---
interface ColumnInfo {
  name: string; type: string; udtName: string; nullable: boolean; hasDefault: boolean; maxLength: number | null
}
interface TableInfo {
  name: string; columns: ColumnInfo[]; rowCount: number
}
interface SavedTool {
  id: string; name: string; description: string; icon: string; color: string
  query: string; display_type: string; category: string; is_favorite: boolean
  sort_order: number; created_by: string; created_at: string; updated_at: string
}
interface QueryResult {
  rows: Record<string, unknown>[]; rowCount: number; columnMeta: Record<string, string>
  duration: number; query: string; truncated: boolean
}
interface WhereClause {
  id: string; column: string; operator: string; value: string; logicOperator: "AND" | "OR"
}

const OPERATORS = [
  { value: "=", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: ">", label: "greater than" },
  { value: "<", label: "less than" },
  { value: ">=", label: ">= (gte)" },
  { value: "<=", label: "<= (lte)" },
  { value: "LIKE", label: "contains" },
  { value: "NOT LIKE", label: "not contains" },
  { value: "IS NULL", label: "is empty" },
  { value: "IS NOT NULL", label: "is not empty" },
  { value: "IN", label: "in list" },
]

const DISPLAY_TYPES = [
  { value: "table", label: "Table", icon: TableIcon },
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "stat", label: "Statistic", icon: Hash },
  { value: "list", label: "List", icon: List },
]

const TOOL_COLORS = [
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "primary", "destructive", "warning", "success",
]

const CATEGORIES = ["general", "crew", "fleet", "operations", "reports", "admin"]

// --- Helper: column type icon ---
function columnTypeIcon(type: string) {
  switch (type) {
    case "integer": case "bigint": case "numeric": case "real": case "double precision": case "smallint": return <Hash className="h-3 w-3 text-chart-1" />
    case "text": case "character varying": case "varchar": case "char": return <Type className="h-3 w-3 text-chart-2" />
    case "boolean": return <ToggleLeft className="h-3 w-3 text-chart-3" />
    case "timestamp with time zone": case "timestamp without time zone": case "date": case "time": return <Calendar className="h-3 w-3 text-chart-4" />
    case "jsonb": case "json": return <Braces className="h-3 w-3 text-chart-5" />
    case "uuid": return <Code2 className="h-3 w-3 text-primary" />
    case "ARRAY": return <List className="h-3 w-3 text-warning" />
    default: return <Type className="h-3 w-3 text-muted-foreground" />
  }
}

// --- Adaptive Cell Renderer ---
function AdaptiveCell({ value, colType }: { value: unknown; colType: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground/40 italic text-xs">null</span>
  if (typeof value === "boolean") return <Badge variant="outline" className={cn("text-[10px] font-mono", value ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>{value ? "true" : "false"}</Badge>
  if (typeof value === "number") return <span className="font-mono text-xs tabular-nums text-right block">{value.toLocaleString()}</span>
  if (colType === "date" || colType === "timestamp with time zone") {
    const d = new Date(value as string)
    return <span className="text-xs tabular-nums">{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
  }
  if (typeof value === "object" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {value.slice(0, 5).map((v, i) => <Badge key={i} variant="outline" className="text-[10px]">{String(v)}</Badge>)}
        {value.length > 5 && <Badge variant="outline" className="text-[10px] text-muted-foreground">+{value.length - 5}</Badge>}
      </div>
    )
  }
  if (typeof value === "object") {
    return (
      <details className="text-xs max-w-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{"{...}"}</summary>
        <pre className="mt-1 p-2 rounded bg-muted text-[10px] font-mono overflow-auto max-h-32 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
      </details>
    )
  }
  const str = String(value)
  if (str.length > 120) {
    return (
      <details className="text-xs max-w-xs">
        <summary className="cursor-pointer">{str.slice(0, 80)}...</summary>
        <p className="mt-1 text-xs whitespace-pre-wrap">{str}</p>
      </details>
    )
  }
  return <span className="text-xs">{str}</span>
}

// --- Visual Query Builder Component ---
function QueryBuilder({
  tables, selectedTable, setSelectedTable, selectedColumns, setSelectedColumns,
  whereClauses, setWhereClauses, orderBy, setOrderBy, orderDir, setOrderDir,
  limitVal, setLimitVal, onBuild,
}: {
  tables: TableInfo[]; selectedTable: string; setSelectedTable: (t: string) => void
  selectedColumns: string[]; setSelectedColumns: (c: string[]) => void
  whereClauses: WhereClause[]; setWhereClauses: (w: WhereClause[]) => void
  orderBy: string; setOrderBy: (o: string) => void; orderDir: string; setOrderDir: (d: string) => void
  limitVal: string; setLimitVal: (l: string) => void; onBuild: () => void
}) {
  const table = tables.find((t) => t.name === selectedTable)
  const columns = table?.columns || []

  const addWhere = () => {
    setWhereClauses([...whereClauses, { id: crypto.randomUUID(), column: columns[0]?.name || "", operator: "=", value: "", logicOperator: "AND" }])
  }
  const removeWhere = (id: string) => setWhereClauses(whereClauses.filter((w) => w.id !== id))
  const updateWhere = (id: string, field: string, val: string) => {
    setWhereClauses(whereClauses.map((w) => w.id === id ? { ...w, [field]: val } : w))
  }

  const toggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) setSelectedColumns(selectedColumns.filter((c) => c !== col))
    else setSelectedColumns([...selectedColumns, col])
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Table selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source Table</label>
        <Select value={selectedTable} onValueChange={(v) => { setSelectedTable(v); setSelectedColumns([]); setWhereClauses([]) }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select a table..." /></SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t.name} value={t.name}>
                <span className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  {t.name.replace(/_/g, " ")}
                  <Badge variant="outline" className="text-[9px] ml-auto">{t.rowCount} rows</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Columns picker */}
      {table && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">Columns</label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedColumns(columns.map((c) => c.name))}>All</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedColumns([])}>None</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-muted/30 max-h-44 overflow-y-auto">
            {columns.map((col) => (
              <button
                key={col.name}
                onClick={() => toggleColumn(col.name)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all",
                  selectedColumns.includes(col.name)
                    ? "bg-primary/10 text-primary border-primary/25"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                )}
              >
                {columnTypeIcon(col.type)}
                {col.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WHERE clauses */}
      {table && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Conditions
            </label>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={addWhere}>
              <Plus className="h-3 w-3" /> Add Filter
            </Button>
          </div>
          {whereClauses.length === 0 && (
            <p className="text-[11px] text-muted-foreground/50 italic px-1">No filters applied -- showing all rows</p>
          )}
          <div className="flex flex-col gap-2">
            {whereClauses.map((clause, idx) => (
              <div key={clause.id} className="flex items-center gap-1.5 flex-wrap">
                {idx > 0 && (
                  <Select value={clause.logicOperator} onValueChange={(v) => updateWhere(clause.id, "logicOperator", v)}>
                    <SelectTrigger className="h-7 w-16 text-[10px] font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {idx === 0 && <span className="text-[10px] font-bold text-muted-foreground w-16 text-center">WHERE</span>}
                <Select value={clause.column} onValueChange={(v) => updateWhere(clause.id, "column", v)}>
                  <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={clause.operator} onValueChange={(v) => updateWhere(clause.id, "operator", v)}>
                  <SelectTrigger className="h-7 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!["IS NULL", "IS NOT NULL"].includes(clause.operator) && (
                  <Input
                    className="h-7 text-[10px] flex-1 min-w-24"
                    value={clause.value}
                    onChange={(e) => updateWhere(clause.id, "value", e.target.value)}
                    placeholder={clause.operator === "IN" ? "value1, value2, ..." : "Value..."}
                  />
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeWhere(clause.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDER BY and LIMIT */}
      {table && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3" /> Order By
            </label>
            <div className="flex gap-1.5">
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Column..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={orderDir} onValueChange={setOrderDir}>
                <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">ASC</SelectItem>
                  <SelectItem value="DESC">DESC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-24">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Limit</label>
            <Input className="h-8 text-xs" type="number" value={limitVal} onChange={(e) => setLimitVal(e.target.value)} min={1} max={500} />
          </div>
        </div>
      )}

      {/* Build Button */}
      <Button className="h-9 gap-1.5" onClick={onBuild} disabled={!selectedTable}>
        <Play className="h-3.5 w-3.5" /> Run Query
      </Button>
    </div>
  )
}

// --- Result Table Renderer ---
function ResultTable({ result }: { result: QueryResult }) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : []
  const sorted = sortCol
    ? [...result.rows].sort((a, b) => {
        const av = a[sortCol] ?? ""
        const bv = b[sortCol] ?? ""
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))
        return sortAsc ? cmp : -cmp
      })
    : result.rows

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-bold text-muted-foreground w-10 text-center">#</TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="text-[10px] font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  onClick={() => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true) } }}
                >
                  <span className="flex items-center gap-1">
                    {col.replace(/_/g, " ")}
                    {sortCol === col && <ArrowUpDown className="h-2.5 w-2.5" />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="text-[10px] text-muted-foreground/50 text-center tabular-nums">{i + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="py-2 px-3">
                    <AdaptiveCell value={row[col]} colType={result.columnMeta[col] || "string"} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// --- Stat Display ---
function ResultStat({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) return <p className="text-sm text-muted-foreground">No results</p>
  const cols = Object.keys(result.rows[0])
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {result.rows.slice(0, 12).map((row, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            {cols.map((col) => {
              const val = row[col]
              const isNum = typeof val === "number"
              return (
                <div key={col}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{col.replace(/_/g, " ")}</p>
                  <p className={cn("font-bold", isNum ? "text-2xl tabular-nums" : "text-sm")}>{val === null ? <span className="text-muted-foreground/30">--</span> : isNum ? val.toLocaleString() : String(val)}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// --- Cards Display ---
function ResultCards({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) return <p className="text-sm text-muted-foreground">No results</p>
  const cols = Object.keys(result.rows[0])
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {result.rows.map((row, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4 flex flex-col gap-2">
            {cols.map((col) => (
              <div key={col} className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">{col.replace(/_/g, " ")}</span>
                <div className="text-right"><AdaptiveCell value={row[col]} colType={result.columnMeta[col] || "string"} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// --- List Display ---
function ResultList({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) return <p className="text-sm text-muted-foreground">No results</p>
  const cols = Object.keys(result.rows[0])
  const primaryCol = cols[0]
  const secondaryCol = cols[1]
  return (
    <div className="flex flex-col gap-1">
      {result.rows.map((row, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
          <span className="text-[10px] text-muted-foreground/40 tabular-nums w-6 text-center">{i + 1}</span>
          <span className="text-sm font-medium flex-1">{String(row[primaryCol] ?? "")}</span>
          {secondaryCol && (
            <span className="text-xs text-muted-foreground">{String(row[secondaryCol] ?? "")}</span>
          )}
          {cols.slice(2).map((col) => (
            <div key={col} className="hidden lg:block">
              <AdaptiveCell value={row[col]} colType={result.columnMeta[col] || "string"} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// --- Main Page ---
export default function ToolsPage() {
  const { user } = useAuth()
  const { data: schemaData } = useSWR("/api/tools/schema", fetcher)
  const { data: savedData, mutate: mutateSaved } = useSWR("/api/tools/saved", fetcher)

  const tables: TableInfo[] = schemaData?.tables || []
  const savedTools: SavedTool[] = savedData?.tools || []

  // Builder state
  const [selectedTable, setSelectedTable] = useState("")
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([])
  const [orderBy, setOrderBy] = useState("none")
  const [orderDir, setOrderDir] = useState("DESC")
  const [limitVal, setLimitVal] = useState("100")

  // Raw SQL mode
  const [rawMode, setRawMode] = useState(false)
  const [rawQuery, setRawQuery] = useState("")

  // Results state
  const [result, setResult] = useState<QueryResult | null>(null)
  const [executing, setExecuting] = useState(false)
  const [queryError, setQueryError] = useState("")
  const [displayType, setDisplayType] = useState("table")

  // Save dialog state
  const [saving, setSaving] = useState(false)
  const [saveForm, setSaveForm] = useState({ name: "", description: "", icon: "Wrench", color: "chart-1", category: "general" })
  const [showSaveForm, setShowSaveForm] = useState(false)

  // Active tool tab
  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [toolResults, setToolResults] = useState<Record<string, { result: QueryResult; loading: boolean; error: string }>>({})

  // Schema sidebar
  const [schemaSidebarOpen, setSchemaSidebarOpen] = useState(true)
  const [schemaSearch, setSchemaSearch] = useState("")
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  // Tab state: "builder" | tool id
  const [activeTab, setActiveTab] = useState<string>("builder")

  // Build SQL from visual builder
  const buildQuery = useCallback(() => {
    if (!selectedTable) return ""
    const cols = selectedColumns.length > 0 ? selectedColumns.join(", ") : "*"
    let sql = `SELECT ${cols} FROM ${selectedTable}`

    if (whereClauses.length > 0) {
      const parts = whereClauses.map((w, i) => {
        let condition = ""
        if (w.operator === "IS NULL") condition = `${w.column} IS NULL`
        else if (w.operator === "IS NOT NULL") condition = `${w.column} IS NOT NULL`
        else if (w.operator === "LIKE") condition = `LOWER(${w.column}) LIKE '%' || LOWER('${w.value.replace(/'/g, "''")}') || '%'`
        else if (w.operator === "NOT LIKE") condition = `LOWER(${w.column}) NOT LIKE '%' || LOWER('${w.value.replace(/'/g, "''")}') || '%'`
        else if (w.operator === "IN") {
          const vals = w.value.split(",").map((v) => `'${v.trim().replace(/'/g, "''")}'`).join(", ")
          condition = `${w.column} IN (${vals})`
        }
        else condition = `${w.column} ${w.operator} '${w.value.replace(/'/g, "''")}'`
        return i === 0 ? condition : `${w.logicOperator} ${condition}`
      })
      sql += ` WHERE ${parts.join(" ")}`
    }

    if (orderBy && orderBy !== "none") sql += ` ORDER BY ${orderBy} ${orderDir}`
    sql += ` LIMIT ${limitVal || 100}`
    return sql
  }, [selectedTable, selectedColumns, whereClauses, orderBy, orderDir, limitVal])

  // Execute query
  const executeQuery = async (queryStr?: string) => {
    const q = queryStr || (rawMode ? rawQuery : buildQuery())
    if (!q.trim()) { toast.error("No query to execute"); return }
    setExecuting(true)
    setQueryError("")
    setResult(null)
    try {
      const res = await fetch("/api/tools/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (!res.ok) { setQueryError(data.error || "Query failed"); toast.error(data.error || "Query failed") }
      else { setResult(data); toast.success(`${data.rowCount} rows in ${data.duration}ms`) }
    } catch { setQueryError("Network error"); toast.error("Network error") }
    finally { setExecuting(false) }
  }

  // Execute saved tool
  const executeTool = async (tool: SavedTool) => {
    setToolResults((prev) => ({ ...prev, [tool.id]: { result: null as any, loading: true, error: "" } }))
    try {
      const res = await fetch("/api/tools/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: tool.query }),
      })
      const data = await res.json()
      if (!res.ok) setToolResults((prev) => ({ ...prev, [tool.id]: { result: null as any, loading: false, error: data.error || "Failed" } }))
      else setToolResults((prev) => ({ ...prev, [tool.id]: { result: data, loading: false, error: "" } }))
    } catch { setToolResults((prev) => ({ ...prev, [tool.id]: { result: null as any, loading: false, error: "Network error" } })) }
  }

  // Save tool
  const saveTool = async () => {
    if (!saveForm.name.trim()) { toast.error("Name is required"); return }
    const q = rawMode ? rawQuery : buildQuery()
    if (!q.trim()) { toast.error("No query to save"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/tools/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...saveForm, query: q, display_type: displayType, created_by: user?.name || "" }),
      })
      if (res.ok) { toast.success("Tool saved"); mutateSaved(); setShowSaveForm(false); setSaveForm({ name: "", description: "", icon: "Wrench", color: "chart-1", category: "general" }) }
      else toast.error("Failed to save")
    } catch { toast.error("Error saving tool") }
    finally { setSaving(false) }
  }

  // Delete saved tool
  const deleteTool = async (id: string) => {
    if (!confirm("Delete this saved tool?")) return
    await fetch(`/api/tools/saved?id=${id}`, { method: "DELETE" })
    mutateSaved()
    if (activeTab === id) setActiveTab("builder")
    toast.success("Tool deleted")
  }

  // Toggle favorite
  const toggleFavorite = async (tool: SavedTool) => {
    await fetch("/api/tools/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tool.id, is_favorite: !tool.is_favorite }),
    })
    mutateSaved()
  }

  // Copy results
  const copyResults = () => {
    if (!result) return
    const csv = [Object.keys(result.rows[0] || {}).join(","), ...result.rows.map((r) => Object.values(r).map((v) => JSON.stringify(v ?? "")).join(","))].join("\n")
    navigator.clipboard.writeText(csv)
    toast.success("Copied as CSV")
  }

  // Export CSV
  const exportCSV = () => {
    if (!result) return
    const csv = [Object.keys(result.rows[0] || {}).join(","), ...result.rows.map((r) => Object.values(r).map((v) => JSON.stringify(v ?? "")).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "query-results.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const filteredTables = tables.filter((t) => t.name.toLowerCase().includes(schemaSearch.toLowerCase()))

  return (
    <div className="flex flex-col gap-0 h-screen overflow-hidden">
      {/* Page Header */}
      <div className="shrink-0 border-b bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3 max-w-[1600px]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Custom Tools</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Build queries, create reusable tools, and explore your data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setSchemaSidebarOpen(!schemaSidebarOpen)}>
              {schemaSidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
              Schema
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="shrink-0 border-b bg-muted/30 px-6 overflow-x-auto">
        <div className="flex items-center gap-0.5 py-1 max-w-[1600px]">
          <button
            onClick={() => setActiveTab("builder")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === "builder" ? "bg-background shadow-sm text-foreground border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Wrench className="h-3 w-3" /> Query Builder
          </button>
          {savedTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActiveTab(tool.id); if (!toolResults[tool.id]) executeTool(tool) }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all group",
                activeTab === tool.id ? "bg-background shadow-sm text-foreground border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", `bg-${tool.color}`)} />
              {tool.name}
              {tool.is_favorite && <Star className="h-2.5 w-2.5 fill-warning text-warning" />}
              <button
                onClick={(e) => { e.stopPropagation(); deleteTool(tool.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Schema sidebar */}
        {schemaSidebarOpen && (
          <div className="w-60 shrink-0 border-r bg-card/50 overflow-y-auto">
            <div className="p-3 border-b sticky top-0 bg-card/95 backdrop-blur-sm z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input className="h-7 pl-7 text-[11px]" placeholder="Search tables..." value={schemaSearch} onChange={(e) => setSchemaSearch(e.target.value)} />
              </div>
            </div>
            <div className="p-2">
              {filteredTables.map((table) => (
                <div key={table.name} className="mb-0.5">
                  <button
                    onClick={() => setExpandedTables((prev) => { const s = new Set(prev); s.has(table.name) ? s.delete(table.name) : s.add(table.name); return s })}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium hover:bg-muted/50 transition-colors text-left"
                  >
                    {expandedTables.has(table.name) ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <Database className="h-3 w-3 text-chart-1 shrink-0" />
                    <span className="truncate flex-1">{table.name}</span>
                    <Badge variant="outline" className="text-[8px] shrink-0 ml-auto">{table.rowCount}</Badge>
                  </button>
                  {expandedTables.has(table.name) && (
                    <div className="ml-6 mb-1.5">
                      {table.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-default"
                          title={`${col.type}${col.nullable ? " (nullable)" : ""}`}
                        >
                          {columnTypeIcon(col.type)}
                          <span className="truncate">{col.name}</span>
                          <span className="ml-auto text-[8px] text-muted-foreground/50 shrink-0">{col.udtName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px]">
            {/* Query Builder Tab */}
            {activeTab === "builder" && (
              <div className="flex flex-col gap-6">
                {/* Mode toggle */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setRawMode(false)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", !rawMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                    >
                      Visual Builder
                    </button>
                    <button
                      onClick={() => setRawMode(true)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", rawMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                    >
                      Raw SQL
                    </button>
                  </div>
                  {!rawMode && selectedTable && (
                    <Button variant="ghost" size="sm" className="text-[10px] gap-1 text-muted-foreground" onClick={() => { setRawQuery(buildQuery()); setRawMode(true) }}>
                      <Code2 className="h-3 w-3" /> View SQL
                    </Button>
                  )}
                </div>

                {/* Builder or Raw input */}
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    {rawMode ? (
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-medium text-muted-foreground">SQL Query (SELECT only)</label>
                        <Textarea
                          value={rawQuery}
                          onChange={(e) => setRawQuery(e.target.value)}
                          placeholder="SELECT * FROM crew_applications WHERE status = 'approved' LIMIT 25"
                          className="font-mono text-xs min-h-32 resize-y"
                          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) executeQuery() }}
                        />
                        <p className="text-[10px] text-muted-foreground">Press Ctrl+Enter to execute</p>
                      </div>
                    ) : (
                      <QueryBuilder
                        tables={tables} selectedTable={selectedTable} setSelectedTable={setSelectedTable}
                        selectedColumns={selectedColumns} setSelectedColumns={setSelectedColumns}
                        whereClauses={whereClauses} setWhereClauses={setWhereClauses}
                        orderBy={orderBy} setOrderBy={setOrderBy} orderDir={orderDir} setOrderDir={setOrderDir}
                        limitVal={limitVal} setLimitVal={setLimitVal}
                        onBuild={() => executeQuery()}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Execute button (raw mode) */}
                {rawMode && (
                  <Button className="h-9 gap-1.5 self-start" onClick={() => executeQuery()} disabled={executing}>
                    {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Execute Query
                  </Button>
                )}

                {/* Error */}
                {queryError && (
                  <Card className="border-destructive/30 bg-destructive/[0.03]">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Query Error</p>
                        <p className="text-xs text-destructive/70 mt-1 font-mono">{queryError}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Loading */}
                {executing && (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Executing query...</p>
                    </div>
                  </div>
                )}

                {/* Results */}
                {result && !executing && (
                  <div className="flex flex-col gap-4">
                    {/* Result toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs gap-1">
                          <BarChart3 className="h-3 w-3" /> {result.rowCount} rows
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" /> {result.duration}ms
                        </Badge>
                        {result.truncated && (
                          <Badge variant="outline" className="text-xs text-warning border-warning/25">Truncated to 500 rows</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Display type picker */}
                        <div className="flex items-center bg-muted rounded-lg p-0.5">
                          {DISPLAY_TYPES.map((dt) => {
                            const Icon = dt.icon
                            return (
                              <button
                                key={dt.value}
                                onClick={() => setDisplayType(dt.value)}
                                className={cn("p-1.5 rounded-md transition-all", displayType === dt.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                title={dt.label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </button>
                            )
                          })}
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={copyResults}><Copy className="h-3 w-3" /> Copy</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={exportCSV}><Download className="h-3 w-3" /> CSV</Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowSaveForm(true)}><Save className="h-3 w-3" /> Save as Tool</Button>
                      </div>
                    </div>

                    {/* Results display */}
                    {displayType === "table" && <ResultTable result={result} />}
                    {displayType === "stat" && <ResultStat result={result} />}
                    {displayType === "cards" && <ResultCards result={result} />}
                    {displayType === "list" && <ResultList result={result} />}

                    {/* Generated SQL */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-1">
                        <Code2 className="h-3 w-3" /> View executed SQL
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg bg-muted font-mono text-[11px] overflow-auto whitespace-pre-wrap">{result.query}</pre>
                    </details>
                  </div>
                )}

                {/* Save dialog */}
                {showSaveForm && (
                  <Card className="border-primary/20 bg-primary/[0.02]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Save as Custom Tool</CardTitle>
                      <CardDescription className="text-xs">Create a reusable tool from this query</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tool Name</label>
                          <Input className="h-8 text-xs" value={saveForm.name} onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })} placeholder="e.g. Active Crew Count" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                          <Select value={saveForm.category} onValueChange={(v) => setSaveForm({ ...saveForm, category: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                        <Input className="h-8 text-xs" value={saveForm.description} onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })} placeholder="Brief description..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
                        <div className="flex gap-1.5">
                          {TOOL_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setSaveForm({ ...saveForm, color: c })}
                              className={cn("h-6 w-6 rounded-full border-2 transition-all", `bg-${c}`, saveForm.color === c ? "border-foreground scale-110" : "border-transparent")}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="h-8 text-xs gap-1" onClick={saveTool} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Tool
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowSaveForm(false)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Saved Tool Tabs */}
            {activeTab !== "builder" && (() => {
              const tool = savedTools.find((t) => t.id === activeTab)
              if (!tool) return null
              const tr = toolResults[tool.id]

              return (
                <div className="flex flex-col gap-5">
                  {/* Tool header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", `bg-${tool.color}/15`)}>
                        <Wrench className={cn("h-5 w-5", `text-${tool.color}`)} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight">{tool.name}</h2>
                        {tool.description && <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{tool.category}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorite(tool)}>
                        <Star className={cn("h-3.5 w-3.5", tool.is_favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => executeTool(tool)}>
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setRawQuery(tool.query); setRawMode(true); setActiveTab("builder") }}>
                        <Pencil className="h-3 w-3" /> Edit Query
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => deleteTool(tool.id)}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Tool query */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-1">
                      <Code2 className="h-3 w-3" /> View SQL query
                    </summary>
                    <pre className="mt-2 p-3 rounded-lg bg-muted font-mono text-[11px] overflow-auto whitespace-pre-wrap">{tool.query}</pre>
                  </details>

                  {/* Tool results */}
                  {tr?.loading && (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Running query...</p>
                      </div>
                    </div>
                  )}
                  {tr?.error && (
                    <Card className="border-destructive/30 bg-destructive/[0.03]">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Query Error</p>
                          <p className="text-xs text-destructive/70 mt-1 font-mono">{tr.error}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {tr?.result && !tr.loading && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> {tr.result.rowCount} rows</Badge>
                          <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> {tr.result.duration}ms</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-muted rounded-lg p-0.5">
                            {DISPLAY_TYPES.map((dt) => {
                              const Icon = dt.icon
                              return (
                                <button
                                  key={dt.value}
                                  onClick={() => setDisplayType(dt.value)}
                                  className={cn("p-1.5 rounded-md transition-all", displayType === dt.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                  title={dt.label}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      {displayType === "table" && <ResultTable result={tr.result} />}
                      {displayType === "stat" && <ResultStat result={tr.result} />}
                      {displayType === "cards" && <ResultCards result={tr.result} />}
                      {displayType === "list" && <ResultList result={tr.result} />}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
