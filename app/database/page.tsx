"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  Database, Table2, Eye, ShieldCheck, Plus, MoreVertical, Pencil, Eraser,
  Trash2, AlertTriangle, Loader2, ServerCog, HardDrive, Rows3,
} from "lucide-react"
import { TableList } from "@/components/database/table-list"
import { DataGrid } from "@/components/database/data-grid"
import { TableStructure } from "@/components/database/table-structure"
import { SqlRunner } from "@/components/database/sql-runner"
import { CreateTableDialog } from "@/components/database/create-table-dialog"
import type { TableInfo } from "@/components/database/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

async function post(body: any) {
  const res = await fetch("/api/admin/database", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-lg font-bold leading-tight">{value}</span>
      </div>
    </div>
  )
}

export default function DatabasePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "sysadmin"

  const { data: tablesData, mutate: mutateTables } = useSWR<{ tables: TableInfo[] }>(
    isAdmin ? "/api/admin/database?resource=tables" : null, fetcher,
  )
  const { data: overview, mutate: mutateOverview } = useSWR(
    isAdmin ? "/api/admin/database?resource=overview" : null, fetcher,
  )

  const tables = tablesData?.tables ?? []
  const [selected, setSelected] = useState<TableInfo | null>(null)
  const [tab, setTab] = useState("data")
  const [createOpen, setCreateOpen] = useState(false)

  // table-level action dialogs
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [truncateOpen, setTruncateOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Keep the selected table object in sync with refreshed data (rows/rls).
  useEffect(() => {
    if (!selected) return
    const fresh = tables.find((t) => t.schema === selected.schema && t.name === selected.name)
    if (fresh && fresh !== selected) setSelected(fresh)
    if (!fresh && tables.length) setSelected(null)
  }, [tables]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = () => { mutateTables(); mutateOverview() }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Administrator access required</h1>
        <p className="text-sm text-muted-foreground">The Database Manager is restricted to system administrators.</p>
      </div>
    )
  }

  const handleRename = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await post({ action: "rename_table", schema: selected.schema, table: selected.name, newName: renameValue })
      toast.success("Table renamed")
      setRenameOpen(false)
      setSelected(null)
      refreshAll()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const handleTruncate = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await post({ action: "truncate_table", schema: selected.schema, table: selected.name })
      toast.success("Table truncated")
      setTruncateOpen(false)
      refreshAll()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const handleDrop = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await post({ action: "drop_table", schema: selected.schema, table: selected.name })
      toast.success("Table dropped")
      setDropOpen(false)
      setSelected(null)
      refreshAll()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="mr-auto">
            <h1 className="text-xl font-bold leading-tight">Database Manager</h1>
            <p className="text-xs text-muted-foreground">Browse, edit and administer every table in your database</p>
          </div>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New table
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Table2} label="Tables" value={String(overview?.tableCount ?? tables.filter(t => t.type === "table").length)} tint="bg-chart-1/15 text-chart-1" />
          <StatCard icon={Eye} label="Views" value={String(overview?.viewCount ?? tables.filter(t => t.type === "view").length)} tint="bg-chart-2/15 text-chart-2" />
          <StatCard icon={Rows3} label="Total rows" value={(overview?.totalRows ?? 0).toLocaleString()} tint="bg-chart-3/15 text-chart-3" />
          <StatCard icon={HardDrive} label="DB size" value={overview?.dbSize ?? "—"} tint="bg-chart-4/15 text-chart-4" />
        </div>
      </header>

      {/* Body: split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: table browser */}
        <aside className="w-64 shrink-0 border-r border-border flex flex-col min-h-0">
          <TableList tables={tables} selected={selected} onSelect={(t) => { setSelected(t); setTab("data") }} />
        </aside>

        {/* Right: content */}
        <section className="flex-1 min-w-0 flex flex-col min-h-0">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <ServerCog className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Select a table to begin</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Choose a table from the list to browse and edit its data, manage its
                  structure, or run raw SQL against your database.
                </p>
              </div>
              <Tabs value="sql-only" className="w-full max-w-3xl mt-2">
                <p className="mb-2 text-left text-xs font-medium text-muted-foreground">Quick SQL console</p>
                <SqlRunner />
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 flex-1">
              {/* table header bar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
                {selected.type === "view"
                  ? <Eye className="h-4 w-4 text-chart-2" />
                  : <Table2 className="h-4 w-4 text-primary" />}
                <h2 className="font-mono text-sm font-semibold">{selected.schema}.{selected.name}</h2>
                <Badge variant="secondary" className="text-[10px]">{selected.type}</Badge>
                {selected.has_rls && (
                  <Badge variant="outline" className="gap-1 text-[10px] text-success border-success/30">
                    <ShieldCheck className="h-3 w-3" /> RLS
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{selected.rows.toLocaleString()} rows · {selected.size}</span>
                <div className="flex-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => { setRenameValue(selected.name); setRenameOpen(true) }}
                      disabled={selected.type === "view"}
                    >
                      <Pencil className="h-4 w-4" /> Rename table
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTruncateOpen(true)}
                      disabled={selected.type === "view"}
                    >
                      <Eraser className="h-4 w-4" /> Truncate (empty)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDropOpen(true)}
                      disabled={selected.type === "view"}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Drop table
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* tabs */}
              <Tabs value={tab} onValueChange={setTab} className="flex flex-col min-h-0 flex-1">
                <div className="px-6 pt-3">
                  <TabsList>
                    <TabsTrigger value="data">Data</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="sql">SQL</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="data" className="flex-1 min-h-0 px-6 pb-6 pt-3 data-[state=inactive]:hidden">
                  <DataGrid key={`${selected.schema}.${selected.name}`} schema={selected.schema} table={selected.name} />
                </TabsContent>

                <TabsContent value="structure" className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-3">
                  <TableStructure key={`${selected.schema}.${selected.name}`} table={selected} onChanged={refreshAll} />
                </TabsContent>

                <TabsContent value="sql" className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-3">
                  <SqlRunner initialQuery={`SELECT * FROM ${selected.name} LIMIT 50;`} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </section>
      </div>

      {/* Create table */}
      <CreateTableDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(name) => { refreshAll(); setTimeout(() => { const t = tables.find(x => x.name === name); if (t) setSelected(t) }, 600) }}
      />

      {/* Rename table */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename table</DialogTitle>
            <DialogDescription>Rename "{selected?.name}".</DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="font-mono h-9" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleRename} disabled={busy || !renameValue}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Truncate confirm */}
      <AlertDialog open={truncateOpen} onOpenChange={setTruncateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Truncate "{selected?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes ALL rows in the table but keeps its structure. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleTruncate() }}
              disabled={busy}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Truncate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drop confirm */}
      <AlertDialog open={dropOpen} onOpenChange={setDropOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Drop "{selected?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the table, all its data and dependent objects (CASCADE). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDrop() }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Drop table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
