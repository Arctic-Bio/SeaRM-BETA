"use client"

import { useState, useCallback, useRef } from "react"
import Papa from "papaparse"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface ParsedData {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
  fileSize: number
}

type UploadState = "idle" | "parsed" | "uploading" | "success" | "error"

export function CsvUploader() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [uploadResult, setUploadResult] = useState<{
    inserted: number
    skipped: number
    total: number
    errors: string[]
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file")
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          const criticalErrors = result.errors.filter(
            (e) => e.type !== "FieldMismatch"
          )
          if (criticalErrors.length > 0) {
            toast.error(
              `CSV parsing errors: ${criticalErrors[0].message}`
            )
          }
        }

        const headers = result.meta.fields || []
        const rows = result.data as Record<string, string>[]

        // Filter out completely empty rows
        const validRows = rows.filter((row) =>
          Object.values(row).some((v) => v && v.trim() !== "")
        )

        setParsedData({
          headers,
          rows: validRows,
          fileName: file.name,
          fileSize: file.size,
        })
        setUploadState("parsed")
        setUploadResult(null)
        toast.success(
          `Parsed ${validRows.length} rows from ${file.name}`
        )
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
      },
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!parsedData) return

    setUploadState("uploading")
    setUploadProgress(0)

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 2, 90))
    }, 100)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedData.rows,
          headers: parsedData.headers,
        }),
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      setUploadResult(result)
      setUploadState("success")
      toast.success(
        `Successfully imported ${result.inserted} crew members`
      )
    } catch (error) {
      clearInterval(progressInterval)
      setUploadState("error")
      const msg = error instanceof Error ? error.message : "Upload failed"
      toast.error(msg)
    }
  }

  const handleReset = () => {
    setParsedData(null)
    setUploadState("idle")
    setUploadResult(null)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Zone */}
      {uploadState === "idle" && (
        <Card>
          <CardContent className="p-0">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-16 transition-all",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Drop your CSV file here
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse your files
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Supports crew CSV exports from Google Forms
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleInputChange}
                className="hidden"
                aria-label="Upload CSV file"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Info & Preview */}
      {parsedData && uploadState !== "idle" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <FileSpreadsheet className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {parsedData.fileName}
                    </CardTitle>
                    <CardDescription>
                      {parsedData.rows.length} rows &middot;{" "}
                      {parsedData.headers.length} columns &middot;{" "}
                      {formatFileSize(parsedData.fileSize)}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardHeader>

            {/* Upload Progress */}
            {uploadState === "uploading" && (
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing crew members...
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              </CardContent>
            )}

            {/* Success */}
            {uploadState === "success" && uploadResult && (
              <CardContent>
                <div className="flex flex-col gap-3 rounded-lg bg-success/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Import Complete
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="font-semibold text-foreground">
                        {uploadResult.inserted}
                      </span>{" "}
                      <span className="text-muted-foreground">imported</span>
                    </span>
                    {uploadResult.skipped > 0 && (
                      <span>
                        <span className="font-semibold text-foreground">
                          {uploadResult.skipped}
                        </span>{" "}
                        <span className="text-muted-foreground">skipped</span>
                      </span>
                    )}
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {uploadResult.errors.map((err, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-destructive"
                        >
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}

            {/* Error */}
            {uploadState === "error" && (
              <CardContent>
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Upload failed. Please try again.
                </div>
              </CardContent>
            )}
          </Card>

          {/* Data Preview Table */}
          {(uploadState === "parsed" || uploadState === "success") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Data Preview
                </CardTitle>
                <CardDescription>
                  Showing first {Math.min(parsedData.rows.length, 10)} of{" "}
                  {parsedData.rows.length} rows
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 z-10 min-w-12 bg-card text-xs">
                            #
                          </TableHead>
                          {["First Name", "Last Name", "Email Address", "Phone Number", "Country", "Current Occupation", "Availability"].map(
                            (h) => (
                              <TableHead key={h} className="min-w-32 text-xs">
                                {h}
                              </TableHead>
                            )
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.rows
                          .slice(0, 10)
                          .map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                              <TableCell className="sticky left-0 z-10 bg-card text-xs text-muted-foreground">
                                {rowIdx + 1}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["First Name"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Last Name"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Email Address"] || row["Email"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Phone Number"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Country"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Current Occupation"] || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row["Approximate Availability Start Date"] || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {uploadState === "parsed" && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Import {parsedData.rows.length} Crew Members
              </Button>
            </div>
          )}

          {uploadState === "success" && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
              <Button asChild>
                <a href="/crew">View Crew Members</a>
              </Button>
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
              <Button onClick={handleUpload}>Retry Upload</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
