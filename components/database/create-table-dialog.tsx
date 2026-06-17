"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2, KeyRound } from "lucide-react"
import { COLUMN_TYPE_OPTIONS } from "./constants"

interface NewColumn {
  name: string
  type: string
  nullable: boolean
  primary: boolean
}

const DEFAULT_COLUMNS: NewColumn[] = [
  { name: "id", type: "uuid", nullable: false, primary: true },
  { name: "created_at", type: "timestamptz", nullable: false, primary: false },
]

export function CreateTableDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [columns, setColumns] = useState<NewColumn[]>(DEFAULT_COLUMNS)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName("")
    setColumns(DEFAULT_COLUMNS)
  }

  const addColumn = () =>
    setColumns((p) => [...p, { name: "", type: "text", nullable: true, primary: false }])

  const removeColumn = (i: number) =>
    setColumns((p) => p.filter((_, idx) => idx !== i))

  const updateColumn = (i: number, patch: Partial<NewColumn>) =>
    setColumns((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const handleCreate = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_table", name, columns }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Create failed")
      toast.success(`Table "${name}" created`)
      onCreated(name)
      onOpenChange(false)
      reset()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new table</DialogTitle>
          <DialogDescription>Define a table in the public schema with its columns.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Table name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. crew_notes"
              className="font-mono h-9 max-w-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Columns</Label>
              <Button variant="outline" size="sm" className="h-7 gap-1" onClick={addColumn}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {/* header */}
              <div className="grid grid-cols-[1fr_140px_70px_70px_36px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Name</span>
                <span>Type</span>
                <span className="text-center">Null</span>
                <span className="text-center">PK</span>
                <span />
              </div>
              {columns.map((col, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_70px_70px_36px] gap-2 items-center">
                  <Input
                    value={col.name}
                    onChange={(e) => updateColumn(i, { name: e.target.value })}
                    placeholder="column_name"
                    className="font-mono h-8 text-xs"
                  />
                  <Select value={col.type} onValueChange={(v) => updateColumn(i, { type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-center">
                    <Switch
                      checked={col.nullable && !col.primary}
                      disabled={col.primary}
                      onCheckedChange={(v) => updateColumn(i, { nullable: v })}
                      className="scale-90"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={col.primary}
                      onCheckedChange={(v) => updateColumn(i, { primary: v, nullable: v ? false : col.nullable })}
                      className="scale-90"
                    />
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => removeColumn(i)}
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <KeyRound className="h-3 w-3 text-warning" />
              A uuid primary key auto-generates with gen_random_uuid().
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy || !name || columns.some((c) => !c.name)}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
