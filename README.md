<p align="center">
  <img src="https://img.shields.io/badge/SeaRM-Maritime%20Operations%20Platform-0f172a?style=for-the-badge&logo=anchor&logoColor=06b6d4" alt="SeaRM" />
</p>

<h1 align="center">SeaRM</h1>

<p align="center">
  <strong>Enterprise-Grade Maritime Crew Management & Operations Platform</strong><br/>
  Full-stack system for crew lifecycle management, fleet operations, voyage planning, document compliance, automated extensions, invoicing, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=fff" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-Components-000?logo=shadcnui" alt="shadcn/ui" />
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
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SeaRM (Sea Resource Manager) is a comprehensive, production-ready platform purpose-built for maritime organizations that manage crews, fleets, voyages, and operational compliance. It consolidates crew applications, vessel management, assignment tracking, invoicing, document compliance, and automated workflows into a single unified system.

**Key Differentiators:**

- **Crew Lifecycle Integrated** - Unified crew model flowing through 10-stage lifecycle: application → screening → interview → verified → volunteer → active → standby → inactive → alumni/rejected
- **Full-Stack Next.js 16** with App Router, React 19, TypeScript, and Tailwind CSS 4
- **63-Table PostgreSQL Schema** covering every aspect of maritime operations
- **Enterprise RBAC** with staff-only API protection and granular permission system
- **Crew Portal** for self-service document uploads, e-signatures, and onboarding tracking
- **Invoicing System** with CSV import, hour tracking, automatic invoice generation, and payment management
- **Extensions System** with event hooks, cron jobs, and webhook automation
- **Email Automation** with templates, triggers, and queue management
- **Data Export** supporting 18+ data sources in CSV/JSON with batch downloads
- **Custom Query Builder** for ad-hoc visual SQL composition

---

## Features

### Crew Management & Lifecycle
| Feature | Description |
|---|---|
| **Crew Pipeline (Kanban)** | 10-stage application workflow with kanban board and dynamic column pagination |
| **Crew Profiles** | Complete profiles with skills, qualifications, ratings, assignments, and documents |
| **Position Management** | Define crew positions per voyage with skill requirements and auto-matching |
| **Availability Tracking** | Crew availability calendar with date ranges and heatmap visualization |
| **Status Lifecycle** | Unified crew model: application → screening → interview → verified → volunteer → active → standby → inactive → alumni/rejected |
| **Batch Import** | CSV upload with column mapping, duplicate detection (skip/merge), and row-level error tracking |
| **Custom Fields** | Organization-defined custom fields with support for multiple data types and grouping |

### Fleet & Voyage Operations
| Feature | Description |
|---|---|
| **Ship Registry** | Full vessel database with specifications, capacity, and maintenance tracking |
| **Voyage Management** | Plan and track voyages with ports, dates, crew assignments, and mission types |
| **Crew Assignments** | Assign crew to voyages with role, status, performance reviews, and date tracking |
| **Ship Maintenance** | Track maintenance schedules with completion status and technician assignments |
| **Availability Heatmap** | Interactive calendar with crew availability count, day tooltips, and timeline view |

### Safety & Compliance
| Feature | Description |
|---|---|
| **Document Management** | Upload, verify, track crew documents with expiration monitoring |
| **E-Signatures** | Legally-binding electronic signature collection with audit trail and timestamp |
| **Onboarding Checklists** | Configurable checklist templates with progress tracking and status indicators |
| **Incident Tracking** | Safety incident reporting with severity, resolution workflow, and history |

### Invoicing & Payments
| Feature | Description |
|---|---|
| **Invoice Generation** | Automatic invoice generation from assignments and verified hours |
| **Hour Tracking** | Log, track, and verify crew working hours with rate management |
| **Pay Configuration** | Flexible hourly/daily rates per position type (volunteer vs. paid) |
| **Invoice Settings** | Customizable numbering, templates, company branding, and email automation |

### Admin Tools
| Feature | Description |
|---|---|
| **Query Builder** | Visual SQL composer with joins, filters, comparisons, and saved queries |
| **Data Export** | Export all 63 database tables in CSV or JSON with batch downloads |
| **User Management** | Create, edit, deactivate accounts with role assignment and permission control |
| **Activity Log** | System-wide audit trail of all user and extension actions |
| **Settings Dashboard** | Global configuration, feature flags, site settings management |

