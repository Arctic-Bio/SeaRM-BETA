"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Receipt, Plus, Loader2, DollarSign, FileText, Settings, Wand2,
  CheckCircle2, Clock, Send, X, Trash2, Eye, Ship, Calendar, User, Download,
} from "lucide-react"
import { InvoiceCreator } from "@/components/invoices/invoice-creator"
import { InvoiceDetail } from "@/components/invoices/invoice-detail"
import { InvoiceSettings } from "@/components/invoices/invoice-settings"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  refunded: "Refunded",
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  issued: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  paid: "bg-success/15 text-success border-success/25",
  overdue: "bg-destructive/15 text-destructive border-destructive/25",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-warning/15 text-warning border-warning/25",
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("")
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("list")

  const params = new URLSearchParams()
  if (statusFilter) params.set("status", statusFilter)

  const { data: invoices, isLoading, mutate } = useSWR(`/api/invoices?${params}`, fetcher)
  const invoiceList = Array.isArray(invoices) ? invoices : []

  const totalAmount = invoiceList.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0)
  const paidAmount = invoiceList.filter((inv: any) => inv.status === "paid").reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0)
  const pendingAmount = invoiceList.filter((inv: any) => ["draft", "pending", "approved", "sent"].includes(inv.status)).reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0)
  const overdueCount = invoiceList.filter((inv: any) => inv.status === "overdue").length

  const handleStatusChange = async (id: string, status: string) => {
    const body: any = { status }
    if (status === "paid") body.paid_at = new Date().toISOString()
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    toast.success(`Invoice marked as ${INVOICE_STATUS_LABELS[status]}`)
    mutate()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/invoices/${deleteId}`, { method: "DELETE" })
    toast.success("Invoice deleted")
    setDeleteId(null)
    mutate()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Invoices & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage crew invoices, generate billing, and configure payment settings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{invoiceList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-success">${paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-warning">${pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-destructive">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> All Invoices
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" /> Auto-Generate
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Invoice List Tab */}
        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : !invoiceList.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Receipt className="h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm font-medium">No invoices yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use Auto-Generate to create invoices from crew data</p>
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setActiveTab("generate")}>
                    <Wand2 className="h-3.5 w-3.5" /> Auto-Generate Invoice
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Crew Member</TableHead>
                      <TableHead className="text-xs">Campaign</TableHead>
                      <TableHead className="text-xs">Issue Date</TableHead>
                      <TableHead className="text-xs">Due Date</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceList.map((inv: any) => (
                      <TableRow key={inv.id} className="group">
                        <TableCell>
                          <button
                            onClick={() => setViewInvoiceId(inv.id)}
                            className="text-sm font-mono font-medium hover:underline text-primary"
                          >
                            {inv.invoice_number}
                          </button>
                        </TableCell>
                        <TableCell>
                          {inv.crew_first_name ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{inv.crew_first_name} {inv.crew_last_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.voyage_name || "-"}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-sm flex items-center gap-1",
                            inv.status === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium">
                            ${Number(inv.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          {Number(inv.tax_amount) > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              incl. ${Number(inv.tax_amount).toFixed(2)} tax
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select value={inv.status} onValueChange={(v) => handleStatusChange(inv.id, v)}>
                            <SelectTrigger className="h-7 w-auto border-none bg-transparent p-0 shadow-none">
                              <Badge variant="outline" className={cn("text-[10px]", INVOICE_STATUS_COLORS[inv.status])}>
                                {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setViewInvoiceId(inv.id)}>
                              <Eye className="h-3 w-3" /> View
                            </Button>
                            {inv.status === "draft" && (
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(inv.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Generate Tab */}
        <TabsContent value="generate" className="mt-4">
          <InvoiceCreator onCreated={() => { mutate(); setActiveTab("list") }} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <InvoiceSettings />
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      {viewInvoiceId && (
        <InvoiceDetail
          invoiceId={viewInvoiceId}
          open={!!viewInvoiceId}
          onClose={() => setViewInvoiceId(null)}
          onUpdate={() => mutate()}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
