"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2, DollarSign, Calendar, User, FileText, CheckCircle2, Send,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", issued: "Issued",
  paid: "Paid", overdue: "Overdue", cancelled: "Cancelled", refunded: "Refunded",
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  issued: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  paid: "bg-success/15 text-success border-success/25",
  overdue: "bg-destructive/15 text-destructive border-destructive/25",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-warning/15 text-warning border-warning/25",
}

interface Props {
  invoiceId: string
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

export function InvoiceDetail({ invoiceId, open, onClose, onUpdate }: Props) {
  const { data: invoice, isLoading, mutate } = useSWR(
    open ? `/api/invoices/${invoiceId}` : null,
    fetcher
  )

  const handleStatusChange = async (newStatus: string) => {
    try {
      const body: any = { status: newStatus }
      if (newStatus === "paid") body.paid_at = new Date().toISOString()
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to update status")
        return
      }
      toast.success(`Invoice marked as ${INVOICE_STATUS_LABELS[newStatus]}`)
      await mutate()
      onUpdate()
    } catch {
      toast.error("Failed to update invoice status")
    }
  }

  const handleDueDateChange = async (date: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: date || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to update due date")
        return
      }
      toast.success("Due date updated")
      await mutate()
      onUpdate()
    } catch {
      toast.error("Failed to update due date")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoice?.error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-destructive">{invoice.error}</p>
          </div>
        ) : invoice ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {invoice.invoice_number}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {invoice.crew_first_name} {invoice.crew_last_name}
                    {invoice.voyage_name && ` -- ${invoice.voyage_name}`}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className={cn("text-xs", INVOICE_STATUS_COLORS[invoice.status])}>
                  {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                </Badge>
              </div>
            </DialogHeader>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Issue Date</p>
                <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "-"}
                </p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Due Date</Label>
                <Input
                  type="date"
                  className={cn("mt-0.5 h-8 text-sm",
                    invoice.status === "overdue" && "text-destructive border-destructive/40"
                  )}
                  value={invoice.due_date ? invoice.due_date.split("T")[0] : ""}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Currency</p>
                <p className="text-sm font-medium mt-0.5">{invoice.currency || "USD"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created By</p>
                <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {invoice.created_by || "-"}
                </p>
              </div>
            </div>

            {/* Line Items */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs text-right">Rate</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.line_items.map((li: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{li.description}</TableCell>
                        <TableCell className="text-sm text-right">{Number(li.quantity).toFixed(1)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{li.unit}</TableCell>
                        <TableCell className="text-sm text-right">${Number(li.unit_price).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(li.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${Number(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base pt-2 border-t border-border">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  <span className="text-muted-foreground text-sm mr-1">{invoice.currency || "USD"}</span>
                  ${Number(invoice.total_amount || 0).toFixed(2)}
                </span>
              </div>
              {invoice.paid_at && (
                <div className="flex items-center gap-1.5 text-xs text-success pt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid on {new Date(invoice.paid_at).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{invoice.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Select value={invoice.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invoice.status === "draft" && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleStatusChange("issued")}>
                  <Send className="h-3.5 w-3.5" /> Issue
                </Button>
              )}
              {invoice.status === "issued" && (
                <Button variant="outline" size="sm" className="gap-1 text-success" onClick={() => handleStatusChange("paid")}>
                  <DollarSign className="h-3.5 w-3.5" /> Mark Paid
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
