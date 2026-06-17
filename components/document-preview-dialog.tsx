"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DocumentPreviewDialogProps {
  open: boolean
  document: any | null
  onClose: () => void
}

export function DocumentPreviewDialog({ open, document, onClose }: DocumentPreviewDialogProps) {
  if (!document) return null

  const isPDF = document.mime_type === "application/pdf"
  const isImage = document.mime_type?.startsWith("image/")
  const isText = document.mime_type?.includes("text")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{document.file_name}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              asChild
            >
              <a href={`/api/documents/${document.id}`} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="w-full h-[60vh] overflow-auto bg-muted rounded-lg">
          {isPDF && (
            <iframe
              src={`/api/documents/${document.id}#view=FitH`}
              className="w-full h-full border-0"
            />
          )}
          {isImage && (
            <img
              src={`/api/documents/${document.id}`}
              alt={document.file_name}
              className="w-full h-full object-contain"
            />
          )}
          {!isPDF && !isImage && (
            <div className="p-4 text-sm text-muted-foreground">
              <p>Preview not available for {document.mime_type}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                asChild
              >
                <a href={`/api/documents/${document.id}`} download>
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
