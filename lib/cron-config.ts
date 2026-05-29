// Cron job configuration system
// For open-source users to easily customize cron schedules

export interface CronJob {
  id: string
  path: string
  name: string
  description: string
  schedule: string
  enabled: boolean
  lastRun?: Date
}

export const CRON_PRESETS = {
  EVERY_5_MINS: '*/5 * * * *',
  EVERY_15_MINS: '*/15 * * * *',
  EVERY_30_MINS: '*/30 * * * *',
  HOURLY: '0 * * * *',
  TWICE_DAILY: '0 0,12 * * *',
  DAILY: '0 0 * * *',
  WEEKLY: '0 0 * * 0',
  MONTHLY: '0 0 1 * *',
}

export const CRON_PRESETS_LABELS: Record<string, string> = {
  [CRON_PRESETS.EVERY_5_MINS]: 'Every 5 minutes (Pro plan only)',
  [CRON_PRESETS.EVERY_15_MINS]: 'Every 15 minutes (Pro plan only)',
  [CRON_PRESETS.EVERY_30_MINS]: 'Every 30 minutes (Pro plan only)',
  [CRON_PRESETS.HOURLY]: 'Every hour (Pro plan only)',
  [CRON_PRESETS.TWICE_DAILY]: 'Twice daily (12am & 12pm)',
  [CRON_PRESETS.DAILY]: 'Daily at midnight (Hobby plan)',
  [CRON_PRESETS.WEEKLY]: 'Weekly on Sunday',
  [CRON_PRESETS.MONTHLY]: 'Monthly on 1st',
}

export const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: 'email-queue',
    path: '/api/cron/email-queue',
    name: 'Email Queue Processor',
    description: 'Processes pending emails from the queue and sends them',
    schedule: CRON_PRESETS.DAILY,
    enabled: true,
  },
]

// Get environment variable or default
export function getCronSchedule(jobId: string): string {
  const envVar = `CRON_${jobId.toUpperCase()}`
  return process.env[envVar] || DEFAULT_CRON_JOBS.find(j => j.id === jobId)?.schedule || CRON_PRESETS.DAILY
}

// Validate cron expression format
export function validateCronExpression(cron: string): boolean {
  const parts = cron.split(' ')
  if (parts.length !== 5) return false
  
  const [minute, hour, day, month, weekday] = parts
  
  try {
    // Basic validation
    validateCronPart(minute, 0, 59, 'minute')
    validateCronPart(hour, 0, 23, 'hour')
    validateCronPart(day, 1, 31, 'day')
    validateCronPart(month, 1, 12, 'month')
    validateCronPart(weekday, 0, 6, 'weekday')
    return true
  } catch {
    return false
  }
}

function validateCronPart(part: string, min: number, max: number, name: string): void {
  if (part === '*' || part === '?') return
  
  if (part.includes('/')) {
    const [range, step] = part.split('/')
    if (isNaN(parseInt(step))) throw new Error(`Invalid ${name} step`)
  }
  
  if (part.includes('-')) {
    const [start, end] = part.split('-')
    const startNum = parseInt(start)
    const endNum = parseInt(end)
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      throw new Error(`Invalid ${name} range`)
    }
  }
  
  if (part.includes(',')) {
    part.split(',').forEach(p => {
      const num = parseInt(p)
      if (isNaN(num) || num < min || num > max) {
        throw new Error(`Invalid ${name} value`)
      }
    })
  }
  
  const num = parseInt(part)
  if (!isNaN(num) && (num < min || num > max)) {
    throw new Error(`Invalid ${name} value`)
  }
}

// Check if Pro plan features are being used
export function isProFeature(schedule: string): boolean {
  const proPlanSchedules = [
    CRON_PRESETS.EVERY_5_MINS,
    CRON_PRESETS.EVERY_15_MINS,
    CRON_PRESETS.EVERY_30_MINS,
    CRON_PRESETS.HOURLY,
  ]
  return proPlanSchedules.includes(schedule)
}
