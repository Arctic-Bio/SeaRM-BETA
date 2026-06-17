# Advanced Integrations Debugging Guide

## What Was Fixed

Your Zapier/form integrations now have enterprise-grade logging and debugging. Previously, submissions would silently disappear if anything went wrong. Now every single webhook call is recorded with full context.

### Problems Solved
1. **Log-first architecture** - Every inbound request is recorded the instant it arrives (status "received"), BEFORE parsing/mapping. If anything fails later, the submission never disappears from history.
2. **Complete data capture** - Raw request body, all headers (auth/cookies redacted for safety), IP address, HTTP method, content-type, response status, timing, and error details.
3. **Field matching tracking** - Shows exactly how many form fields were successfully mapped to crew profile fields.
4. **Detailed error messages** - Includes stack traces for parsing, mapping, and database errors so you can debug Zapier configurations instantly.
5. **Stale schema repair** - The bootstrap now self-heals any broken `integration_logs` table from previous failed versions.

## Viewing Webhook History

### Access the Logs
1. Go to Admin → Integrations
2. Click on any connection to open its detail modal
3. Select the "Logs" tab

### What You See
Each webhook submission shows:

**Summary Line**
- Status badge (Received, Created, Updated, Skipped, Error)
- Crew name (or "Unidentified submission")
- HTTP method badge (POST, GET)
- Number of mapped fields (e.g., "5 mapped")
- Timestamp
- Duration in milliseconds

**Expanded Detail (Click to Open)**
- **Status & Metadata**: HTTP status code, method, content-type, source IP
- **Raw Body Received**: Exact JSON/form data from Zapier (first 500+ chars shown in expanded view)
- **Parsed Payload**: The JSON object after parsing — shows what Zapier actually sent
- **Mapped to Crew Fields**: Transformed values ready for the database (after field mapping rules applied)
- **Response Sent**: What the API returned to Zapier (confirms success or shows error response)
- **Request Headers**: Full headers (with auth redacted) — useful if Zapier sent custom headers
- **Error / Reason**: If anything failed, the full error message and stack trace appear here

## Understanding Submission Statuses

### Received
First-stage status when a request arrives but hasn't been processed yet. Usually transitions to another status after processing completes. If you see many "Received" entries still pending, the webhook processing may be hung.

### Success (Created)
New crew profile was inserted into the database.
- Crew ID appears in the log
- Mapped data shows what was written
- Response includes `action: "created"` and `crew_id`

### Updated (Duplicate)
A crew profile already existed (same email or dedupe field), and `update_existing: true` was configured, so the existing record was updated with new data from the form.
- Crew ID links to the existing profile
- Response includes `action: "updated"`

