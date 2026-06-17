"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  KeyRound, Link2, Plus, Trash2, Pencil, ShieldCheck, Loader2, Eraser, AlertTriangle,
} from "lucide-react"
import { COLUMN_TYPE_OPTIONS } from "./constants"
import type { ColumnInfo, TableInfo } from "./types"

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

interface Props {
  table: TableInfo
  onChanged: () => void // refresh table list (counts/rls)
}

export function TableStructure({ table, onChanged }: Props) {
  const { schema, name } = table
  const colKey = `/api/admin/database?resource=columns&schema=${schema}&table=${name}`
  const { data, mutate, isLoading } = useSWR<{ columns: ColumnInfo[] }>(colKey, fetcher)
  const columns = data?.columns ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [newCol, setNewCol] = useState({ name: "", type: "text", nullable: true })
  const [busy, setBusy] = useState(false)

  const [renameCol, setRenameCol] = useState<ColumnInfo | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [dropCol, setDropCol] = useState<ColumnInfo | null>(null)
  const [rls, setRls] = useState(table.has_rls)

  const refresh = () => { mutate(); onChanged() }

  const handleAdd = async () => {
    setBusy(true)
    try {
      await post({ action: "add_column", schema, table: name, column: newCol })
      toast.success(`Column "${newCol.name}" added`)
      setAddOpen(false)
      setNewCol({ name: "", type: "text", nullable: true })
      refresh()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const handleRename = async () => {
    if (!renameCol) return
    setBusy(true)
    try {
      await post({ action: "rename_column", schema, table: name, column: renameCol.name, newName: renameValue })
      toast.success("Column renamed")
      setRenameCol(null)
      refresh()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const handleDrop = async () => {
    if (!dropCol) return
    setBusy(true)
    try {
      await post({ action: "drop_column", schema, table: name, column: dropCol.name })
      toast.success("Column dropped")
      setDropCol(null)
      refresh()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const toggleNull = async (col: ColumnInfo) => {
    try {
      await post({ action: "alter_column_null", schema, table: name, column: col.name, nullable: !col.is_nullable })
      toast.success(`"${col.name}" is now ${!col.is_nullable ? "nullable" : "NOT NULL"}`)
      refresh()
    } catch (e: any) { toast.error(e.message) }
  }

  const toggleRls = async (enabled: boolean) => {
    setRls(enabled)
    try {
      await post({ action: "set_rls", schema, table: name, enabled })
      toast.success(`Row Level Security ${enabled ? "enabled" : "disabled"}`)
      onChanged()
    } catch (e: any) {
      setRls(!enabled)
      toast.error(e.message)
    }
  }

  const isView = table.type === "view"

  return (
    <div className="flex flex-col gap-4">
      {/* Security + actions bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={rls ? "h-4 w-4 text-success" : "h-4 w-4 text-muted-foreground"} />
          <div className="flex flex-col">
            <span className="text-xs font-medium">Row Level Security</span>
            <span className="text-[11px] text-muted-foreground">Restrict row access via policies</span>
          </div>
          <Switch checked={rls} onCheckedChange={toggleRls} disabled={isView} className="ml-2" />
        </div>
        <div className="flex-1" />
        {!isView && (
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add column
          </Button>
        )}
      </div>

      {/* Columns table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead>Column</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Nullable</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Constraints</TableHead>
              {!isView && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : columns.map((c) => (
              <TableRow key={c.name}>
                <TableCell className="font-mono text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {c.is_primary && <KeyRound className="h-3 w-3 text-warning" />}
                    {c.foreign_key && <Link2 className="h-3 w-3 text-chart-2" />}
                    {c.name}
                  </span>
                </TableCell>
                <TableCell><Badge variant="outline" className="font-mono text-[10px]">{c.udt_name}</Badge></TableCell>
                <TableCell>
                  {isView ? (
                    <span className="text-xs text-muted-foreground">{c.is_nullable ? "yes" : "no"}</span>
                  ) : (
                    <Switch
                      checked={c.is_nullable}
                      onCheckedChange={() => toggleNull(c)}
                      disabled={c.is_primary}
                      className="scale-90"
                    />
                  )}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[160px] truncate" title={c.default ?? ""}>
                  {c.default ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.is_primary && <Badge className="text-[10px] bg-warning/15 text-warning border-warning/25" variant="outline">PK</Badge>}
                    {c.is_unique && !c.is_primary && <Badge variant="outline" className="text-[10px]">unique</Badge>}
                    {c.foreign_key && (
                      <Badge variant="outline" className="text-[10px] font-mono text-chart-2 border-chart-2/30">
                        → {c.foreign_key.table}.{c.foreign_key.column}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {!isView && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setRenameCol(c); setRenameValue(c.name) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => setDropCol(c)} disabled={c.is_primary}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add column dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add column to {name}</DialogTitle>
            <DialogDescription>Define a new column for this table.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Column name</Label>
              <Input
                value={newCol.name}
                onChange={(e) => setNewCol((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. nickname"
                className="font-mono h-9"
              />
              <span className="text-[11px] text-muted-foreground">Lowercase letters, numbers and underscores only.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={newCol.type} onValueChange={(v) => setNewCol((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newCol.nullable} onCheckedChange={(v) => setNewCol((p) => ({ ...p, nullable: v }))} />
              <Label className="text-xs">Nullable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleAdd} disabled={busy || !newCol.name}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename column dialog */}
      <Dialog open={!!renameCol} onOpenChange={(o) => !o && setRenameCol(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename column</DialogTitle>
            <DialogDescription>Rename "{renameCol?.name}" in {name}.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="font-mono h-9"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCol(null)} disabled={busy}>Cancel</Button>
            <Button onClick={handleRename} disabled={busy || !renameValue}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop column confirm */}
      <AlertDialog open={!!dropCol} onOpenChange={(o) => !o && setDropCol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Drop column "{dropCol?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the column and all its data from {name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDrop() }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Drop column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
