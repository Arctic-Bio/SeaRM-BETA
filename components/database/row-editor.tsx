"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, KeyRound, Link2 } from "lucide-react"
import type { ColumnInfo } from "./types"

interface RowEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schema: string
  table: string
  columns: ColumnInfo[]
  keyColumns: string[]
  row: Record<string, any> | null // null = creating a new row
  onSaved: () => void
}

function isJsonType(c: ColumnInfo) {
  return c.udt_name === "jsonb" || c.udt_name === "json"
}
function isBoolType(c: ColumnInfo) {
  return c.udt_name === "bool"
}
function isLongText(c: ColumnInfo) {
  return c.udt_name === "text" || isJsonType(c)
}

export function RowEditor({
  open, onOpenChange, schema, table, columns, keyColumns, row, onSaved,
}: RowEditorProps) {
  const isNew = row === null
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const init: Record<string, any> = {}
    for (const c of columns) {
      let v = row ? row[c.name] : ""
      if (v != null && isJsonType(c) && typeof v === "object") {
        v = JSON.stringify(v, null, 2)
      }
      init[c.name] = v ?? (isBoolType(c) ? false : "")
    }
    setValues(init)
  }, [open, row, columns])

  const setVal = (name: string, value: any) => setValues((p) => ({ ...p, [name]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      // Validate JSON fields up front for a friendlier error.
      for (const c of columns) {
        if (isJsonType(c) && values[c.name]) {
          try {
            JSON.parse(values[c.name])
          } catch {
            throw new Error(`Invalid JSON in field "${c.name}"`)
          }
        }
      }

      let res: Response
      if (isNew) {
        res = await fetch(`/api/admin/database/${table}?schema=${schema}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schema, values }),
        })
      } else {
        const key: Record<string, any> = {}
        for (const k of keyColumns) key[k] = row![k]
        res = await fetch(`/api/admin/database/${table}?schema=${schema}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schema, key, values }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast.success(isNew ? "Row created" : "Row updated")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">
            {isNew ? "Insert row" : "Edit row"} · {table}
          </DialogTitle>
          <DialogDescription>
            {isNew ? "Create a new record in" : "Modify the selected record in"} {schema}.{table}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {columns.map((c) => {
            const isKey = keyColumns.includes(c.name)
            const disabled = !isNew && isKey && c.is_identity
            return (
              <div key={c.name} className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-2 text-xs font-medium">
                  <span className="font-mono">{c.name}</span>
                  {c.is_primary && <KeyRound className="h-3 w-3 text-warning" />}
                  {c.foreign_key && <Link2 className="h-3 w-3 text-chart-2" />}
                  <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                    {c.udt_name}
                  </Badge>
                  {!c.is_nullable && <span className="text-destructive text-[10px]">required</span>}
                </Label>

                {isBoolType(c) ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={values[c.name] === true || values[c.name] === "true"}
                      onCheckedChange={(v) => setVal(c.name, v)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {values[c.name] === true || values[c.name] === "true" ? "true" : "false"}
                    </span>
                  </div>
                ) : isLongText(c) ? (
                  <Textarea
                    value={values[c.name] ?? ""}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    placeholder={c.default ? `default: ${c.default}` : isJsonType(c) ? "{}" : ""}
                    rows={isJsonType(c) ? 4 : 2}
                    className="font-mono text-xs"
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    value={values[c.name] ?? ""}
                    onChange={(e) => setVal(c.name, e.target.value)}
                    placeholder={c.default ? `default: ${c.default}` : c.is_nullable ? "NULL" : ""}
                    className="font-mono text-xs h-9"
                    disabled={disabled}
                  />
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNew ? "Insert" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
