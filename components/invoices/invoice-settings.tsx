"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Save, Settings } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "NZD", "CAD", "JPY", "NOK", "SEK", "DKK"]

export function InvoiceSettings() {
  const { data: settings, isLoading, mutate } = useSWR("/api/invoices/settings", fetcher)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    invoice_prefix: "",
    default_currency: "USD",
    payment_terms_days: "30",
    tax_rate: "0",
    company_name: "",
    company_address: "",
    company_email: "",
    footer_notes: "",
  })

  useEffect(() => {
    if (settings && !settings.error) {
      setForm({
        invoice_prefix: settings.invoice_prefix || "INV-",
        default_currency: settings.default_currency || "USD",
        payment_terms_days: String(settings.payment_terms_days || 30),
        tax_rate: String(settings.tax_rate || 0),
        company_name: settings.company_name || "",
        company_address: settings.company_address || "",
        company_email: settings.company_email || "",
        footer_notes: settings.footer_notes || "",
      })
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/invoices/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          payment_terms_days: Number(form.payment_terms_days),
          tax_rate: Number(form.tax_rate),
        }),
      })
      toast.success("Invoice settings saved")
      mutate()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      {/* Invoice Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" /> Invoice Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Configure numbering, currency, and tax settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Invoice Prefix</Label>
            <Input
              value={form.invoice_prefix}
              onChange={(e) => setForm((f) => ({ ...f, invoice_prefix: e.target.value }))}
              placeholder="INV-"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Next invoice: {form.invoice_prefix}{String(settings?.next_invoice_number || 1).padStart(5, "0")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Default Currency</Label>
              <Select value={form.default_currency} onValueChange={(v) => setForm((f) => ({ ...f, default_currency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment Terms (days)</Label>
              <Input
                type="number" min="0" step="1"
                value={form.payment_terms_days}
                onChange={(e) => setForm((f) => ({ ...f, payment_terms_days: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tax Rate (%)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={form.tax_rate}
              onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
              className="mt-1"
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Company Details</CardTitle>
          <CardDescription className="text-xs">
            Displayed on generated invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Company Name</Label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="Organization name"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company Email</Label>
            <Input
              type="email"
              value={form.company_email}
              onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))}
              placeholder="billing@company.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Textarea
              value={form.company_address}
              onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))}
              placeholder="123 Main St&#10;City, State ZIP"
              className="mt-1 text-xs"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Invoice Footer Notes</Label>
            <Textarea
              value={form.footer_notes}
              onChange={(e) => setForm((f) => ({ ...f, footer_notes: e.target.value }))}
              placeholder="Payment instructions, bank details..."
              className="mt-1 text-xs"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="md:col-span-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
