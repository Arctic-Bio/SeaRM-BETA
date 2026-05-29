'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Clock, Info, Loader2, CheckCircle } from 'lucide-react'
import { CRON_PRESETS, CRON_PRESETS_LABELS, validateCronExpression, isProFeature, DEFAULT_CRON_JOBS } from '@/lib/cron-config'

export function CronSettings() {
  const [schedules, setSchedules] = useState<Record<string, string>>({})
  const [customCron, setCustomCron] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handlePresetChange = (jobId: string, preset: string) => {
    setSchedules({ ...schedules, [jobId]: preset })
    setCustomCron({ ...customCron, [jobId]: preset })
    setValidationErrors({ ...validationErrors, [jobId]: '' })
  }

  const handleCustomCronChange = (jobId: string, value: string) => {
    setCustomCron({ ...customCron, [jobId]: value })
    setValidationErrors({ ...validationErrors, [jobId]: '' })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Validate all custom crons
      const errors: Record<string, string> = {}
      Object.entries(customCron).forEach(([jobId, cron]) => {
        if (cron && !validateCronExpression(cron)) {
          errors[jobId] = 'Invalid cron expression format'
        }
        if (isProFeature(cron) && process.env.NEXT_PUBLIC_PLAN !== 'pro') {
          errors[jobId] = 'Requires Vercel Pro plan'
        }
      })

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      // Save to database/env
      const res = await fetch('/api/admin/cron-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: customCron }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[v0] Error saving cron settings:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cron Job Scheduling
          </CardTitle>
          <CardDescription>
            Customize how often background jobs run. Requires Vercel Pro for frequencies faster than daily.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {saved && (
            <div className="p-3 bg-green-500/10 text-green-700 rounded-lg flex gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-sm">Cron schedules saved successfully</p>
            </div>
          )}

          {Object.values(validationErrors).some(e => e) && (
            <div className="p-3 bg-red-500/10 text-red-700 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                {Object.entries(validationErrors).map(([id, err]) => (
                  err && <p key={id}>{err}</p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-700" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Hobby Plan Limits</p>
              <p>Free Vercel accounts limited to daily cron jobs. Upgrade to Pro for faster frequencies.</p>
            </div>
          </div>

          <div className="space-y-4">
            {DEFAULT_CRON_JOBS.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  </div>
                  {job.enabled && <Badge>Enabled</Badge>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule Preset</label>
                  <Select
                    value={customCron[job.id] || job.schedule}
                    onValueChange={(v) => handlePresetChange(job.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CRON_PRESETS).map(([key, cron]) => (
                        <SelectItem key={cron} value={cron}>
                          {CRON_PRESETS_LABELS[cron]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Cron Expression</label>
                  <Input
                    placeholder="0 0 * * * (5-part cron format)"
                    value={customCron[job.id] || job.schedule}
                    onChange={(e) => handleCustomCronChange(job.id, e.target.value)}
                    className={validationErrors[job.id] ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day month weekday (0-6, 0=Sunday)
                  </p>
                </div>

                {validationErrors[job.id] && (
                  <p className="text-xs text-red-600">{validationErrors[job.id]}</p>
                )}

                <div className="bg-muted p-2 rounded text-xs font-mono">
                  Current: {customCron[job.id] || job.schedule}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Cron Settings'
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Tip for open-source users:</strong></p>
            <p>Set environment variables to override cron schedules:</p>
            <p className="font-mono">CRON_EMAIL_QUEUE=0 0 * * *</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
