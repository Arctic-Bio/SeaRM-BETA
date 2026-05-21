<p align="center">
  <img src="https://img.shields.io/badge/SeaRM-Maritime%20Operations%20Platform-0f172a?style=for-the-badge&logo=anchor&logoColor=06b6d4" alt="SeaRM" />
</p>

<p align="center">
  <img width="250" height="250" alt="image (3)" src="https://github.com/user-attachments/assets/18049ab8-de04-4330-9542-843e07bccd0d" />
</p>

<h1 align="center">SeaRM</h1>

<p align="center">
  <strong>Enterprise-Grade Maritime Crew Management & Operations Platform</strong><br/>
  Full-stack system for crew applications, fleet management, voyage operations, document compliance, embeddable widgets, automated extensions, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-000?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=fff" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=fff" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/shadcn/ui-Components-000?logo=shadcnui" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="MIT License" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Pages & Routes](#pages--routes)
- [API Reference](#api-reference)
- [Widget Builder](#widget-builder)
- [Extensions System](#extensions-system)
- [Data Export](#data-export)
- [Email System](#email-system)
- [Authentication & Roles](#authentication--roles)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SeaRM (Sea Resource Manager) is a comprehensive, production-ready platform purpose-built for maritime organizations that manage crews, fleets, voyages, and operational compliance. It replaces spreadsheets, email chains, and disconnected tools with a single unified system.

**Key differentiators:**

- **Full-stack Next.js 16** with App Router, React 19, and Tailwind CSS 4
- **33-table PostgreSQL schema** covering every aspect of maritime operations
- **Widget Builder** for creating embeddable, styled data views for external websites
- **Extensions System** with event hooks, cron jobs, and 5 pre-made automations
- **Role-based access** with 4 tiers: Sysadmin, Admin, Coordinator, Crew
- **Crew Portal** for self-service document uploads, e-signatures, and onboarding tracking
- **Email Automation** with template engine, trigger-based sending, and queue management
- **Data Export** supporting 18+ data sources in CSV or JSON with batch downloads
- **Custom Query Builder** for ad-hoc data exploration with visual SQL composition

---

## Features

### Crew Management
| Feature | Description |
|---|---|
| **Application Pipeline** | Multi-stage application workflow with kanban board, status tracking, and reviewer assignment |
| **15-Skill Rating System** | Star-rated skill assessments across navigation, engineering, safety, medical, and more |
| **Crew Profiles** | Full profiles with personal details, emergency contacts, skill ratings, and assignment history |
| **Crew Tags** | Custom tagging system for categorization, search, and filtering |
| **Check-Ins** | Periodic crew check-in logging with notes, location, and status tracking |
| **Sea Time Records** | Track accumulated sea time per crew member with voyage linkage |
| **Availability Tracking** | Crew availability calendar with date ranges and status indicators |

### Fleet & Voyage Operations
| Feature | Description |
|---|---|
| **Ship Registry** | Full vessel database with type, flag, tonnage, capacity, home port, and build year |
| **Voyage Management** | Plan and track voyages with ports, dates, mission types, and crew assignments |
| **Position Management** | Define crew positions per voyage with skill requirements and auto-matching |
| **Crew Assignments** | Assign crew to voyages with role, status, performance reviews, and date tracking |
| **Ship Maintenance** | Track maintenance schedules, costs, completion status, and technician assignments |
| **Ship Supplies** | Inventory management for vessel supplies with quantities, costs, and reorder tracking |

### Safety & Compliance
| Feature | Description |
|---|---|
| **Incident Tracking** | Report and manage safety incidents with severity, category, location, and resolution workflow |
| **Document Management** | Upload, verify, and track crew documents with expiration monitoring |
| **E-Signatures** | Legally-binding electronic signature collection with audit trail |
| **Onboarding Checklists** | Configurable checklists for new crew onboarding with progress tracking |
| **Signature Audit Log** | Full audit trail of all e-signature events for compliance |

### Widget Builder
| Feature | Description |
|---|---|
| **6 View Types** | Table, Cards, List, Stats, Timeline, Minimal -- all adaptive to any column count |
| **6 Style Presets** | Modern, Ocean, Minimal, Vibrant, Corporate, Seafoam -- bulletproof CSS isolation |
| **Live Preview** | Real-time iframe preview updates on every setting change with debounced fetching |
| **5 Pre-made Templates** | Fleet Overview, Active Voyages, Crew Pipeline, Safety Dashboard, Operations Board |
| **Embed Code Generation** | Script tag and iframe embed snippets with access token security |
| **Widget Security** | Per-widget access tokens, rate limiting, domain whitelisting, and access logging |

### Extensions System
| Feature | Description |
|---|---|
| **Event Hooks** | Subscribe to application lifecycle events (crew, voyages, documents, maintenance) |
| **Cron Jobs** | Schedule recurring tasks (daily compliance checks, weekly maintenance generation) |
| **JSON Manifests** | Install extensions via JSON manifest -- no code deployment required |
| **5 Default Extensions** | Slack Notifier, Document Expiry Monitor, Weather Briefing, Onboarding Automator, Maintenance Scheduler |
| **Configuration UI** | Admin-editable settings per extension with validation and type-safe schemas |
| **Permission System** | Granular permissions (read/write per resource, send:email, access:api, register:hooks) |
| **Activity Logging** | Full extension activity log with errors, config changes, and execution traces |

### Email System
| Feature | Description |
|---|---|
| **Template Engine** | Create and manage email templates with variable interpolation |
| **Trigger-Based Sending** | Configure automated emails on events (application received, status changed, etc.) |
| **Email Queue** | Queued email delivery with retry logic and status tracking |
| **Provider Management** | Connect external SMTP providers (nodemailer-based) |
| **Encrypted Credentials** | Provider credentials encrypted at rest |

### Admin Tools
| Feature | Description |
|---|---|
| **Custom Query Builder** | Visual SQL composer with table joins, filters (AND/OR), comparisons, and saved queries |
| **Data Export** | Export 18+ data sources (all 33 database tables) in CSV or JSON with batch downloads |
| **User Management** | Create, edit, and deactivate user accounts with role assignment |
| **Site Settings** | Global configuration for required documents, feature flags, and system behavior |
| **Activity Log** | System-wide audit trail of all user and system actions |
| **Global Search** | Cross-entity search across crew, ships, voyages, and tasks |

### Crew Portal
| Feature | Description |
|---|---|
| **Self-Service Dashboard** | Crew members view their profile, documents, requirements, and onboarding progress |
| **Document Uploads** | Upload required documents with categorization and version tracking |
| **E-Signature Interface** | Sign documents electronically by typing legal name |
| **Onboarding Timeline** | Visual progress tracker for onboarding completion |
| **Mobile-Responsive** | Full mobile support for crew on vessels |

---

## Architecture

```
searm/
├── app/                              # Next.js 16 App Router
│   ├── api/                          # 63 API route handlers
│   │   ├── auth/                     # Authentication (login, register, session, logout)
│   │   ├── crew/                     # Crew CRUD + check-ins, sea time, tags
│   │   ├── ships/                    # Ships CRUD + crew, maintenance, supplies
│   │   ├── voyages/                  # Voyages CRUD + position management
│   │   ├── assignments/              # Crew-voyage assignments
│   │   ├── tasks/                    # Task management
│   │   ├── incidents/                # Safety incident tracking
│   │   ├── documents/                # Document management + e-signatures
│   │   ├── email/                    # Email templates, triggers, queue, providers
│   │   ├── extensions/               # Extension install, config, logs, validation
│   │   ├── widgets/                  # Widget CRUD, preview, embed serving
│   │   ├── export/                   # Batch data export (18+ sources)
│   │   ├── tools/                    # Custom query builder, schema, saved queries
│   │   ├── kanban/                   # Kanban board API
│   │   ├── portal/                   # Crew portal endpoints
│   │   └── ...                       # Settings, stats, search, uploads, etc.
│   ├── crew/                         # Crew list + detail pages
│   ├── ships/                        # Ship registry + detail pages
│   ├── voyages/                      # Voyage list + detail pages
│   ├── pipeline/                     # Application kanban pipeline
│   ├── tasks/                        # Task management
│   ├── incidents/                    # Safety incidents
│   ├── positions/                    # Position management
│   ├── integrations/                 # Widget Builder (create, manage, templates)
│   ├── extensions/                   # Extensions (install, configure, logs, docs)
│   ├── export/                       # Data export dashboard
│   ├── email/                        # Email system management
│   ├── tools/                        # Custom query builder
│   ├── portal/                       # Crew self-service portal
│   ├── settings/                     # System settings
│   ├── users/                        # User management
│   ├── how-to/                       # Interactive documentation
│   ├── onboarding/                   # Onboarding management
│   ├── availability/                 # Crew availability
│   ├── upload/                       # Bulk CSV upload
│   ├── login/                        # Authentication
│   └── page.tsx                      # Dashboard with stats + charts
├── components/                       # Shared React components
│   ├── ui/                           # shadcn/ui component library
│   ├── app-sidebar.tsx               # Navigation sidebar
│   ├── auth-provider.tsx             # Auth context provider
│   ├── dashboard-shell.tsx           # Layout wrapper
│   ├── crew-table.tsx                # Reusable crew data table
│   ├── csv-uploader.tsx              # Bulk CSV import
│   ├── signature-pad.tsx             # E-signature capture
│   ├── skill-badge.tsx               # Skill rating display
│   ├── star-rating.tsx               # Star rating input
│   ├── status-badge.tsx              # Status indicator badges
│   └── ...                           # Activity timeline, crew popover, etc.
├── lib/                              # Core business logic
│   ├── db.ts                         # Database connection + schema definitions
│   ├── auth.ts                       # JWT auth with bcrypt password hashing
│   ├── uuid.ts                       # UUID generation utilities
│   ├── utils.ts                      # Shared utilities (cn, formatters)
│   ├── email/                        # Email subsystem
│   │   ├── index.ts                  # Public API
│   │   ├── transport.ts              # SMTP transport layer
│   │   ├── template-engine.ts        # Variable interpolation engine
│   │   ├── encryption.ts             # Credential encryption
│   │   ├── events.ts                 # Event-triggered email sending
│   │   └── types.ts                  # Type definitions
│   ├── extensions/                   # Extension subsystem
│   │   ├── index.ts                  # Public API
│   │   ├── manager.ts               # Install, activate, configure, uninstall
│   │   ├── dispatcher.ts            # Event hook dispatcher
│   │   ├── validator.ts             # JSON manifest validation
│   │   └── types.ts                  # Type definitions
│   └── widgets/                      # Widget subsystem
│       ├── index.ts                  # Public API
│       ├── data-sources.ts           # Data source definitions + column schemas
│       ├── query-builder.ts          # SQL query builder from widget config
│       ├── renderer.ts              # HTML renderer (6 view types)
│       ├── style-generator.ts       # CSS generator (6 presets, scoped + isolated)
│       ├── embed-generator.ts       # Embed code generator (script + iframe)
│       └── types.ts                  # Type definitions
└── public/                           # Static assets
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript 5.7 |
| **UI Library** | React 19.2 |
| **Styling** | Tailwind CSS 4.2 + shadcn/ui |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Auth** | Custom JWT (jose) + bcrypt password hashing |
| **Email** | Nodemailer with encrypted SMTP credentials |
| **Charts** | Recharts 2.15 |
| **Forms** | React Hook Form + Zod validation |
| **Data Fetching** | SWR for client-side caching and revalidation |
| **CSV Parsing** | PapaParse |
| **Date Handling** | date-fns 4.1 |

---

## Quick Start

### Prerequisites

- **Node.js** 18.17+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** via [Neon](https://neon.tech) (recommended) or local instance

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/searm.git
cd searm

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and auth secret

# 4. Initialize the database (creates all 33 tables)
pnpm run db:init

# 5. Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). On first load, you'll be prompted to create your system administrator account.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random string for JWT signing (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Yes | Application URL (`http://localhost:3000` for dev) |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob storage token for document uploads |

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="generate-a-random-string-at-least-32-characters-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Database Schema

SeaRM uses **33 PostgreSQL tables** organized into 6 domains:

### Core Entities
| Table | Purpose |
|---|---|
| `users` | System users with roles and hashed passwords |
| `crew_applications` | Crew applications with 15-skill star ratings |
| `ships` | Vessel registry (name, type, flag, tonnage, capacity) |
| `voyages` | Voyage planning (ports, dates, mission type, status) |
| `crew_positions` | Position definitions with skill requirements |

### Crew Operations
| Table | Purpose |
|---|---|
| `crew_assignments` | Crew-to-voyage assignments with reviews |
| `crew_sea_time` | Accumulated sea time records |
| `crew_checkins` | Periodic check-in logs |
| `crew_tags` | Custom crew categorization tags |
| `onboarding_checklists` | Onboarding progress tracking |

### Fleet Management
| Table | Purpose |
|---|---|
| `ship_maintenance` | Maintenance schedules and completion tracking |
| `ship_supplies` | Vessel inventory and supply management |
| `tasks` | Operational task management with assignments |
| `incidents` | Safety incident reports with severity and resolution |

### Documents & Compliance
| Table | Purpose |
|---|---|
| `documents` | Document metadata, verification, and expiration |
| `file_storage` | File binary storage references |
| `signature_audit_log` | E-signature event audit trail |
| `site_settings` | Global configuration and feature flags |

### Email System
| Table | Purpose |
|---|---|
| `email_providers` | SMTP provider configuration (encrypted) |
| `email_templates` | Email templates with variable slots |
| `email_triggers` | Event-based email automation rules |
| `email_queue` | Queued emails with retry and status tracking |

### Extensions & Widgets
| Table | Purpose |
|---|---|
| `extensions` | Installed extension manifests and status |
| `extension_hooks` | Registered event hooks per extension |
| `extension_config` | Extension configuration key-value store |
| `extension_logs` | Extension execution and error logs |
| `widgets` | Widget definitions and configuration |
| `widget_logs` | Widget access logs (IP, user agent, response time) |
| `integrations` | Legacy integration definitions |
| `integration_syncs` | Integration sync tracking |
| `integration_logs` | Integration activity logs |

### System
| Table | Purpose |
|---|---|
| `activities` | System-wide audit trail |
| `saved_tools` | Saved custom query configurations |

---

## Pages & Routes

### User-Facing Pages (24)

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Stats overview, charts, recent activity |
| `/crew` | Crew List | Searchable crew directory with filters |
| `/crew/[id]` | Crew Detail | Full profile, documents, assignments, sea time |
| `/pipeline` | Application Pipeline | Kanban board for application processing |
| `/ships` | Ship Registry | Fleet overview with vessel details |
| `/ships/[id]` | Ship Detail | Vessel info, crew, maintenance, supplies |
| `/voyages` | Voyage List | All voyages with status and filtering |
| `/voyages/[id]` | Voyage Detail | Voyage info, crew assignments, positions |
| `/positions` | Position Management | Define and manage crew positions |
| `/tasks` | Task Management | Operational tasks with assignment and tracking |
| `/incidents` | Safety Incidents | Incident reporting and resolution tracking |
| `/availability` | Crew Availability | Availability calendar and scheduling |
| `/onboarding` | Onboarding | Checklist management and progress tracking |
| `/email` | Email System | Templates, triggers, queue, and providers |
| `/integrations` | Widget Builder | Create, manage, and template widgets |
| `/extensions` | Extensions | Install, configure, and monitor extensions |
| `/export` | Data Export | Export 18+ data sources in CSV/JSON |
| `/tools` | Custom Tools | Visual SQL query builder |
| `/upload` | Bulk Import | CSV upload for batch data import |
| `/users` | User Management | Create and manage user accounts |
| `/settings` | Settings | Global configuration and feature flags |
| `/portal` | Crew Portal | Self-service crew dashboard |
| `/how-to` | Documentation | Interactive feature guides and tutorials |
| `/login` | Login | Authentication page |

### API Endpoints (63)

<details>
<summary>Click to expand full API reference</summary>

#### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user, return JWT |
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/logout` | Clear auth session |
| `GET` | `/api/auth/session` | Get current session info |
| `GET` | `/api/auth/first-check` | Check if first-user setup is needed |

#### Crew
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/crew` | List/create crew applications |
| `GET/PUT/DELETE` | `/api/crew/[id]` | Get/update/delete crew member |
| `GET/POST` | `/api/crew/[id]/checkins` | Crew check-in records |
| `GET/POST` | `/api/crew/[id]/sea-time` | Sea time records |
| `GET/POST/DELETE` | `/api/crew/[id]/tags` | Crew tags |

#### Fleet
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/ships` | List/create ships |
| `GET/PUT/DELETE` | `/api/ships/[id]` | Ship CRUD |
| `GET/POST` | `/api/ships/[id]/crew` | Ship crew roster |
| `GET/POST` | `/api/ships/[id]/maintenance` | Maintenance records |
| `GET/POST` | `/api/ships/[id]/supplies` | Supply inventory |

#### Voyages
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/voyages` | List/create voyages |
| `GET/PUT/DELETE` | `/api/voyages/[id]` | Voyage CRUD |
| `GET/POST` | `/api/voyages/[id]/positions` | Voyage positions |

#### Operations
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/assignments` | Crew assignments |
| `GET/PUT/DELETE` | `/api/assignments/[id]` | Assignment CRUD |
| `GET/POST` | `/api/tasks` | Task management |
| `GET/PUT/DELETE` | `/api/tasks/[id]` | Task CRUD |
| `GET/POST` | `/api/incidents` | Incident reports |
| `GET/PUT/DELETE` | `/api/incidents/[id]` | Incident CRUD |
| `GET/POST` | `/api/positions` | Position definitions |
| `GET/PUT/DELETE` | `/api/positions/[id]` | Position CRUD |
| `GET` | `/api/positions/[id]/match` | Auto-match crew to position |

#### Documents
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/documents` | Document management |
| `GET/PUT/DELETE` | `/api/documents/[id]` | Document CRUD |
| `POST` | `/api/documents/[id]/signature` | E-signature submission |

#### Email
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/email/templates` | Email templates |
| `GET/POST` | `/api/email/triggers` | Email triggers |
| `GET` | `/api/email/queue` | Email queue status |
| `POST` | `/api/email/send` | Send email |
| `GET/POST` | `/api/email/providers` | SMTP providers |
| `POST` | `/api/cron/email-queue` | Process email queue (cron) |

#### Extensions
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/extensions` | List/install extensions |
| `GET/PUT/DELETE` | `/api/extensions/[id]` | Extension CRUD + activate/deactivate |
| `POST` | `/api/extensions/validate` | Validate JSON manifest |
| `GET` | `/api/extensions/logs` | Extension logs |

#### Widgets
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/widgets` | List/create widgets |
| `POST` | `/api/widgets/preview` | Generate live widget preview |
| `GET` | `/api/widgets/embed/[id]` | Serve embedded widget (public) |

#### System
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/settings` | Global settings |
| `GET` | `/api/settings/global-documents` | Required document types |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/activities` | Activity audit log |
| `GET` | `/api/availability` | Crew availability |
| `GET/POST` | `/api/checklists` | Onboarding checklists |
| `GET` | `/api/search/entities` | Global entity search |
| `GET` | `/api/tags` | All crew tags |
| `GET/POST` | `/api/kanban` | Kanban board state |
| `POST` | `/api/kanban/move` | Move kanban card |
| `POST` | `/api/upload` | File upload |
| `GET/POST` | `/api/users` | User management |
| `GET/PUT/DELETE` | `/api/tools/saved` | Saved custom queries |
| `GET` | `/api/tools/schema` | Database schema for query builder |
| `POST` | `/api/tools/query` | Execute custom query |
| `GET` | `/api/export` | Data export (18+ sources) |
| `GET/POST` | `/api/portal` | Crew portal data |
| `PUT` | `/api/portal/profile` | Update crew profile |
| `POST` | `/api/portal/sign` | Portal e-signature |

</details>

---

## Widget Builder

The Widget Builder lets you create embeddable data widgets that display live data from your database on any external website.

### 6-Step Creation Wizard

1. **Select Data Source** -- Choose from 9 database tables (voyages, ships, crew, assignments, sea time, tasks, incidents, activities, check-ins)
2. **Choose Columns** -- Select which columns to display. All column types supported (text, dates, numbers, badges, emails, booleans, JSON)
3. **Filters & Sort** -- Add filters (equals, contains, greater than, etc.) and set sort column/direction
4. **View Type** -- Choose Table, Cards, List, Stats, Timeline, or Minimal
5. **Style & Preview** -- Pick a visual style preset with live iframe preview
6. **Name & Publish** -- Name the widget, set rate limits, and publish

### View Types

| View | Best For |
|---|---|
| **Table** | Full data grids with horizontal scroll, alternating rows, right-aligned numbers |
| **Cards** | Individual records with auto-detected title, subtitle, and all remaining fields |
| **List** | Compact rows with title + inline meta tags + secondary detail row |
| **Stats** | Aggregate dashboards: sums, averages, top values, date ranges, unique counts |
| **Timeline** | Chronological events with connecting dots and labeled tags |
| **Minimal** | Ultra-clean display with title + inline columns separated by dots |

All views are **fully adaptive** -- they show every selected column regardless of count, without dropping or hiding data.

### Style Presets

| Preset | Description |
|---|---|
| **Modern** | Clean white with blue accents |
| **Ocean** | Deep navy with cyan highlights (maritime themed) |
| **Minimal** | High contrast black-on-white monochrome |
| **Vibrant** | Warm orange accents on light stone |
| **Corporate** | Soft purple tones |
| **Seafoam** | Mint and teal for maritime themes |

All CSS uses `!important` and scoped selectors for bulletproof isolation from host site stylesheets.

### Pre-made Templates

5 one-click-deploy templates are included:

| Template | Data Source | View | Style |
|---|---|---|---|
| Fleet Overview | Ships | Cards | Ocean |
| Active Voyages | Voyages | Timeline | Modern |
| Crew Pipeline | Crew Applications | List | Seafoam |
| Safety Dashboard | Incidents | Stats | Vibrant |
| Operations Board | Tasks | Table | Corporate |

### Embedding

```html
<!-- Script embed (recommended) -->
<script src="https://your-app.vercel.app/api/widgets/embed/WIDGET_ID?token=ACCESS_TOKEN"></script>

<!-- Iframe embed (full CSS isolation) -->
<iframe src="https://your-app.vercel.app/api/widgets/embed/WIDGET_ID?token=ACCESS_TOKEN"
  width="100%" height="400" frameborder="0"></iframe>
```

---

## Extensions System

Extensions are plugin-like automations installed via JSON manifests. They hook into SeaRM events, run cron jobs, and require no code deployment.

### Default Extensions

| Extension | Category | Hooks | Description |
|---|---|---|---|
| **Slack Crew Notifier** | Communication | 4 event hooks | Posts crew events and voyages to Slack via webhook |
| **Document Expiry Monitor** | Compliance | 2 hooks + 1 cron | Daily check for expiring documents with email alerts |
| **Voyage Weather Briefing** | Operations | 2 event hooks | Fetches marine weather data for departing voyages |
| **Crew Onboarding Automator** | Crew | 3 event hooks | Creates checklists, sends emails, assigns training on approval |
| **Maintenance Scheduler** | Operations | 2 hooks + 2 crons | Weekly recurring maintenance + overdue escalation |

### Extension Manifest Structure

```json
{
  "slug": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "operations",
  "permissions": ["register:hooks", "read:crew", "send:email"],
  "hooks": [
    {
      "name": "crew.application.approved",
      "type": "event",
      "handler": "onApproved",
      "priority": 10,
      "description": "Triggered when application is approved"
    }
  ],
  "config_schema": [
    {
      "key": "webhook_url",
      "label": "Webhook URL",
      "type": "url",
      "required": true
    }
  ]
}
```

### Extension Lifecycle

```
Install (inactive) --> Configure --> Activate (running) --> Deactivate --> Uninstall
```

---

## Data Export

Export any data source in CSV or JSON format. Sources are organized by category:

| Category | Sources |
|---|---|
| **Crew** | Applications (with 15 skill ratings), Assignments, Sea Time, Check-Ins, Tags, Onboarding |
| **Fleet & Operations** | Ships, Voyages, Positions, Maintenance, Supplies |
| **Tasks & Safety** | Tasks, Incidents, Activity Log |
| **Documents & Email** | Documents, Email Templates, Email Queue |
| **System** | Users (passwords excluded), Widgets |

All exports include JOINed data (e.g., crew names on assignments, ship names on voyages).

---

## Email System

| Feature | Description |
|---|---|
| **Templates** | Create reusable email templates with `{{variable}}` interpolation |
| **Triggers** | Configure automated emails on events (application received, status changed, etc.) |
| **Queue** | Reliable delivery with retry logic, status tracking, and error logging |
| **Providers** | Connect SMTP providers with encrypted credential storage |
| **Cron Processing** | Automatic queue processing via `/api/cron/email-queue` |

---

## Authentication & Roles

SeaRM uses custom JWT authentication with bcrypt password hashing.

| Role | Access Level |
|---|---|
| **Sysadmin** | Full system access: user management, settings, extensions, all data |
| **Admin** | Crew management, fleet operations, document verification, reporting |
| **Coordinator** | View crew data, manage deployments, limited write access |
| **Crew** | Crew portal only: view profile, upload documents, sign e-signatures |

- Passwords hashed with `bcryptjs` (cost factor 12)
- Sessions managed via JWT tokens signed with `jose`
- HTTP-only secure cookies for token storage
- First-user detection for initial admin setup

---

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Import to Vercel
# 1. Visit vercel.com/new
# 2. Import your GitHub repository
# 3. Add environment variables (DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL)
# 4. Deploy
```

Vercel automatically deploys on every push to `main`.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
docker build -t searm .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="your-secret" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  searm
```

### PM2 (Self-Hosted)

```bash
pnpm build
pm2 start npm --name "searm" -- start
pm2 save && pm2 startup
```

---

## Configuration

### Site Settings

Accessible from the **Settings** page:

- **Required Documents** -- Define document types all crew must upload
- **Required E-Signature Documents** -- Specify documents requiring electronic signatures
- **Feature Flags** -- Enable/disable pages and features
- **Email Templates** -- Customize notification emails

### Customization

| What | Where |
|---|---|
| Application form fields | `APPLICATION_FIELDS` in `/lib/db.ts` |
| Pipeline stages | `PIPELINE_STAGES` in `/lib/db.ts` |
| Onboarding checklists | `/api/checklists` API |
| Widget data sources | `/lib/widgets/data-sources.ts` |
| Extension manifests | `/api/extensions` API |

---

## Troubleshooting

<details>
<summary><strong>Cannot connect to database</strong></summary>

- Verify `DATABASE_URL` in `.env.local` includes `?sslmode=require`
- Test connection: `psql $DATABASE_URL`
- For Neon: ensure your IP is not blocked
</details>

<details>
<summary><strong>Login loops or session issues</strong></summary>

- Clear all site cookies and retry
- Ensure `AUTH_SECRET` is set (min 32 characters)
- Verify `users` table exists: `SELECT count(*) FROM users`
</details>

<details>
<summary><strong>Widget preview shows error</strong></summary>

- Ensure the selected data source table exists and has data
- Check browser console for API errors
- Verify the widget columns match actual database columns
</details>

<details>
<summary><strong>Extension install fails</strong></summary>

- Validate the manifest JSON using the Developer Guide tab
- Ensure the slug is unique (not already installed)
- Check required fields: slug, name, version, hooks, permissions
</details>

<details>
<summary><strong>Data export returns empty</strong></summary>

- Verify the source table has data
- Check browser network tab for API errors
- Some tables (email_queue, extension_logs) may be empty by default
</details>

<details>
<summary><strong>Performance optimization</strong></summary>

- Enable connection pooling on Neon
- Run `ANALYZE` on production database
- Use Custom Tools to identify slow queries
- Consider upgrading Neon tier for higher connection limits
</details>

---

## Contributing

```bash
# Fork and clone
git clone https://github.com/your-username/searm.git
cd searm && pnpm install

# Create feature branch
git checkout -b feature/your-feature

# Make changes, lint, and commit
pnpm lint
git commit -m "feat: add your feature"

# Push and open PR
git push origin feature/your-feature
```

### Code Style

- TypeScript for all code
- Functional components with hooks
- `pnpm lint` must pass before merge
- Follow existing patterns in `/lib` and `/app/api`

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with [Next.js 16](https://nextjs.org/), [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Neon PostgreSQL](https://neon.tech/), [Recharts](https://recharts.org/), and [Vercel](https://vercel.com/).

---
<img width="1917" height="907" alt="image" src="https://github.com/user-attachments/assets/d902ab24-daac-4c43-ab9a-984e7f6e944b" />


<p align="center"><strong>Built for maritime operations.</strong></p>