### Crew Portal
| Feature | Description |
|---|---|
| **Self-Service Dashboard** | Crew view profile, documents, requirements, and onboarding progress |
| **Document Uploads** | Upload required documents with categorization and version tracking |
| **E-Signature Interface** | Sign documents electronically with audit trail |
| **Onboarding Timeline** | Visual progress tracker for onboarding completion with tips |
| **Mobile-Responsive** | Full mobile support for crew on vessels |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript 5.7 |
| **UI Framework** | React 19.2 |
| **Styling** | Tailwind CSS 4.2 + shadcn/ui components |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Auth** | Custom JWT with bcrypt password hashing |
| **State Management** | SWR for client-side caching |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts 2.15 |
| **Maps** | Leaflet with custom layers |
| **CSV Parsing** | PapaParse |
| **Date Handling** | date-fns 4.1 |
| **Icons** | Lucide React |

---

## Quick Start

### Prerequisites

- **Node.js** 18.17+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** via [Neon](https://neon.tech) (recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/searm.git
cd searm

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# 4. Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). On first login, you'll be prompted to create your system administrator account.

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Authentication
AUTH_SECRET="generate-a-random-string-at-least-32-characters-long"
# Generate with: openssl rand -base64 32

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Storage (optional)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

---

## Architecture

```
searm/
├── app/
│   ├── api/                 # 40+ API route handlers
│   │   ├── crew/            # Crew CRUD, status management
│   │   ├── stats/           # Dashboard statistics
│   │   ├── kanban/          # Pipeline board with pagination
│   │   ├── export/          # Batch data export
│   │   ├── import/          # Bulk CSV import
│   │   ├── custom-fields/   # Custom field CRUD
│   │   ├── invoices/        # Invoicing system
│   │   ├── portal/          # Crew portal endpoints
│   │   ├── auth/            # Authentication routes
│   │   └── ...
│   ├── crew/                # Crew list, detail pages
│   ├── pipeline/            # Kanban board page
│   ├── portal/              # Crew self-service portal
│   ├── settings/            # Admin settings
│   ├── export/              # Data export page
│   └── page.tsx             # Dashboard
├── components/              # Shared React components
│   ├── ui/                  # shadcn/ui component library
│   ├── crew-table.tsx       # Reusable crew data table
│   ├── csv-uploader.tsx     # Bulk import interface
│   └── ...
├── lib/
│   ├── db.ts                # Database + schema definitions
│   ├── auth.ts              # JWT authentication
│   ├── rbac/                # Role-based access control
│   ├── backup/              # Database backup utilities
│   ├── extensions/          # Extension system
│   └── ...
├── public/                  # Static assets
└── package.json
```

---

## Crew Lifecycle System

SeaRM uses a unified crew model with a 10-stage lifecycle. All crew members (regardless of entry point) flow through the same stages with unified data persistence:

### Status Lifecycle
```
application → screening → interview → verified → volunteer → active → standby → inactive → alumni/rejected
```

- **application** - Initial intake, profile creation, CV review
- **screening** - Administrative screening, completeness check
- **interview** - Scheduled interviews, assessment
- **verified** - Approved for deployment, passed all checks
- **volunteer** - Available for volunteer assignments
- **active** - Currently assigned to a voyage/contract
- **standby** - Available but not currently assigned
- **inactive** - On leave or temporarily unavailable
- **alumni** - Former crew, retained for records
- **rejected** - Application rejected, archived

### Crew Profile Model
Every crew member has a single unified profile with:
- Personal information (name, contact, location)
- Skills & qualifications (15-skill rating system)
- Maritime certifications and training
- Assignment history
- Document repository
- Invoicing records
- Custom fields

All changes are audit-logged and timestamped.

---

## API Reference

### Authentication
```
POST   /api/auth/login           # Login with email + password
POST   /api/auth/register        # Create new user account
POST   /api/auth/logout          # Clear session
GET    /api/auth/session         # Get current user
```

### Crew Management
```
GET    /api/crew                 # List crew with filters, search, pagination
POST   /api/crew                 # Create new crew member
GET    /api/crew/[id]            # Get crew detail with position joins
PUT    /api/crew/[id]            # Update crew member
DELETE /api/crew/[id]            # Delete crew member
```

### Pipeline & Stats
```
GET    /api/kanban               # Get crew grouped by status (with pagination)
GET    /api/stats                # Dashboard statistics (requires staffOnly auth)
```

### Data Operations
```
GET    /api/export               # Export data sources in CSV/JSON
POST   /api/import               # Execute bulk import from preview
GET    /api/custom-fields        # Get custom field definitions and values
```

### Crew Portal
```
GET    /api/portal               # Get crew portal data (session user only)
GET    /api/portal/profile       # Get profile data
PUT    /api/portal/profile       # Update own profile
GET    /api/portal/sign          # Get documents to sign
POST   /api/portal/sign          # Submit e-signature
```

All API endpoints enforce authentication. Staff-only endpoints (crew, stats, kanban, export) require `staffOnly` role check via `requireApiAuth({ staffOnly: true })`.

---

## Database Schema

SeaRM uses **63 PostgreSQL tables** organized into 9 domains:

### Core Entities
- `crew` - Unified crew members with all profile data and status lifecycle
- `users` - System users with roles and permissions
- `roles` - Role definitions (sysadmin, staff, crew)
- `role_permissions` - Permission grants per role
- `positions` - Position definitions with skill requirements
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
- `signature_audit_log` - E-signature event audit trail

### Invoicing
- `crew_invoices` - Invoice master records
- `invoice_line_items` - Detailed invoice line items
- `invoice_settings` - Invoice configuration
- `crew_hourly_logs` - Hour tracking records
- `crew_pay_config` - Position payment rates

### Email & Extensions
- `email_templates`, `email_queue`, `email_providers`, `email_triggers`
- `extensions`, `extension_hooks`, `extension_logs`, `extension_config`

### System & Audit
- `activity_log` - All user and system actions
- `custom_field_definitions`, `custom_field_values` - Custom field storage
- `saved_views` - Saved table filter/column configurations
- `site_settings` - Global configuration

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variables
4. Deploy (automatic on git push)

```bash
git add .
git commit -m "Deploy SeaRM"
git push origin main
```

### Docker

```bash
docker build -t searm .
docker run -e DATABASE_URL="..." -e AUTH_SECRET="..." -p 3000:3000 searm
```

### Self-Hosted (Linux/Ubuntu)

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guide.

---

## Database Optimization

The system has been fully optimized:

✅ Removed unused 632 KB GIN index on `application_data`  
✅ Reindexed `file_storage` table (saved 3.4 MB)  
✅ `VACUUM ANALYZE` on all active tables (reclaimed dead rows)  
✅ Dynamic kanban pagination (50 items per column max)  
✅ Parameterized queries throughout (SQL injection prevention)  
✅ Auth consolidation (single DB connection pool)  
✅ API authorization middleware (staff-only protection)

---

## Recent Improvements

### Audit Fixes (Latest Release)

**Critical Bugs Fixed:**
- Extension manager now properly initializes `getDb()` before use
- Portal tips updated to reference correct crew statuses
- Import system fully implemented (was a stub returning 0 rows)

**Security Enhancements:**
- API authorization middleware applied to sensitive endpoints
- Sort parameter validation (prevents SQL injection)
- Consolidated duplicate DB connections
- Removed dead permission system (now RBAC-only)

**UI Improvements:**
- Kanban grid now supports all 10 crew statuses (dynamic columns)
- Crew profile shows assigned and preferred positions
- Custom fields tab integrated into crew detail page
- CSV import now supports pronouns mapping
- Availability filter fixed to check end dates

**Performance:**
- Kanban API limits 50 items per column (scalable pagination)
- Import execution properly handles row-level errors
- Per-column overflow indicators

---

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

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

## License

MIT License - See [LICENSE](LICENSE) file for details

---

## Support

- 📖 [Full Documentation](README.md)
- 🐛 [Report Bugs](https://github.com/your-org/searm/issues)
- 💬 [Discussions](https://github.com/your-org/searm/discussions)
- 📧 Email: support@searm.dev

---

<p align="center">
  <strong>Made with ⚓ for maritime operations</strong>
</p>
