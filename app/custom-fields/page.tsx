"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import {
  Settings2, Plus, Trash2, Pencil, AlertCircle, GripVertical,
  Users, Ship, Compass, Briefcase, Receipt, AlertTriangle,
  Type, Hash, Calendar, ToggleLeft, ChevronDown, ListChecks,
  Mail, Phone, Link2, FileText, DollarSign, AlignLeft,
  Layers, CheckCircle2, XCircle, Copy,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ENTITY_TYPES = [
  { value: "crew", label: "Crew Members", icon: Users, color: "text-chart-1", bg: "bg-chart-1/10", border: "border-chart-1/30" },
  { value: "ship", label: "Ships", icon: Ship, color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/30" },
  { value: "voyage", label: "Voyages", icon: Compass, color: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/30" },
  { value: "position", label: "Positions", icon: Briefcase, color: "text-chart-4", bg: "bg-chart-4/10", border: "border-chart-4/30" },
  { value: "invoice", label: "Invoices", icon: Receipt, color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30" },
  { value: "incident", label: "Incidents", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
] as const

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type, desc: "Short text input" },
  { value: "textarea", label: "Long Text", icon: AlignLeft, desc: "Multi-line text" },
  { value: "number", label: "Number", icon: Hash, desc: "Numeric value" },
  { value: "currency", label: "Currency", icon: DollarSign, desc: "Monetary amount" },
  { value: "date", label: "Date", icon: Calendar, desc: "Date picker" },
  { value: "boolean", label: "Toggle", icon: ToggleLeft, desc: "Yes/No switch" },
  { value: "select", label: "Dropdown", icon: ChevronDown, desc: "Single selection" },
  { value: "multi_select", label: "Multi-select", icon: ListChecks, desc: "Multiple options" },
  { value: "email", label: "Email", icon: Mail, desc: "Email address" },
  { value: "phone", label: "Phone", icon: Phone, desc: "Phone number" },
  { value: "url", label: "URL", icon: Link2, desc: "Web link" },
  { value: "file", label: "File", icon: FileText, desc: "File attachment" },
] as const

const FIELD_TYPE_ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  FIELD_TYPES.map(ft => [ft.value, ft.icon])
)

const DEFAULT_FORM = {
  field_name: "", field_key: "", field_type: "text", description: "",
  placeholder: "", is_required: false, options: [] as string[], default_value: "",
  display_order: 0, group_name: "General",
}

export default function CustomFieldsPage() {
  const { user } = useAuth()

  const [selectedEntity, setSelectedEntity] = useState("crew")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingField, setEditingField] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [formData, setFormData] = useState({ ...DEFAULT_FORM })

  const { data: fields, mutate } = useSWR(
    `/api/custom-fields?endpoint=definitions&entity_type=${selectedEntity}`, fetcher
  )

  const fieldList = Array.isArray(fields) ? fields : []
  const entityInfo = ENTITY_TYPES.find(e => e.value === selectedEntity)!
  const EntityIcon = entityInfo.icon

  // Group fields for stats
  const activeCount = fieldList.filter((f: any) => f.is_active !== false).length
  const requiredCount = fieldList.filter((f: any) => f.is_required).length
  const groups = [...new Set(fieldList.map((f: any) => f.group_name || "General"))]

  if (!user || user.role !== "sysadmin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive/60 mb-4" />
            <p className="text-sm text-muted-foreground">Access denied. Sysadmin only.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openCreate = () => {
    setEditingField(null)
    setFormData({ ...DEFAULT_FORM })
    setIsCreateOpen(true)
  }

  const openEdit = (field: any) => {
    setEditingField(field)
    setFormData({
      field_name: field.field_name,
      field_key: field.field_key,
      field_type: field.field_type,
      description: field.description || "",
      placeholder: field.placeholder || "",
      is_required: field.is_required,
      options: Array.isArray(field.options) ? field.options : [],
      default_value: field.default_value || "",
      display_order: field.display_order || 0,
      group_name: field.group_name || "General",
    })
    setIsCreateOpen(true)
  }

  const handleSave = async () => {
    if (!formData.field_name || !formData.field_key) {
      toast.error("Field name and key are required")
      return
    }
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingField ? "update_definition" : "create_definition",
          id: editingField?.id,
          entity_type: selectedEntity,
          ...formData,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save")
      }
      toast.success(editingField ? "Field updated" : "Field created")
      setIsCreateOpen(false)
      setEditingField(null)
      setFormData({ ...DEFAULT_FORM })
      await mutate()
    } catch (err: any) {
      toast.error(err.message || "Failed to save field")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_definition", id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Field deleted")
      setDeleteTarget(null)
      await mutate()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete field")
    }
  }

  const autoKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Custom Fields</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure custom data fields for crew, ships, voyages, and more
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>

      {/* Entity Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ENTITY_TYPES.map(entity => {
          const Icon = entity.icon
          const isSelected = selectedEntity === entity.value
          const entityFields = fieldList.length // only current entity loaded
          return (
            <button
              key={entity.value}
              onClick={() => setSelectedEntity(entity.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                isSelected
                  ? `${entity.bg} ${entity.border} ring-1 ring-offset-1 ring-offset-background`
                  : "border-border bg-card hover:bg-muted/50"
              )}
              style={isSelected ? { ringColor: "currentColor" } : undefined}
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isSelected ? entity.bg : "bg-muted"
              )}>
                <Icon className={cn("h-5 w-5", isSelected ? entity.color : "text-muted-foreground")} />
              </div>
              <span className={cn(
                "text-xs font-medium",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {entity.label}
              </span>
              {isSelected && (
                <div className={cn("absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-background", entity.color.replace("text-", "bg-"))}>
                  {entityFields}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Fields</p>
            <p className="text-2xl font-bold">{fieldList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Required</p>
            <p className="text-2xl font-bold text-warning">{requiredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Groups</p>
            <p className="text-2xl font-bold">{groups.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fields Table */}
      {fieldList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className={cn("mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl", entityInfo.bg)}>
              <EntityIcon className={cn("h-7 w-7", entityInfo.color)} />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No custom fields yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add custom fields to track additional {entityInfo.label.toLowerCase()} data
            </p>
            <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create First Field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EntityIcon className={cn("h-5 w-5", entityInfo.color)} />
                <CardTitle className="text-base">{entityInfo.label} Fields</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">{fieldList.length} field{fieldList.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs pl-6">Field Name</TableHead>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Group</TableHead>
                  <TableHead className="text-xs text-center">Required</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-center">Order</TableHead>
                  <TableHead className="text-xs text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldList.map((field: any) => {
                  const FieldIcon = FIELD_TYPE_ICON_MAP[field.field_type] || Type
                  return (
                    <TableRow key={field.id} className="group">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", entityInfo.bg)}>
                            <FieldIcon className={cn("h-3.5 w-3.5", entityInfo.color)} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{field.field_name}</p>
                            {field.description && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-48">{field.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {field.field_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <FieldIcon className="h-2.5 w-2.5" />
                          {FIELD_TYPES.find(ft => ft.value === field.field_type)?.label || field.field_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{field.group_name || "General"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {field.is_required ? (
                          <CheckCircle2 className="h-4 w-4 text-warning mx-auto" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.is_active !== false ? (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/25">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground font-mono">{field.display_order}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(field)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const clone = { ...field }
                              delete clone.id
                              setEditingField(null)
                              setFormData({
                                ...DEFAULT_FORM,
                                ...clone,
                                field_name: `${clone.field_name} (Copy)`,
                                field_key: `${clone.field_key}_copy`,
                                options: Array.isArray(clone.options) ? clone.options : [],
                              })
                              setIsCreateOpen(true)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(field)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", entityInfo.bg)}>
                <EntityIcon className={cn("h-4 w-4", entityInfo.color)} />
              </div>
              {editingField ? "Edit" : "Create"} Custom Field
            </DialogTitle>
            <DialogDescription>
              {editingField ? "Update this" : "Add a new"} custom field for {entityInfo.label}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name & Key */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Field Name *</label>
                <Input
                  value={formData.field_name}
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData(f => ({
                      ...f,
                      field_name: name,
                      ...(!editingField ? { field_key: autoKey(name) } : {}),
                    }))
                  }}
                  placeholder="e.g., Flag State"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Field Key *</label>
                <Input
                  value={formData.field_key}
                  onChange={(e) => setFormData(f => ({ ...f, field_key: autoKey(e.target.value) }))}
                  placeholder="e.g., flag_state"
                  disabled={!!editingField}
                  className={editingField ? "opacity-60" : ""}
                />
              </div>
            </div>

            {/* Field Type Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Field Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {FIELD_TYPES.map(ft => {
                  const Icon = ft.icon
                  const isSelected = formData.field_type === ft.value
                  return (
                    <button
                      key={ft.value}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, field_type: ft.value }))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                        isSelected
                          ? `${entityInfo.bg} ${entityInfo.border} ring-1 ring-offset-1 ring-offset-background`
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isSelected ? entityInfo.color : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className={cn("text-xs font-medium truncate", isSelected ? "text-foreground" : "text-muted-foreground")}>{ft.label}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description & Placeholder */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Help text shown to users"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Placeholder</label>
                <Input
                  value={formData.placeholder}
                  onChange={(e) => setFormData(f => ({ ...f, placeholder: e.target.value }))}
                  placeholder="Input hint text"
                />
              </div>
            </div>

            {/* Group & Order */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group</label>
                <Input
                  value={formData.group_name}
                  onChange={(e) => setFormData(f => ({ ...f, group_name: e.target.value }))}
                  placeholder="e.g., Compliance, Personal"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Order</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Options for select / multi_select */}
            {["select", "multi_select"].includes(formData.field_type) && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <label className="text-xs font-medium text-muted-foreground block">Dropdown Options</label>
                <p className="text-[10px] text-muted-foreground">Enter comma-separated values for the dropdown menu</p>
                <Input
                  value={formData.options.join(", ")}
                  onChange={(e) => setFormData(f => ({
                    ...f,
                    options: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                  }))}
                  placeholder="Option 1, Option 2, Option 3"
                />
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {formData.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{opt}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Default Value */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Value</label>
              <Input
                value={formData.default_value}
                onChange={(e) => setFormData(f => ({ ...f, default_value: e.target.value }))}
                placeholder="Leave empty for no default"
              />
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-xs font-medium text-foreground">Required Field</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Users must fill this field when editing {entityInfo.label.toLowerCase()}</p>
              </div>
              <Switch
                checked={formData.is_required}
                onCheckedChange={(v) => setFormData(f => ({ ...f, is_required: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-1.5">
              {editingField ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editingField ? "Update" : "Create"} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.field_name}</span>? All saved values for this field across all {entityInfo.label.toLowerCase()} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
