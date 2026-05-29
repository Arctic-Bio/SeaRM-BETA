# Cron Jobs Configuration Guide

SeaRM uses cron jobs to run background tasks automatically. This guide explains how to configure them for your deployment.

## Default Configuration

By default, all cron jobs run **once per day at midnight UTC** to comply with Vercel Hobby (free) plan limitations.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/email-queue",
      "schedule": "0 0 * * *"  // Daily at midnight
    }
  ]
}
```

## Available Cron Jobs

### Email Queue Processor
- **Path**: `/api/cron/email-queue`
- **Purpose**: Processes pending emails and sends them
- **Default**: Daily at midnight
- **Data**: Looks for queued emails and sends via configured providers

## Modifying Cron Schedules

### Option 1: Admin UI (Easiest)

1. Login as sysadmin
2. Go to **Settings** → **System** → **Cron Jobs**
3. Select from presets or enter custom cron expression
4. Click **Save**
5. Restart application

### Option 2: Environment Variables

Set environment variables to override default schedules:

```env
# Email queue cron (example: every 6 hours)
CRON_EMAIL_QUEUE=0 */6 * * *

# Format: minute hour day month weekday (0-6, 0=Sunday)
```

### Option 3: Direct Configuration (vercel.json)

Edit `vercel.json` and modify the `schedule` field:

```json
{
  "crons": [
    {
      "path": "/api/cron/email-queue",
      "schedule": "0 */12 * * *"  // Every 12 hours
    }
  ]
}
```

Then commit and redeploy.

## Cron Expression Format

SeaRM uses standard 5-part cron expressions:

```
┌─────────── minute (0 - 59)
│ ┌───────── hour (0 - 23)
│ │ ┌─────── day of month (1 - 31)
│ │ │ ┌───── month (1 - 12)
│ │ │ │ ┌─── day of week (0 - 6) (0 = Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

## Common Schedules

| Frequency | Expression | Hobby Plan | Pro Plan |
|-----------|------------|-----------|----------|
| Every 5 minutes | `*/5 * * * *` | ❌ | ✅ |
| Every 15 minutes | `*/15 * * * *` | ❌ | ✅ |
| Every 30 minutes | `*/30 * * * *` | ❌ | ✅ |
| Hourly | `0 * * * *` | ❌ | ✅ |
| Twice daily | `0 0,12 * * *` | ✅ | ✅ |
| Daily (midnight) | `0 0 * * *` | ✅ | ✅ |
| Daily (noon) | `0 12 * * *` | ✅ | ✅ |
| Weekly (Sunday) | `0 0 * * 0` | ✅ | ✅ |
| Monthly (1st) | `0 0 1 * *` | ✅ | ✅ |

## Plan Limitations

### Vercel Hobby (Free)
- **Maximum frequency**: Once per day
- **Allowed**: Daily, weekly, monthly schedules
- **Blocked**: Any hourly or more frequent schedules

### Vercel Pro
- **Maximum frequency**: Every 5 minutes
- **Allowed**: All frequencies from every 5 minutes onwards
- **Cost**: $20/month

### Self-Hosted
- **No limitations** - use any frequency you want
- Recommended: Use a dedicated job scheduler like:
  - APScheduler (Python)
  - node-cron (Node.js)
  - cron (Linux)

## Validation

SeaRM validates cron expressions and prevents invalid schedules:

```
Valid: 0 0 * * *
Valid: */5 * * * *
Valid: 0 0,12 * * *
Invalid: * * * * * * (too many parts)
Invalid: 60 * * * * (minute > 59)
Invalid: 0 25 * * * (hour > 23)
```

## Troubleshooting

### Cron job not running

**Check 1: Vercel plan**
```
If using hourly+ frequency on Hobby plan:
❌ Won't work - upgrade to Pro or reduce frequency
```

**Check 2: Expression validation**
```
Use the admin UI to validate your cron expression
Or check docs above for common schedules
```

**Check 3: Cron path**
Ensure the path matches a valid API route:
- `/api/cron/email-queue` ✅
- `/api/cron/email-queue/` ❌ (trailing slash)
- `/api/emails` ❌ (doesn't exist)

**Check 4: Application logs**
View Vercel logs to see if cron job executed:
```
vercel logs --team=your-team
```

### Email not sending

1. Check cron runs: Verify `cron/email-queue` executed
2. Check email queue: Query `email_queue` table for pending emails
3. Check SMTP: Verify email provider is configured
4. Check rate limits: Email queue may hit rate limits

## For Open-Source Deployments

### Docker

Add to your docker-compose or Dockerfile:

```dockerfile
# Set custom cron schedule
ENV CRON_EMAIL_QUEUE="0 */6 * * *"
```

### Kubernetes

Set as environment variable in deployment:

```yaml
env:
  - name: CRON_EMAIL_QUEUE
    value: "0 */6 * * *"
```

### Self-Hosted (Linux)

Use system cron instead of Vercel cron:

```bash
# Add to crontab
0 */6 * * * curl https://yourdomain.com/api/cron/email-queue
```

## Monitoring Cron Jobs

Check admin **Cron Jobs** page to see:
- Last execution time
- Status (success/failure)
- Next scheduled run
- Execution logs

## Security Notes

- Cron endpoints are **rate-limited** to prevent abuse
- **IP whitelisting** recommended for self-hosted
- **Authentication** can be added via `CRON_SECRET` env var
- All executions **logged** for audit trail

## Support

For issues:
1. Check `docs/CRON_JOBS.md` (this file)
2. Review Vercel cron documentation
3. Check application logs
4. Open GitHub issue with logs and configuration

---

Last updated: 2026
SeaRM Cron Jobs Configuration
