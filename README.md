<p align="center">
  <img src="https://img.shields.io/badge/SeaRM-Maritime%20Operations%20Platform-0f172a?style=for-the-badge&logo=anchor&logoColor=06b6d4" alt="SeaRM" />
</p>

<h1 align="center">SeaRM - Enterprise Maritime Crew Management Platform</h1>

<p align="center">
  <strong>Full-stack crew lifecycle management, fleet operations, voyage planning, compliance, invoicing, and automated integrations</strong><br/>
  Production-ready system for maritime organizations managing crews, vessels, assignments, and operations at scale.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=fff" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="MIT License" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Crew Lifecycle System](#crew-lifecycle-system)
- [Integrations & Webhooks](#integrations--webhooks)
- [Crew Portal](#crew-portal)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Support](#support)
- [License](#license)

---

## Overview

**SeaRM** (Sea Resource Manager) is a comprehensive maritime operations platform built for organizations managing crews, fleets, voyages, and operational compliance. It consolidates crew applications, vessel management, assignments, invoicing, document compliance, and automated workflows into a single unified system.

### Key Capabilities

- **Crew Lifecycle Management** - 10-stage pipeline from application through active deployment to alumni
- **Fleet & Voyage Operations** - Ship registry, voyage planning, crew assignments, availability tracking
- **Invoicing System** - Hour tracking, automatic invoice generation, pay configuration, payment management
- **Integrations & Webhooks** - Pull crew profiles from Google Forms, Typeform, or any forms software via Zapier
- **Crew Portal** - Self-service crew interface for documents, e-signatures, onboarding tracking
- **Admin Tools** - Query builder, data export (18+ sources), user management, activity audit log
- **Safety & Compliance** - Document management, e-signatures, incident tracking, onboarding checklists
- **Email Automation** - Templates, triggers, queues, and automated notifications
- **Extensions System** - Event hooks, cron jobs, and webhook automation for custom workflows

---

## Features

### Crew Management & Lifecycle

| Feature | Details |
|---|---|
| **Crew Pipeline (Kanban)** | Dynamic 10-stage application workflow with kanban board, pagination, and status grouping |
| **Unified Crew Profiles** | Complete profiles with skills, qualifications, assignments, documents, and custom fields |
| **Status Lifecycle** | application → screening → interview → verified → volunteer → active → standby → inactive → alumni/rejected |
| **Batch CSV Import** | Column mapping, duplicate detection (skip/merge), row-level error tracking |
| **Position Management** | Define positions per voyage with skill requirements and auto-matching |
| **Custom Fields** | Organization-defined fields with multiple data types and grouping |
| **Availability Tracking** | Interactive calendar with date ranges and heatmap visualization |

### Fleet & Voyage Operations

| Feature | Details |
|---|---|
| **Ship Registry** | Complete vessel database with specs, capacity, and maintenance tracking |
| **Voyage Management** | Plan and track voyages with ports, dates, crew assignments, and mission types |
| **Crew Assignments** | Assign crew to voyages with roles, performance reviews, and date tracking |
| **Ship Maintenance** | Track maintenance schedules with completion status |
| **Availability Heatmap** | Interactive calendar showing crew availability counts and timelines |

### Safety & Compliance

| Feature | Details |
|---|---|
| **Document Management** | Upload, verify, track documents with expiration monitoring |
| **E-Signatures** | Legally-binding electronic signatures with audit trail and timestamps |
| **Onboarding Checklists** | Configurable templates with progress tracking and status indicators |
| **Incident Tracking** | Safety incident reporting with severity, resolution, and history |

### Invoicing & Payments

| Feature | Details |
|---|---|
| **Invoice Generation** | Automatic invoices from assignments and verified hours |
| **Hour Tracking** | Log, track, verify crew working hours with rate management |
| **Pay Configuration** | Flexible hourly/daily rates per position type |
| **Invoice Settings** | Customizable numbering, templates, company branding |

### Integrations & Webhooks

| Feature | Details |
|---|---|
| **Universal Webhooks** | Works with Google Forms, Typeform, Formstack via Zapier |
| **Field Mapping Engine** | Flexible mapping from form fields to crew profile fields |
| **Auto Profile Creation** | Automatically creates/updates crew from form submissions |
| **Detailed Logging** | Track all submissions, transformations, and errors |
| **Data Preview** | Auto-detect field types, see actual submission data, suggest mappings |
| **Connection Management** | Create, edit, disable, delete integrations with per-connection settings |

### Crew Portal

| Feature | Details |
|---|---|
| **Self-Service Dashboard** | View profile, documents, requirements, onboarding progress |
| **Document Uploads** | Upload required documents with categorization and version tracking |
| **E-Signature Interface** | Sign documents electronically with typed or drawn signatures |
| **Onboarding Timeline** | Visual progress tracker with 8-stage completion status |
| **Voyage Assignments** | View active and past deployments with timeline and status |
| **Mobile-Responsive** | Full mobile support for crew on vessels |

### Admin Tools

| Feature | Details |
|---|---|
| **Query Builder** | Visual SQL composer with joins, filters, comparisons, saved queries |
| **Data Export** | Export all 63 database tables in CSV or JSON with batch downloads |
| **User Management** | Create, edit, deactivate accounts with role assignment and permissions |
| **Activity Log** | System-wide audit trail of all user and extension actions |
| **Settings Dashboard** | Global configuration, feature flags, site settings |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript 5.7 |
| **UI Framework** | React 19.2 |
| **Styling** | Tailwind CSS 4.2 + shadcn/ui |
| **Database** | Neon Serverless PostgreSQL |
| **Auth** | Custom JWT with bcrypt |
| **State Management** | SWR for client-side caching |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts 2.15 |
| **Maps** | Leaflet with custom layers |
| **CSV Parsing** | PapaParse |
| **Date Handling** | date-fns 4.1 |
| **Icons** | Lucide React |

---

## Quick Start

### Prerequisites

- **Node.js** 18.17+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (or npm/yarn)
- **PostgreSQL** via [Neon](https://neon.tech) (free tier works great)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/searm.git
cd searm

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). On first login, create your system administrator account.

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication
AUTH_SECRET="generate-random-string-minimum-32-chars"
# Generate with: openssl rand -base64 32

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Blob Storage (optional - for document uploads)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

---

## Architecture

```
searm/
├── app/
│   ├── api/                     # 40+ API route handlers
│   │   ├── crew/                # Crew CRUD, status management
│   │   ├── stats/               # Dashboard statistics
│   │   ├── kanban/              # Pipeline board with pagination
│   │   ├── export/              # Batch data export
│   │   ├── import/              # Bulk CSV import
│   │   ├── custom-fields/       # Custom field CRUD
│   │   ├── invoices/            # Invoicing system
│   │   ├── integrations/        # Webhook integrations
│   │   ├── portal/              # Crew portal endpoints
│   │   ├── auth/                # Authentication
│   │   └── ...
│   ├── crew/                    # Crew list, detail pages
│   ├── pipeline/                # Kanban board page
│   ├── portal/                  # Crew self-service portal
│   ├── integrations/            # Integration management
│   ├── settings/                # Admin settings
│   ├── export/                  # Data export page
│   └── page.tsx                 # Dashboard
├── components/
│   ├── ui/                      # shadcn/ui library
│   ├── integrations/            # Integration components
│   ├── crew-table.tsx           # Reusable crew table
│   ├── csv-uploader.tsx         # Bulk import interface
│   └── ...
├── lib/
│   ├── db.ts                    # Database + schema
│   ├── auth.ts                  # JWT authentication
│   ├── rbac/                    # Role-based access control
│   ├── integrations/            # Integration system
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── mapper.ts            # Field transformation engine
│   │   └── store.ts             # Database operations
│   ├── backup/                  # Database backup utilities
│   ├── extensions/              # Extension system
│   └── ...
├── public/                      # Static assets
└── package.json
```

---

## Crew Lifecycle System

SeaRM uses a unified crew model with a **10-stage lifecycle**. All crew members flow through the same stages with unified data persistence:

### Status Flow
```
application → screening → interview → verified → volunteer → active → standby → inactive → alumni/rejected
```

| Status | Description |
|---|---|
| **application** | Initial intake, profile creation, CV review |
| **screening** | Administrative screening, completeness check |
| **interview** | Scheduled interviews, assessment |
| **verified** | Approved for deployment, passed all checks |
| **volunteer** | Available for volunteer assignments |
| **active** | Currently assigned to a voyage/contract |
| **standby** | Available but not currently assigned |
| **inactive** | On leave or temporarily unavailable |
| **alumni** | Former crew, retained for records |
| **rejected** | Application rejected, archived |

### Unified Crew Profile

Every crew member has a single profile with:
- Personal information (name, contact, location)
- Skills & qualifications (15-skill rating system)
- Maritime certifications and training
- Assignment history with performance reviews
- Document repository with expiry tracking
- Invoicing records
- Organization-defined custom fields
- Full audit trail of all changes

---

## Integrations & Webhooks

### Quick Start (Google Forms to Crew Profiles)

**Step 1: Create Integration**
```
1. Go to Admin → Integrations → New Connection
2. Name: "Google Forms - Crew Recruitment"
3. Source: "Google Forms"
4. Save and copy webhook URL
```

**Step 2: Configure Field Mapping**
```
1. Go to Field Mapping tab
2. Map form fields to crew fields:
   - Form "Full Name" → crew "first_name" + "last_name" (auto-split)
   - Form "Email" → crew "email"
   - Form "Phone" → crew "phone"
   - Form "Position" → crew "position"
3. Click "Apply Suggestions" to auto-map
4. Save
```

**Step 3: Set Up Zapier**
```
1. Create new Zap in Zapier
2. Trigger: "Google Forms - New Response"
3. Action: "Webhooks - POST"
4. URL: Paste from Integration Setup tab
5. Data: Map all form fields
6. Test and publish
```

### Features

- **Auto Field Detection** - Analyzes last submission and detects field types (text, email, phone, number, etc.)
- **Smart Suggestions** - Suggests crew fields based on form field names (email→email, phone→phone_number, etc.)
- **Live Data Preview** - See actual submission data with types before finalizing mappings
- **One-Click Apply** - Apply all suggestions with one button
- **Detailed Logging** - Every webhook call tracked with request/response/error details
- **Universal Support** - Works with Google Forms, Typeform, Formstack, or any form software via Zapier

### Field Transformers

| Transformer | Purpose |
|---|---|
| `none` | Raw value, no transformation |
| `name_first` | Extract first name from "First Last" |
| `name_last` | Extract last name from "First Last" |
| `email_clean` | Normalize email (lowercase, trim) |
| `phone_clean` | Remove special characters |
| `date_parse` | Parse various date formats |
| `number_parse` | String to integer conversion |
| `uppercase` | Convert to uppercase |
| `lowercase` | Convert to lowercase |
| `trim` | Remove whitespace |

See [INTEGRATIONS_GUIDE.md](INTEGRATIONS_GUIDE.md) for complete integration documentation.

---

## Crew Portal

The crew portal provides self-service access for crew members to:

- **View Profile** - Personal information, qualifications, availability
- **Upload Documents** - Required and supplementary documents with categorization
- **E-Sign Documents** - Legally-binding electronic signatures with audit trail
- **Track Onboarding** - Visual progress through 8-stage onboarding process
- **View Assignments** - Current and past voyage assignments with timeline
- **Mobile Access** - Full responsive design for crew on vessels

### Portal Data Flow

```
Crew Login → /app/portal
  ↓
GET /api/portal (session user only)
  ├── Crew profile (16+ fields)
  ├── Active assignments with position titles
  ├── Onboarding checklists and progress
  ├── Documents and e-signature requirements
  ├── Smart tips and reminders
  └── Timeline stages
  ↓
Portal Renders with all data
```

See [PORTAL_QUICK_REFERENCE.md](PORTAL_QUICK_REFERENCE.md) for portal details.

---

## API Reference

### Authentication

```http
POST   /api/auth/login           # Login with email + password
POST   /api/auth/register        # Create new user account
POST   /api/auth/logout          # Clear session
GET    /api/auth/session         # Get current user
```

### Crew Management

```http
GET    /api/crew                 # List crew (staff only)
POST   /api/crew                 # Create crew member (staff only)
GET    /api/crew/[id]            # Get crew detail (staff only)
PUT    /api/crew/[id]            # Update crew member (staff only)
DELETE /api/crew/[id]            # Delete crew member (staff only)
```

### Pipeline & Dashboard

```http
GET    /api/kanban               # Get crew grouped by status (staff only)
GET    /api/stats                # Dashboard statistics (staff only)
```

### Data Operations

```http
GET    /api/export               # Export data sources (staff only)
POST   /api/import               # Execute bulk import (staff only)
GET    /api/custom-fields        # Get custom field definitions (staff only)
```

### Integrations

```http
POST   /api/integrations         # Create integration (staff only)
GET    /api/integrations         # List integrations (staff only)
GET    /api/integrations/[id]    # Get integration detail (staff only)
PATCH  /api/integrations/[id]    # Update integration (staff only)
DELETE /api/integrations/[id]    # Delete integration (staff only)
GET    /api/integrations/[id]/logs    # Get logs (staff only)
POST   /api/integrations/webhook/[key] # Public webhook (no auth)
```

### Crew Portal (Crew Only)

```http
GET    /api/portal               # Get crew portal data (session user)
GET    /api/portal/profile       # Get crew profile (session user)
PUT    /api/portal/profile       # Update own profile (session user)
POST   /api/portal/sign          # Sign documents (session user)
```

All staff endpoints enforce `staffOnly` role check. Portal endpoints are session-user only.

---

## Database Schema

SeaRM uses **63 PostgreSQL tables** organized into domains:

### Core
- `crew` - Unified crew members (10-stage lifecycle)
- `users` - System users with roles
- `roles` - Role definitions (sysadmin, staff, crew)
- `role_permissions` - Permission grants per role
- `positions` - Position definitions
- `countries` - Country reference data

### Operations
- `voyages` - Voyage planning and tracking
- `crew_assignments` - Crew-to-voyage assignments
- `crew_positions` - Position assignments per voyage
- `tasks` - Operational task management
- `incidents` - Safety incident reports
- `onboarding_checklists` - Onboarding templates and progress

### Documents & Compliance
- `documents` - Document metadata and tracking
- `file_storage` - File binary storage references
- `signature_audit_log` - E-signature audit trail

### Invoicing
- `crew_invoices` - Invoice master records
- `invoice_line_items` - Detailed line items
- `invoice_settings` - Invoice configuration
- `crew_hourly_logs` - Hour tracking records
- `crew_pay_config` - Position payment rates

### Integrations
- `integration_connections` - Webhook integration configs
- `integration_logs` - Webhook call audit trail

### Email & Extensions
- `email_templates`, `email_queue`, `email_providers`, `email_triggers`
- `extensions`, `extension_hooks`, `extension_logs`, `extension_config`

### System & Audit
- `activity_log` - All user and system actions
- `custom_field_definitions`, `custom_field_values` - Custom field storage
- `saved_views` - Saved table configurations
- `site_settings` - Global configuration

---

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git add .
git commit -m "Deploy SeaRM"
git push origin main

# Connect to Vercel Dashboard and deploy
# Environment variables are auto-synced from .env.local
```

### Docker

```bash
docker build -t searm .
docker run -e DATABASE_URL="..." -e AUTH_SECRET="..." -p 3000:3000 searm
```

### Self-Hosted

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

---

## Performance & Optimization

SeaRM has been thoroughly optimized:

✅ Removed unused 632 KB GIN index on `application_data`  
✅ Reindexed `file_storage` table (recovered 3.4 MB)  
✅ `VACUUM ANALYZE` on all active tables  
✅ Dynamic kanban pagination (50 items per column)  
✅ Parameterized queries throughout (SQL injection prevention)  
✅ Auth consolidation (single connection pool)  
✅ API authorization middleware (staff-only protection)  

---

## Security

- JWT-based authentication with bcrypt password hashing
- Role-based access control (RBAC) with fine-grained permissions
- Staff-only API protection on sensitive endpoints
- SQL injection prevention via parameterized queries
- CORS and CSRF protection
- Audit logging of all user and system actions
- E-signature audit trail with timestamps
- Document version tracking

See [SECURITY.md](SECURITY.md) for full security documentation.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

```bash
# Development workflow
git checkout -b feature/your-feature
# Make changes
pnpm run lint
pnpm run build
git commit -m "Add your feature"
git push origin feature/your-feature
# Create Pull Request
```

---

## Support

- 📖 **Documentation** - Full docs in [docs/](docs/) directory
- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/your-org/searm/issues)
- 💬 **Discussions** - [GitHub Discussions](https://github.com/your-org/searm/discussions)
- 📧 **Email Support** - arctic.framework@gmail.com

---

## Changelog

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for detailed changelog and version history.

### Latest (v2.1)
- Fixed extension manager crash on initialization
- Fixed portal crew lifecycle status references
- Fixed import system with full row mapping support
- Added API authorization middleware to sensitive endpoints
- Integrated field preview with auto-detection into field mapping
- Fixed log viewer horizontal overflow with proper text wrapping
- Full integration logging with webhook audit trail

---

## License

MIT License - See [LICENSE](LICENSE) file for details

---

## Made for Maritime Operations

SeaRM is purpose-built for organizations managing crews, fleets, voyages, and maritime operations at scale.

**Enterprise. Production-Ready. Open Source.**

<p align="center">
  ⚓ Built by maritime professionals, for maritime professionals
</p>
