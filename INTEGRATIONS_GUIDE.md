# Zapier & Forms Integration System

## Overview

Fully modular, expandable webhook-based integration system for pulling crew profiles directly from Google Forms, Typeform, Formstack, or any forms software via Zapier. Create crew members automatically from form submissions with intelligent field mapping.

## Features

- **Universal Webhook Endpoint** - Works with any form source via Zapier
- **Field Mapping Engine** - Flexible mapping from form fields to crew profile fields
- **Auto Profile Creation** - Automatically creates/updates crew with mapped data
- **Detailed Logging** - Track all integrations, submissions, and errors
- **Connection Management** - Create, edit, disable, and delete integrations
- **Per-Integration Configuration** - Each connection has custom field mapping and settings
- **Expandable Architecture** - Add new field types, transformers, and sources easily

## Quick Start (Google Forms)

### Step 1: Create Integration in Admin Panel
1. Go to Admin → Integrations
2. Click "Create Integration"
3. Set:
   - **Name**: "Google Forms - Crew Recruitment"
   - **Source**: "Google Forms"
   - **Status**: Active
4. Save

### Step 2: Configure Field Mapping
1. In integration detail, go to "Field Mapping" tab
2. Map form fields to crew fields:
   - Form "Full Name" → Crew "first_name" + "last_name" (auto-split)
   - Form "Email" → Crew "email"
   - Form "Phone" → Crew "phone"
   - Form "Position" → Crew "position"
   - Form "Experience Years" → Crew "experience_level"
3. Click Save

### Step 3: Set Up Zapier
1. Go to Integration → "Setup Guide" tab
2. Copy webhook URL (auto-generated)
3. Create new Zapier Zap:
   - Trigger: "Google Forms - New Response"
   - Action: "Webhooks - POST"
   - URL: Paste from Integration Setup
   - Data: Map all form fields
4. Test and publish

Done! Forms now auto-create crew profiles.

## Architecture

### Core Libraries

**`lib/integrations/types.ts`** - TypeScript interfaces
- `Integration` - Connection record with metadata
- `IntegrationLog` - Audit log for all webhook calls
- `FieldMapping` - Maps form field → crew field with transformer
- `WebhookPayload` - Standardized incoming data format

**`lib/integrations/mapper.ts`** - Field transformation engine
- `transformField()` - Single field transformation (type conversion, splitting)
- `mapFormDataToCrew()` - Transform entire form → crew profile
- `parseNameField()` - Intelligent name parsing (splits "John Doe" → first/last)
- `coerceValue()` - Type safety (string→number, date parsing, etc.)

**`lib/integrations/store.ts`** - Database operations
- `getDb()` - Neon PostgreSQL connection
- `bootstrapIntegrationTables()` - Creates `integrations` and `integration_logs` tables
- `createOrUpdateIntegration()` - CRUD integration
- `logWebhookCall()` - Records all webhook activity
- `upsertCrewFromMapping()` - Inserts/updates crew profile

### API Routes

**`POST /api/integrations`** - Create integration
```json
{
  "name": "Google Forms Crew",
  "source": "google_forms",
  "field_mapping": {
    "Full Name": { "target": "first_name", "transformer": "name_first" },
    "Email": { "target": "email" }
  }
}
```

**`GET /api/integrations`** - List integrations
**`PATCH /api/integrations/[id]`** - Update integration
**`DELETE /api/integrations/[id]`** - Delete integration

**`GET /api/integrations/[id]/logs`** - Get logs for integration
- Query params: `limit=50`, `offset=0`, `status=success|error`

**`POST /api/integrations/webhook/[key]`** - Public webhook endpoint
- No auth required (uses API key in URL)
- Payload: Any JSON object (mapped via field_mapping)
- Response: `{ success: true, crew_id: "..." }` or error

### UI Components

**Field Mapping Editor** (`components/integrations/field-mapping-editor.tsx`)
- Drag-drop or dropdown mapping form fields to crew fields
- Per-mapping transformer selection (name_first, email_clean, etc.)
- Real-time preview of transformations

**Setup Guide** (`components/integrations/setup-guide.tsx`)
- Copy webhook URL with one-click copy button
- Per-source setup instructions (Google Forms, Typeform, Zapier, etc.)
- cURL examples for testing

**Integration Logs** (`components/integrations/integration-logs.tsx`)
- Real-time log viewer showing all webhook calls
- Status badges (success, error, pending)
- Error details and payload inspection

**Connection Detail** (`components/integrations/connection-detail.tsx`)
- 4 tabs: Setup, Field Mapping, Logs, Settings
- Enable/disable toggle
- Field mapping configuration UI
- Delete confirmation

**Integrations Page** (`app/integrations/page.tsx`)
- List all integrations with status
- "Create Integration" button
- Search by name/source
- Click to open detail modal

## Data Flow

