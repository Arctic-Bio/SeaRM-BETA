"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search, Plus, Trash2, Pencil, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, KeyRound, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RowEditor } from "./row-editor"
import type { RowsResponse } from "./types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatCell(value: any): { text: string; muted?: boolean } {
  if (value === null || value === undefined) return { text: "NULL", muted: true }
  if (typeof value === "boolean") return { text: value ? "true" : "false" }
  if (typeof value === "object") return { text: JSON.stringify(value) }
  const s = String(value)
  return { text: s }
}

export function DataGrid({ schema, table }: { schema: string; table: string }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("")
  const [dir, setDir] = useState<"asc" | "desc">("asc")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const qs = new URLSearchParams({
    schema, page: String(page), pageSize: String(pageSize),
    search, sort, dir,
  }).toString()
  const key = `/api/admin/database/${table}?${qs}`
  const { data, error, isLoading, mutate } = useSWR<RowsResponse>(key, fetcher, {
    keepPreviousData: true,
  })

  const columns = data?.columns ?? []
  const rows = data?.rows ?? []
  const keyColumns = data?.keyColumns ?? []
  const isView = data?.kind === "view"

  const allSelected = rows.length > 0 && selected.size === rows.length
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((_, i) => i)))
  }
  const toggleRow = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleSort = (col: string) => {
    if (sort === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSort(col)
      setDir("asc")
    }
    setPage(1)
  }

  const applySearch = () => {
    setSearch(searchInput)
    setPage(1)
    setSelected(new Set())
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const keys = Array.from(selected).map((i) => {
        const row = rows[i]
        const k: Record<string, any> = {}
        for (const kc of keyColumns) k[kc] = row[kc]
        return k
      })
      const res = await fetch(`/api/admin/database/${table}?schema=${schema}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, keys }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Delete failed")
      toast.success(`Deleted ${result.deleted} row(s)`)
      setSelected(new Set())
      setConfirmDelete(false)
      mutate()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const openCreate = () => {
    setEditingRow(null)
    setEditorOpen(true)
  }
  const openEdit = (row: Record<string, any>) => {
    setEditingRow(row)
    setEditorOpen(true)
  }

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search all text columns..."
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={applySearch} className="h-9">
          Search
        </Button>
        {search && (
          <Button
            variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1) }}
          >
            Clear
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mutate()}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" className="h-9 gap-1.5" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
          </Button>
        )}
        {!isView && (
          <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Insert row
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
        {error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {error.message || "Failed to load rows"}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="hover:bg-transparent">
                {!isView && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                {!isView && <TableHead className="w-16 text-center">Edit</TableHead>}
                {columns.map((c) => (
                  <TableHead
                    key={c.name}
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort(c.name)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c.is_primary && <KeyRound className="h-3 w-3 text-warning" />}
                      <span className="font-mono text-xs font-semibold">{c.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">{c.udt_name}</span>
                      {sort === c.name && (dir === "asc"
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />)}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} className="h-32 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} className="h-32 text-center text-sm text-muted-foreground">
                    No rows found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => (
                  <TableRow key={i} data-state={selected.has(i) ? "selected" : undefined}>
                    {!isView && (
                      <TableCell className="w-10">
                        <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleRow(i)} aria-label="Select row" />
                      </TableCell>
                    )}
                    {!isView && (
                      <TableCell className="w-16 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((c) => {
                      const { text, muted } = formatCell(row[c.name])
                      return (
                        <TableCell key={c.name} className="max-w-[320px]">
                          <div
                            className={cn(
                              "truncate font-mono text-xs",
                              muted && "text-muted-foreground/50 italic",
                            )}
                            title={muted ? "NULL" : text}
                          >
                            {typeof row[c.name] === "boolean" ? (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {text}
                              </Badge>
                            ) : text}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer / pagination */}
      <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
        <span>
          {total.toLocaleString()} row{total === 1 ? "" : "s"}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger className="h-7 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <span>Page {page} of {totalPages}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-7 w-7"
            disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editorOpen && (
        <RowEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          schema={schema}
          table={table}
          columns={columns}
          keyColumns={keyColumns}
          row={editingRow}
          onSaved={() => mutate()}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} row(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected rows from {schema}.{table}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