### Skipped
The submission was valid but rejected for a business reason:
- No name and no email in the form (can't create a crew without identity)
- Duplicate submission and `update_existing: false`
- Connection was disabled
- Auto-mapping found zero matching fields
- Error message explains exactly why it was skipped

### Error
Something went wrong during processing. Error message and stack trace appear in the "Error / Reason" section:
- **"Body parse failed"** - Zapier sent data in an unexpected format. Check content-type and raw body.
- **"Invalid webhook key"** - URL is wrong or key has been rotated. Copy URL again from Setup tab.
- **"Connection is disabled"** - Enable the connection in Settings tab.
- **Database error** - Crew table or activities table may have schema issues; check error details.
- **Mapping error** - Field mapping rule references a non-existent column or transformer; fix in Field Mapping tab.

## Debugging a Failed Integration

### Scenario: Zapier sent data but nothing appears in crew

1. **Check the Logs tab** - Is there an entry at the right timestamp?
   - If YES and status is "Error" → Read error message, fix the issue
   - If YES and status is "Skipped" → Read the skip reason, adjust field mapping or form data
   - If NO → Webhook URL is wrong or Zapier isn't sending to the right URL

2. **Verify the Webhook URL** - Click "Setup" tab, copy the URL again
   - Test it with cURL from the Setup tab's "Test with cURL" example
   - If you get "Invalid webhook key" error, the key in the URL is wrong

3. **Check Field Mapping** - Go to "Field Mapping" tab
   - Ensure form field names match EXACTLY (case-sensitive)
   - Check that target crew fields are correct
   - Test with "Preview" if available, or check matched count in the log

4. **Inspect the Raw Data** - Click to expand a log entry
   - "Raw body received" shows exactly what Zapier sent
   - "Parsed payload" shows how that raw data was interpreted
   - "Mapped to crew fields" shows the transformation result
   - Compare against your field mapping rules

### Example: "Brytan Kelly" wasn't imported

1. Look at the most recent log entry in the Logs tab
2. Click to expand it
3. Check "Raw body received" - does it contain "Brytan" and "Kelly" (or whatever the form field names are)?
4. Check "Parsed payload" - is Zapier's field name there? (e.g., "What's your name?": "Brytan Kelly")
5. Check "Field Mapping" tab - is there a rule mapping from "What's your name?" to "first_name" + "last_name"?
6. Check "Mapped to crew fields" in the log - did it split into first_name and last_name correctly?
7. Check status - if "Success" or "Updated", the crew was imported; search for Brytan in the crew table
   - If "Skipped", the reason appears in the error section (e.g., "No identifiable name or email found")
   - If "Error", the error details appear in the error section

## Log Schema (Advanced Reference)

Each log entry captures:

| Field | Purpose |
|-------|---------|
| `id` | Unique log ID |
| `connection_id` | Which integration this submission belongs to |
| `status` | received, success, duplicate, skipped, error |
| `action` | created, updated, skipped, none |
| `crew_id` | ID of the crew profile created/updated (if any) |
| `crew_name` | Name of the crew profile (for quick scanning) |
| `http_method` | GET (health check) or POST (submission) |
| `content_type` | application/json, application/x-www-form-urlencoded |
| `headers` | All request headers (auth/cookies redacted) |
| `raw_body` | Exact bytes received from Zapier (up to full request size) |
| `request_ip` | Source IP of the Zapier worker |
| `payload` | Parsed JSON/form data from raw_body |
| `mapped_data` | Crew fields after transformation (before insert/update) |
| `matched_count` | How many form fields matched to crew fields |
| `response_status` | HTTP status we returned to Zapier (200, 400, 403, 404, 500) |
| `response_body` | The exact JSON we sent back to Zapier |
| `error_message` | Full error or skip reason, including stack traces |
| `duration_ms` | How long the entire request took to process |
| `created_at` | Timestamp when the submission was received |

## Performance & Timing

The `duration_ms` field shows total request processing time. Typical values:
- 50-150ms: Normal processing
- 200-500ms: Database latency or complex mapping
- >1000ms: Check database performance or custom transformers

If durations spike, the issue is usually database access, not the webhook code.

## Retention & Storage

Logs are stored indefinitely in your database `integration_logs` table. To manually clean old logs:

```sql
DELETE FROM integration_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

## Best Practices

1. **Monitor the Logs tab regularly** - It auto-refreshes every 10 seconds. Bookmark it.
2. **Test field mapping before going live** - Use the "Setup" tab's cURL example to test with sample data.
3. **Check matched count** - If it's 0 or lower than expected, field names don't match the form.
4. **Verify raw body** - If the form data isn't there, Zapier isn't mapping the fields correctly.
5. **Use crew name for quick scanning** - Crew created successfully will show the name, not "Unidentified submission".
6. **Watch for "Skipped" entries** - These usually mean the field mapping is missing the name or email field.

## Troubleshooting Checklist

- [ ] Webhook appears in Logs tab? (If no, URL is wrong or Zapier isn't sending)
- [ ] Status is "Success"? (If not, check status badge reason)
- [ ] Crew name appears? (If "Unidentified", no name/email in mapped data)
- [ ] Raw body contains all fields? (If not, Zapier form isn't mapped to all fields)
- [ ] Matched count > 0? (If 0, field names don't match the form)
- [ ] Mapped data is correct? (Compare to what you expected in field mapping)
- [ ] Crew appears in crew list? (Search by name, check ID in log)
- [ ] Error message is clear? (Stack traces pinpoint exactly what failed)

## Getting Help

If a submission still isn't importing after checking the above:
1. Share a screenshot of the expanded log entry (Raw body, Parsed payload, Mapped data, Error sections)
2. Share the field mapping configuration
3. Share the expected vs actual field names from your form

This usually provides everything needed to diagnose the issue.