```
Form Submission (Google Forms, Typeform, etc.)
        ↓
Zapier Webhook Action
        ↓
POST /api/integrations/webhook/[api_key]
        ↓
Validate API key → find Integration record
        ↓
Load field_mapping from Integration
        ↓
Map form fields → crew fields using transformers
        ↓
Type coercion (string→number, etc.)
        ↓
upsertCrewFromMapping()
        ↓
INSERT crew OR UPDATE if email exists
        ↓
Log success/error
        ↓
Return { success: true, crew_id: "..." }
```

## Field Mapping Reference

### Source Fields
- Any form field from Google Forms, Typeform, Formstack, etc.
- Field names come from your form's field names
- Example: "Full Name", "Email Address", "Years of Experience"

### Target Fields (Crew Profile)
- `first_name` - Crew member first name
- `last_name` - Crew member last name
- `email` - Email address (unique, used for upsert)
- `phone` - Phone number
- `position` - Job title/position
- `country` - Country of residence
- `city` - City of residence
- `date_of_birth` - DOB (ISO format)
- `experience_level` - Years of experience (number)
- `status` - Crew status (applied, interview, standby, active)
- `notes` - Additional notes
- `skills` - Comma-separated skills

### Transformers
- `none` - No transformation, raw value
- `name_first` - Extract first name from "First Last" format
- `name_last` - Extract last name from "First Last" format
- `email_clean` - Normalize email (lowercase, trim)
- `phone_clean` - Remove special chars from phone
- `date_parse` - Parse various date formats
- `number_parse` - String to integer
- `status_map` - Map form values to status enum
- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `trim` - Remove leading/trailing whitespace

## Expandability

### Adding New Transformers
Edit `lib/integrations/mapper.ts`, add to `TRANSFORMERS`:
```typescript
TRANSFORMERS: {
  custom_transform: (value: any) => {
    // Your transformation logic
    return transformedValue
  }
}
```

### Adding New Crew Fields
1. Add column to crew table in schema
2. Add to `TARGET_FIELDS` in `lib/integrations/types.ts`
3. Use in field mappings

### Adding New Sources (Slack, HubSpot, etc.)
1. Create route: `app/api/integrations/webhook/[source]/route.ts`
2. Reuse same `POST` handler with source-specific parsing
3. Add instructions to `SetupGuide` component

### Custom Field Validation
Add validators in `lib/integrations/mapper.ts`:
```typescript
VALIDATORS: {
  email: (val) => /^[^@]+@[^@]+$/.test(val),
  phone: (val) => /^\d{10}$/.test(val),
}
```

## Database Schema

### integrations table
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255),
  source VARCHAR(100),
  api_key VARCHAR(255) UNIQUE,
  field_mapping JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### integration_logs table
```sql
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY,
  integration_id UUID REFERENCES integrations,
  status VARCHAR(50),
  payload JSONB,
  result JSONB,
  error TEXT,
  crew_id UUID REFERENCES crew,
  created_at TIMESTAMP
);
```

## Error Handling

All errors logged with:
- Timestamp
- Integration ID
- Original payload
- Error message
- Stack trace (if applicable)

Common errors:
- **Invalid API key** - 401 Unauthorized
- **Duplicate email** - 409 (creates new or updates existing)
- **Missing required fields** - 400 Bad Request
- **Field mapping error** - 422 Unprocessable Entity

## Testing

### cURL Test
```bash
curl -X POST https://yourapp.com/api/integrations/webhook/[api_key] \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Smith",
    "email": "john@example.com",
    "phone": "+1 555 123 4567",
    "position": "First Mate"
  }'
```

### Zapier Test
1. In Zapier, click "Test Action"
2. Provide sample Google Forms response
3. Verify webhook receives data
4. Check Integration Logs tab for success

## Permissions

All integration management requires `PERMISSIONS.INTEGRATIONS.VIEW` minimum.
- View: See integrations, logs
- Create: Add new integrations
- Edit: Modify field mapping, settings
- Delete: Remove integration

## Best Practices

1. **Test field mapping** - Use Setup Guide → cURL example before going live
2. **Monitor logs** - Check Integration Logs for errors
3. **Backup field mapping** - Download/note your mappings
4. **Name integrations clearly** - "Google Forms - Maritime Crew" vs "Form 1"
5. **One integration per form** - Don't reuse integration for multiple forms
6. **Review crew before activation** - Check first few created profiles

## Troubleshooting

**"API key not found"**
- Copy exact key from Setup Guide tab
- Check key isn't expired or disabled

**"Field not mapped"**
- Go to Field Mapping tab
- Ensure form field name matches exactly (case-sensitive)
- Check transformer is compatible with data

**"Crew created but missing fields"**
- Check field mapping for that field
- Verify transformer matches data format
- Review Integration Logs for transformation errors

**"Duplicate crew members"**
- Email not mapped (creates new instead of updating)
- Ensure email field mapped correctly
- Check email field is populated in form

## Future Enhancements

- Webhook retry logic on failures
- Batch import from spreadsheet
- OAuth2 for direct Google Forms API
- Field validation rules per mapping
- Scheduled sync from external APIs
- Conditional field mapping (if/then logic)
- Custom transformer editor in UI
- Import/export integration configs
