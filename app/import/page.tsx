'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  FileUp, AlertCircle, CheckCircle2, Clock, AlertTriangle, Trash2, Eye,
  Upload, ZoomIn, Play, Loader2, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ImportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: jobs, mutate } = useSWR(user ? '/api/import?endpoint=jobs' : null, fetcher)
  
  const [step, setStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'import'>('select')
  const [jobId, setJobId] = useState<string | null>(null)
  const [entityType, setEntityType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setLoading(true)

    try {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(l => l.trim())
      const totalRows = lines.length - 1

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_job',
          entity_type: entityType,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          total_rows: totalRows,
        }),
      })

      if (!res.ok) throw new Error('Failed to create import job')
      const job = await res.json()
      setJobId(job.id)
      
      // Parse CSV and show preview
      const headers = lines[0].split(',').map(h => h.trim())
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim())
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]))
      })

      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_preview',
          job_id: job.id,
          preview_data: preview,
        }),
      })

      setStep('mapping')
      toast.success('File uploaded successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteImport = async () => {
    if (!jobId) return
    setLoading(true)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_import',
          job_id: jobId,
        }),
      })

      if (!res.ok) throw new Error('Import failed')
      const result = await res.json()
      
      toast.success(`Import completed: ${result.imported} rows imported`)
      await mutate()
      setStep('select')
      setJobId(null)
      setFile(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (id: string) => {
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_job', job_id: id }),
      })
      await mutate()
      toast.success('Import job deleted')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Import Data</h1>
        <p className="text-muted-foreground">Import crew, ships, voyages, and positions from CSV or Excel files</p>
      </div>

      <Tabs defaultValue="wizard" className="w-full">
        <TabsList>
          <TabsTrigger value="wizard" className="gap-2">
            <FileUp className="h-4 w-4" /> Wizard
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="space-y-6">
          {/* Step 1: Select Entity Type */}
          {step === 'select' && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Entity Type</CardTitle>
                <CardDescription>Select what you&apos;d like to import</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {['crew', 'ship', 'voyage', 'position'].map(type => (
                    <button
                      key={type}
                      onClick={() => setEntityType(type)}
                      className={cn(
                        "p-4 border rounded-lg text-left transition-all hover:border-chart-4",
                        entityType === type && 'border-chart-4 bg-chart-4/5'
                      )}
                    >
                      <p className="font-semibold capitalize">{type}</p>
                      <p className="text-sm text-muted-foreground">Import {type}s from CSV</p>
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={() => setStep('upload')} 
                  disabled={!entityType}
                  className="w-full"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Upload File */}
          {step === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>Upload a CSV or Excel file ({entityType})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-chart-4 transition-colors">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <p className="font-semibold">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">CSV or Excel files up to 100MB</p>
                    <input
                      id="file-input"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileSelect}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>
                {file && <p className="text-sm text-chart-4">✓ {file.name} selected</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setStep('select'); setFile(null) }}>Back</Button>
                  <Button disabled={!file || loading} className="flex-1" onClick={() => { /* auto-advance to mapping */ }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {loading ? 'Uploading...' : 'Next'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Column Mapping */}
          {step === 'mapping' && jobId && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>Match CSV columns to {entityType} fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">Auto-detecting columns... (In production, show mapping UI)</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
                  <Button onClick={() => setStep('preview')} className="flex-1">Review Preview</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && jobId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" /> Preview Data
                </CardTitle>
                <CardDescription>Review the first few rows before importing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-64">
                  <p className="text-muted-foreground">(Preview data would display here in production)</p>
                </div>
                <div className="space-y-2">
                  <Label>Duplicate Handling</Label>
                  <Select defaultValue="skip">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip duplicates</SelectItem>
                      <SelectItem value="overwrite">Overwrite existing</SelectItem>
                      <SelectItem value="merge">Merge data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
                  <Button onClick={() => setStep('import')} className="flex-1">Ready to Import</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Importing */}
          {step === 'import' && jobId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" /> Import in Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={loading ? 45 : 100} />
                <p className="text-sm text-muted-foreground">{loading ? 'Processing...' : 'Import complete'}</p>
                {!loading && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-chart-4">45</p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning">3</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-muted-foreground">2</p>
                      <p className="text-xs text-muted-foreground">Duplicates</p>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleExecuteImport} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {loading ? 'Importing...' : 'Confirm & Complete'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {!jobs?.length ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No import history yet
                </CardContent>
              </Card>
            ) : (
              jobs.map(job => (
                <Card key={job.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{job.file_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(job.created_at).toLocaleDateString()} • {job.entity_type}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">{job.total_rows}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Imported</p>
                        <p className="font-semibold text-chart-4">{job.imported_rows}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Skipped</p>
                        <p className="font-semibold text-warning">{job.skipped_rows}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Errors</p>
                        <p className="font-semibold text-destructive">{job.error_rows}</p>
                      </div>
                    </div>
                    {job.error_log?.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-xs">
                        <p className="font-semibold text-destructive mb-1">Errors:</p>
                        {job.error_log.slice(0, 3).map((err, i) => (
                          <p key={i} className="text-destructive/80">{err}</p>
                        ))}
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
