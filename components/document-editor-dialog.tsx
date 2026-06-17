"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface DocumentEditorDialogProps {
  open: boolean
  document: any | null
  onClose: () => void
  onSave: () => void
}

export function DocumentEditorDialog({ open, document, onClose, onSave }: DocumentEditorDialogProps) {
  const [docType, setDocType] = useState(document?.document_type || "other")
  const [expiryDate, setExpiryDate] = useState(document?.expiry_date || "")
  const [hasExpiry, setHasExpiry] = useState(!!document?.expiry_date)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.id,
          document_type: docType,
          expiry_date: hasExpiry ? expiryDate : null,
        }),
      })
      if (!res.ok) throw new Error("Failed to update document")
      toast.success("Document updated")
      onSave()
    } catch (e) {
      toast.error("Error updating document")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-xs font-medium mb-1 block">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["passport", "stcw", "medical", "visa", "contract", "waiver", "certificate", "id_card", "cv", "resume", "other"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="has-expiry" checked={hasExpiry} onCheckedChange={(v) => setHasExpiry(!!v)} />
            <Label htmlFor="has-expiry" className="text-sm cursor-pointer">This document has an expiry date</Label>
          </div>
          {hasExpiry && (
            <div>
              <Label className="text-xs font-medium mb-1 block">Expiry Date</Label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
