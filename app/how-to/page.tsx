"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  LayoutDashboard, Users, Ship, Map, CheckSquare, Upload, Kanban,
  Settings, Shield, Download, ClipboardList, AlertTriangle, Calendar,
  Briefcase, Search, ChevronDown, ChevronRight, Anchor, BookOpen,
  Wrench, UserPlus, FileText, PenLine, Star, Navigation, Database,
  HelpCircle, Lightbulb, Zap, ArrowRight, LayoutGrid, Puzzle, CloudSun,
} from "lucide-react"

// --- Guide Data ---
interface GuideSection {
  id: string
  title: string
  icon: typeof LayoutDashboard
  description: string
  items: GuideItem[]
}

interface GuideItem {
  title: string
  content: string
  steps?: string[]
  tip?: string
  related?: string[]
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    description: "First steps to set up and start using the CRM",
    items: [
      {
        title: "Initial Setup",
        content: "When you first access the system, the first user account created becomes the System Administrator (sysadmin). This account has full access to all features including user management, system settings, and all operational tools.",
        steps: [
          "Navigate to the login page -- the system detects no users exist and prompts you to create the sysadmin account",
          "Enter your name, email, and a strong password (minimum 6 characters)",
          "Once created, you are automatically logged in and taken to the Dashboard",
          "Go to Settings to configure your organization before adding other users",
        ],
        tip: "The sysadmin account cannot be downgraded. Make sure to use a secure, memorable password.",
      },
      {
        title: "Adding Users",
        content: "The sysadmin can create additional user accounts from the Users & Roles page. Each user is assigned a role that determines their access level.",
        steps: [
          "Navigate to Users & Roles from the sidebar",
          "Click 'Add User' and fill in the name, email, password, and role",
          "Available roles: sysadmin (full access), coordinator (operational access), viewer (read-only), crew (portal access only)",
          "The user can immediately log in with their credentials",
        ],
        tip: "Crew members who apply through CSV upload can be given portal access by creating a user account with 'crew' role and linking it to their application.",
      },
      {
        title: "System Settings",
        content: "The Settings page allows sysadmins to configure required documents, e-signature documents, page visibility, and other system-wide options.",
        steps: [
          "Configure which pages are visible to non-sysadmin users",
          "Set up required document types that crew must upload (e.g. passport, STCW certificate)",
          "Define e-signature documents that crew must sign electronically",
          "Manage the document verification queue for pending uploads",
        ],
      },
      {
        title: "Understanding the Dashboard",
        content: "The Dashboard is your command center showing key metrics, recent activity, tasks, and the crew pipeline at a glance. Cards update in real-time as data changes across the system.",
        steps: [
          "Top row shows key stats: total crew, active voyages, open tasks, pending documents",
          "Pipeline chart shows crew distribution across application stages",
          "Tasks widget shows upcoming deadlines and overdue items",
          "Activity feed shows recent system-wide actions",
        ],
        related: ["Pipeline", "Tasks"],
      },
    ],
  },
  {
    id: "crew-management",
    title: "Crew Management",
    icon: Users,
    description: "Managing crew applications, profiles, and onboarding",
    items: [
      {
        title: "Uploading Crew Applications (CSV)",
        content: "The primary way to import crew applications is via CSV upload. The system maps CSV columns to database fields automatically based on predefined column mappings.",
        steps: [
          "Navigate to Upload CSV from the sidebar",
          "Drag and drop your CSV file or click to browse",
          "The system previews detected columns and shows the mapping",
          "Click 'Import' to process -- duplicates are detected by email address",
          "New applications appear with 'new_applicant' status in the Crew Applications list",
        ],
        tip: "The CSV column mapping supports all standard fields including skills (rated as Basic/Experienced/Professional), languages, maritime qualifications, and personal details.",
      },
      {
        title: "Crew Application Profiles",
        content: "Each crew application has a detailed profile page accessible by clicking on a crew member from the Applications list. The profile includes personal info, skills radar, documents, assignments, and activity history.",
        steps: [
          "Click on any crew member row in the Applications list to open their profile",
          "Use the status dropdown to advance them through the pipeline (new > reviewed > interview > approved > confirmed)",
          "Rate applicants with 1-5 stars for quick filtering",
          "Add notes, tags, and internal comments",
          "Upload and manage documents, schedule tasks, and track onboarding",
        ],
      },
      {
        title: "Tags & Filtering",
        content: "Tags allow you to categorize crew members with custom labels. The Applications list supports advanced filtering by status, country, skills, rating, and tags.",
        steps: [
          "Add tags from a crew profile page using the tag input field",
          "Filter by tags in the main Applications list using the tag filter",
          "Combine multiple filters: status + country + skills + rating range",
          "Search by name, email, phone, city, or occupation using the search bar",
        ],
      },
      {
        title: "Skills Assessment",
        content: "The system tracks 15 skill categories, each rated as Basic, Experienced, or Professional. Skills are imported from CSV data and can be edited on crew profiles.",
        steps: [
          "Skills are automatically imported from CSV columns (Small Boats, Engineering, Medical, etc.)",
          "View skill distribution on the crew profile as a visual grid",
          "Filter Applications by specific skill requirements (e.g. 'Scuba Diving: Professional')",
          "Use the Positions system to match required skills against crew skills",
        ],
      },
    ],
  },
  {
    id: "documents-esign",
    title: "Documents & E-Signatures",
    icon: FileText,
    description: "Document management, verification, and electronic signatures",
    items: [
      {
        title: "Document Uploads",
        content: "Documents can be uploaded from two places: admin users upload from crew profiles, and crew members upload through their portal. All documents are stored securely in the database.",
        steps: [
          "From a crew profile, use the Documents section to upload files",
          "Select the document type (passport, medical certificate, STCW, etc.)",
          "Optionally set an expiration date -- expired documents are flagged",
          "Check 'Requires E-Signature' if the crew member needs to sign it",
        ],
      },
      {
        title: "Document Verification Queue",
        content: "When crew members upload documents through the portal, they appear in the verification queue on the Settings page for admin review.",
        steps: [
          "Navigate to Settings to see the Document Verification Queue",
          "Click 'Review' to preview the document inline (images and PDFs)",
          "Click 'Verify' to approve the document",
          "Click 'Reject' to remove it with a reason -- the crew member will need to re-upload",
        ],
        tip: "Required document types configured in Settings are cross-referenced against uploads to track completion on each crew member's profile.",
      },
      {
        title: "Electronic Signatures",
        content: "The e-signature system allows crew to electronically sign documents from their portal. Admins define required e-sign documents in Settings.",
        steps: [
          "In Settings, add required e-signature document types (crew contract, liability waiver, etc.)",
          "Upload the document to a crew profile and check 'Requires E-Signature'",
          "The crew member sees it in their portal's E-Sign tab",
          "They sign by typing their legal name -- the system records the signature name, timestamp, and signer",
          "Signed status is reflected on both the admin crew profile and the crew portal",
        ],
      },
    ],
  },
  {
    id: "fleet-operations",
    title: "Fleet & Campaigns",
    icon: Ship,
    description: "Managing ships, campaigns (voyages), and crew assignments",
    items: [
      {
        title: "Ship Management",
        content: "The Ships page manages your fleet with full CRUD operations. Each ship has detailed specifications including vessel dimensions, engine details, capacity, and maintenance tracking. Ships can be created, edited inline, searched, and filtered.",
        steps: [
          "Navigate to Ships from the sidebar and click 'Add Ship'",
          "Enter vessel details: name, type, flag, IMO number, call sign, MMSI",
          "Add physical specs: length, beam, draft, tonnage, crew capacity",
          "Track status: Active, In Maintenance, Decommissioned, In Transit",
          "Edit any ship by hovering its card and clicking the pencil icon -- the form pre-populates with all current values",
          "The edit dialog has four sections: Identity (name, type, flag), Registration (IMO, MMSI, call sign), Specifications (dimensions, tonnage, engine), and Notes",
          "Search ships by name, type, flag, or IMO using the search bar at the top",
          "Filter by status or ship type using the dropdown filters",
          "All edits are logged to the activity timeline for audit purposes",
          "Each ship has a detail page with maintenance logs, supply tracking, and crew assignments",
        ],
      },
      {
        title: "Campaign (Voyage) Management",
        content: "Campaigns (voyages) represent missions with a ship, dates, crew roster, and objectives. They flow through stages: Planned > Crewing > Ready > Active > Completed.",
        steps: [
          "Navigate to Campaigns and click 'Create Campaign'",
          "Set the campaign name, ship, departure/return dates, ports, and mission type",
          "Open positions for the campaign from the Positions page",
          "Assign crew to the campaign as positions are filled",
          "Track campaign status and crew roster from the campaign detail page",
        ],
      },
      {
        title: "Positions & Assignments",
        content: "Positions define crew roles needed for a campaign. The Positions page shows all open and filled roles with required skill matching.",
        steps: [
          "From Positions, create roles for a specific campaign (e.g. Chief Engineer, Deckhand)",
          "Set the department, required skills, minimum skill level, and priority",
          "The system shows skill match scores against available crew",
          "Assign crew to positions -- this creates a crew assignment record",
          "Track assignment status: Assigned > Travel > On Board > Active > Completed",
        ],
      },
      {
        title: "Crew Calendar & Availability",
        content: "The Crew Calendar page shows crew availability and assignment timelines across campaigns. Two view modes are available: Timeline (Gantt-style) and Heatmap (calendar grid).",
        steps: [
          "View crew availability start dates and assignment periods on the timeline",
          "Switch between Timeline and Heatmap views using the toggle in the header",
          "Timeline view: Gantt-style bars showing availability windows and assignment overlaps per crew member",
          "Heatmap view: A traditional month-grid calendar where each day is color-coded by crew availability",
          "Heatmap colors: white = nobody available, light red = 1 person, darker red = more people available",
          "Hover any day on the heatmap to see exactly which crew members are available and their department",
          "Navigate between months with the arrow buttons or jump to today",
          "Filter by department, ship, or campaign in both views",
          "Click on crew members to jump to their profile",
        ],
      },
      {
        title: "Live Vessel Map",
        content: "The Live Map page provides a full-screen, real-time vessel tracking dashboard built on Leaflet. It aggregates vessel positions from multiple data sources including AISHub, MarineTraffic, VesselFinder, AIS Stream (WebSocket), custom REST APIs, and your internal SeaRM fleet. External source data is displayed live without saving to your database -- only your internal fleet positions are persisted.",
        steps: [
          "Navigate to Fleet & Campaigns > Live Map in the sidebar",
          "Open the Sources tab in the left panel and click Add to configure a data source",
          "Choose a source type (AISHub, MarineTraffic, VesselFinder, AIS Stream, Custom API, or Internal Fleet)",
          "Enter the required API credentials and connection details for your chosen source",
          "Activate the source and click Load/Fetch to pull vessel positions",
          "External sources load data live (shown with 'LIVE' badge) -- only Internal Fleet saves to the database",
          "Multiple source fetches merge together -- load from several sources to build a complete picture",
          "Use the Vessels tab to search by name, MMSI, IMO, callsign, flag, or destination across all loaded vessels",
          "Filter by ship type (Cargo, Tanker, Passenger, etc.) and click any vessel to fly to it on the map",
          "Use the Layers tab to switch between Dark Ocean, Satellite, Nautical, and Light base maps",
          "Toggle vessel trails and labels for enhanced situational awareness",
          "Auto-refresh runs every 30 seconds (can be paused from the top status bar)",
          "Click any vessel marker on the map to see full details in a popup and detail card",
          "The map uses viewport-based rendering -- only vessels within your current view are rendered (up to 800) for performance",
          "The status bar shows total vessels, fleet count, live count, and a 'clear' button to dismiss live data",
        ],
        tip: "External source data never touches your database. This keeps your DB clean and performant while still letting you see thousands of global vessels on the map.",
      },
      {
        title: "Weather Overlays",
        content: "The Weather tab in the map panel lets you add real-time weather tile layers on top of the map. Multiple free and API-key-based weather providers are supported, plus a custom tile URL option for bring-your-own sources.",
        steps: [
          "Open the Weather tab in the left panel and click 'Add Weather Source'",
          "Choose from available providers: RainViewer (free radar), OpenWeatherMap (requires free API key), Ocean Depth/GEBCO (free bathymetry), NOAA/Iowa State (free US NEXRAD radar), or Custom Tile URL",
          "Providers marked 'Free' work immediately with no setup -- the first layer auto-enables on add",
          "For OpenWeatherMap, sign up at openweathermap.org for a free API key, then enter it in the API Key field",
          "Toggle individual layers on/off with the switches (e.g. enable Precipitation Radar but disable Cloud Cover)",
          "Use the global opacity slider at the top to adjust weather overlay transparency (10%-100%)",
          "Weather tiles render on top of the base map but behind vessel markers so ships remain visible",
          "RainViewer radar data refreshes automatically every 5 minutes to show latest precipitation",
          "Custom Tile URL: enter any XYZ tile URL with {z}/{x}/{y} placeholders and optional {apikey} for your own sources",
          "Remove any provider by clicking the trash icon -- its layers are immediately removed from the map",
        ],
        tip: "RainViewer and NOAA NEXRAD are both free with no API key. Ocean Depth (GEBCO/NCEI) shows bathymetric seafloor topography which is useful for route planning near shallow waters.",
        related: ["Live Vessel Map"],
      },
    ],
  },
  {
    id: "pipeline-tasks",
    title: "Pipeline & Tasks",
    icon: Kanban,
    description: "Visual pipeline, task management, and onboarding workflows",
    items: [
      {
        title: "Pipeline View",
        content: "The Pipeline page shows crew applications as a visual Kanban board with drag-and-drop columns for each status stage.",
        steps: [
          "View all applications organized by status in columns",
          "Each card shows the applicant name, rating, country, and key skills",
          "Click cards to open the full crew profile",
          "Use filters to focus on specific departments or skill sets",
        ],
      },
      {
        title: "Task Management",
        content: "Tasks track action items across the system -- follow-ups, interviews, document requests, background checks, and more.",
        steps: [
          "Create tasks from the Tasks page or from a crew profile",
          "Set the type (interview, follow-up, documents needed, etc.), priority, due date, and assignee",
          "Tasks can be linked to crew members, campaigns, or ships",
          "Filter by status (open, in progress, completed), priority, and type",
          "Overdue tasks are automatically flagged and appear on the Dashboard",
        ],
      },
      {
        title: "Onboarding Checklists",
        content: "Onboarding checklists provide structured workflows for bringing crew members on board. Three templates are available: Standard, Volunteer, and Officer.",
        steps: [
          "From a crew profile, create an onboarding checklist",
          "Select a template -- each has pre-defined items (passport check, medical clearance, safety briefing, etc.)",
          "Optionally auto-create tasks for each checklist item",
          "Track completion on the crew profile and in the Onboarding overview page",
          "Crew members can see their checklist progress in the crew portal",
        ],
      },
    ],
  },
  {
    id: "crew-portal",
    title: "Crew Portal",
    icon: Anchor,
    description: "The self-service portal for crew members",
    items: [
      {
        title: "Portal Overview",
        content: "The crew portal is a separate self-service interface for crew members. They log in with 'crew' role accounts and see their own application status, documents, requirements, and e-signatures.",
        steps: [
          "Crew members access the portal at /portal after logging in",
          "They see their onboarding progress timeline with 8 stages",
          "Overview tab shows key stats: requirements completed, documents uploaded, signatures needed",
          "Tabs provide access to Requirements, Documents, E-Signatures, and Profile sections",
        ],
      },
      {
        title: "Document Uploads (Portal)",
        content: "Crew can upload their own documents through the portal. Uploads enter the admin verification queue automatically.",
        steps: [
          "From the Documents tab, crew can see all required document types",
          "Upload files with the document type and expiration date",
          "View previously uploaded documents and their verification status",
          "Delete documents that need to be replaced",
        ],
      },
      {
        title: "E-Signing (Portal)",
        content: "The E-Sign tab shows all documents requiring the crew member's electronic signature.",
        steps: [
          "View required e-sign documents and their current status",
          "Click 'Sign' on any unsigned document",
          "Type your legal name as your electronic signature",
          "The signature is recorded with timestamp and displayed on the document",
        ],
      },
    ],
  },
  {
    id: "incidents-export",
    title: "Incidents & Data Export",
    icon: AlertTriangle,
    description: "Safety incident tracking and comprehensive data export",
    items: [
      {
        title: "Incident Reporting",
        content: "The Incidents page tracks safety and operational incidents across the fleet. Incidents have severity levels, categories, and can be linked to ships and crew.",
        steps: [
          "Navigate to Incidents and click 'Report Incident'",
          "Set severity (low/medium/high/critical), category, and status",
          "Link to a specific ship and crew member if applicable",
          "Add detailed description and any follow-up actions",
          "Track resolution status: open > investigating > resolved > closed",
        ],
      },
      {
        title: "Data Export",
        content: "The Export page supports exporting all 18+ data sources across the entire system in CSV or JSON format. Data sources are organized by category: Crew, Fleet & Operations, Tasks & Safety, Documents & Email, and System.",
        steps: [
          "Navigate to Export Data from the sidebar",
          "Browse data sources organized into categories (Crew, Fleet, Tasks, Documents, System)",
          "Click any card to select it, or use 'Select All' to batch-select multiple exports",
          "Choose format: CSV for spreadsheets or JSON for programmatic use",
          "Click 'Download' on individual cards for single exports, or 'Export Selected' for batch downloads",
          "Batch exports download sequentially with a small delay to avoid browser blocking",
        ],
        tip: "All exports include JOINed data where relevant -- for example, voyage exports include ship names, task exports include crew and voyage names, and assignment exports include crew details and reviews.",
        related: ["Custom Tools"],
      },
      {
        title: "Available Export Sources",
        content: "The following data can be exported: Crew Applications (with all 15 skill ratings), Crew Assignments, Sea Time Records, Crew Check-Ins, Crew Tags, Onboarding Checklists, Ships/Fleet, Voyages, Crew Positions, Ship Maintenance, Ship Supplies, Tasks, Incidents, Activity Log, Documents, Email Templates, Email Queue, Users & Roles, and Widgets.",
        tip: "User exports exclude passwords for security. Widget exports include configuration but not access tokens.",
      },
    ],
  },
  {
    id: "widget-builder",
    title: "Widget Builder",
    icon: LayoutGrid,
    description: "Create embeddable data widgets for external websites",
    items: [
      {
        title: "Widget Builder Overview",
        content: "The Widget Builder (accessible via sidebar) replaces the old integrations system. It lets you create secure, embeddable widgets that pull live data from your database and display it on any external website. Each widget has its own access token, rate limiting, and domain whitelisting for security.",
        steps: [
          "Navigate to Widget Builder from the sidebar (under the old 'Integrations' label)",
          "The 'My Widgets' tab shows all created widgets with status, views, and quick actions",
          "The 'Create Widget' tab launches a 6-step wizard to build a new widget",
          "Each widget generates embed code (script tag or iframe) for copying into external sites",
        ],
      },
      {
        title: "Creating a Widget (6-Step Wizard)",
        content: "The widget creation wizard guides you through selecting a data source, choosing columns, adding filters, picking a view type, applying a style preset, and publishing.",
        steps: [
          "Step 1 -- Select Data Source: Choose from 9 database tables (voyages, ships, crew applications, assignments, sea time, tasks, incidents, activities, crew check-ins)",
          "Step 2 -- Choose Columns: Select which columns to display. All column types are supported (text, dates, numbers, badges, emails, booleans, JSON)",
          "Step 3 -- Filters & Sort: Add filters (equals, contains, greater than, etc.) and set sort column/direction plus max row count",
          "Step 4 -- View Type: Choose how data is displayed -- Table, Cards, List, Stats, Timeline, or Minimal",
          "Step 5 -- Style & Preview: Pick a visual style preset and see a live preview that updates instantly when you change any setting",
          "Step 6 -- Name & Publish: Give the widget a name, optional description, set rate limits, and publish. The system generates a unique access token and embed code.",
        ],
        tip: "The live preview in steps 5-6 renders inside an isolated iframe so styles are never overridden by the host page CSS.",
      },
      {
        title: "View Types",
        content: "Six view types are available, each adapting dynamically to show ALL selected columns regardless of how many you choose. No data is ever dropped or hidden.",
        steps: [
          "Table: Full data grid with horizontal scroll for many columns, alternating row colors, right-aligned numbers",
          "Cards: Each row becomes a card with auto-detected title, subtitle, and all remaining columns as labeled key-value fields",
          "List: Compact rows with title + inline meta tags. All additional columns are shown in a secondary detail row",
          "Stats: Aggregates data into stat cards -- sums/averages for numbers, top values for text/badges, date ranges for dates, unique counts for all types",
          "Timeline: Orders by the best date column with connecting dots. Title + all other columns shown as labeled tags",
          "Minimal: Ultra-clean format with title + all remaining columns displayed inline with dot separators",
        ],
      },
      {
        title: "Style Presets",
        content: "Six professionally designed style presets are available. Each generates fully self-contained CSS that works on any website without conflicts.",
        steps: [
          "Modern: Clean white background with blue accents -- versatile for any site",
          "Ocean: Deep navy background with cyan highlights -- maritime themed",
          "Minimal: High contrast black-on-white monochrome -- ultra-clean",
          "Vibrant: Warm orange accents on light stone background -- eye-catching",
          "Corporate: Soft purple tones -- professional and elegant",
          "Seafoam: Mint and teal -- perfect for maritime and environmental themes",
        ],
        tip: "Widget CSS uses !important on all properties and scoped selectors to prevent host site stylesheets from overriding the widget appearance.",
      },
      {
        title: "Embedding Widgets",
        content: "Each published widget provides ready-to-copy embed code in two formats: a JavaScript script tag (recommended) or an iframe. The embed code can be pasted into any HTML page.",
        steps: [
          "From 'My Widgets', click 'Copy Embed Code' for the script tag version",
          "Or click 'Copy Iframe Code' for a simple iframe embed",
          "Paste the code into your external website's HTML where you want the widget to appear",
          "The widget loads data live from your API, so it always shows current data",
          "Widgets respect rate limits, domain whitelisting, and require the access token to function",
        ],
        tip: "Script embeds render directly into your page DOM. Iframe embeds provide complete CSS isolation and are recommended when host site styles might conflict.",
        related: ["Data Export"],
      },
      {
        title: "Widget Security & Management",
        content: "Widgets are secured with unique 64-character access tokens, per-widget rate limiting, domain whitelisting, and full audit logging. All data access is read-only.",
        steps: [
          "Each widget gets a unique access token generated on creation -- never shared across widgets",
          "Set rate limits (requests per minute) to prevent abuse -- default is 60 req/min",
          "Optionally restrict to specific domains via the allowed_domains field",
          "Toggle widgets on/off with the enable/disable switch from My Widgets",
          "Delete widgets permanently when no longer needed",
          "All widget access is logged in widget_logs with IP, user agent, referer, response time, and row count",
        ],
      },
    ],
  },
  {
    id: "extensions",
    title: "Extensions",
    icon: Puzzle,
    description: "Install, configure, and manage SeaRM extensions for automation and integrations",
    items: [
      {
        title: "Extensions Overview",
        content: "The Extensions page allows sysadmins to install plugin-like extensions that hook into SeaRM events, run scheduled cron jobs, and automate workflows. Extensions are defined by JSON manifests and require no code deployment.",
        steps: [
          "Navigate to Extensions from the sidebar",
          "The 'Installed' tab shows all installed extensions with status, version, hooks, and configuration",
          "The 'Default Extensions' tab provides 5 pre-made extensions ready for one-click install",
          "The 'Install Custom' tab lets you paste a JSON manifest to install any custom extension",
          "The 'Developer Guide' tab is a full reference for building your own extensions",
          "The 'Logs' tab shows all extension activity, errors, and configuration changes",
        ],
      },
      {
        title: "Default Extensions",
        content: "Five production-ready extensions are available out of the box. Each can be installed with one click, then configured and activated from the Installed tab.",
        steps: [
          "Slack Crew Notifier: Posts crew application events and voyage departures to a Slack channel via webhook. Configure the webhook URL and choose which events trigger notifications.",
          "Document Expiry Monitor: Runs a daily cron job at 7 AM to check for crew documents nearing expiration. Sends warning emails at configurable thresholds (default: 30 days warning, 7 days critical).",
          "Voyage Weather Briefing: Fetches marine weather data from a configurable API when a voyage status changes to departing. Auto-attaches weather briefings to voyage notes.",
          "Crew Onboarding Automator: Triggers when an application is approved -- creates onboarding checklists, sends welcome emails, and assigns default training tasks when crew is put on a voyage.",
          "Maintenance Scheduler: Generates recurring maintenance tasks on a weekly cron schedule, tracks completion, schedules follow-up inspections, and escalates overdue maintenance via email.",
        ],
      },
      {
        title: "Installing & Configuring Extensions",
        content: "Extensions are installed from a JSON manifest and start in an 'inactive' state. They must be explicitly activated to begin processing events.",
        steps: [
          "From Default Extensions, click 'Install' on any pre-made extension",
          "Or from Install Custom, paste a valid JSON manifest and click 'Validate' then 'Install'",
          "Once installed, go to the 'Installed' tab and expand the extension with the settings icon",
          "Fill in required configuration fields (API keys, webhook URLs, email addresses, etc.)",
          "Click 'Save Configuration' to persist settings",
          "Click 'Activate' to start the extension -- it will begin listening to event hooks and running cron jobs",
          "Click 'Deactivate' to pause the extension without uninstalling it",
          "Click the trash icon to permanently uninstall an extension and remove all its data",
        ],
        tip: "Extensions with dependencies will require those dependencies to be installed and active first. The system validates this automatically on installation and activation.",
      },
      {
        title: "Extension Capabilities",
        content: "Extensions can declare hooks (event listeners that fire on specific SeaRM events), cron jobs (scheduled tasks), permissions (what data the extension can access), and configuration schemas (admin-editable settings).",
        steps: [
          "Hooks: Listen to events like crew.application.received, voyage.departed, document.uploaded, maintenance.completed, etc.",
          "Cron Jobs: Run scheduled tasks (e.g., daily compliance checks, weekly maintenance generation)",
          "Permissions: Control what the extension can access (read:crew, write:tasks, send:email, access:api, etc.)",
          "Config Schema: Define admin-editable fields with types (string, number, boolean, url, password, select, textarea)",
          "Dependencies: Extensions can depend on other extensions being installed and active",
        ],
        tip: "Check the Developer Guide tab in the Extensions page for the full manifest schema, hook events list, and example extensions.",
        related: ["Widget Builder"],
      },
    ],
  },
  {
    id: "custom-tools",
    title: "Custom Tools",
    icon: Wrench,
    description: "Building custom queries and reusable data tools",
    items: [
      {
        title: "Visual Query Builder",
        content: "The Custom Tools page provides a visual interface for building database queries without writing SQL. Select a table, pick columns, add filters with logical operators, and set sort order.",
        steps: [
          "Navigate to Custom Tools from the sidebar",
          "Select a source table from the dropdown",
          "Pick specific columns or leave as 'All'",
          "Add filter conditions with AND/OR logic",
          "Set operators: equals, not equals, greater than, less than, contains, is empty, in list, etc.",
          "Choose sort column and direction, set row limit",
          "Click 'Run Query' to execute",
        ],
      },
      {
        title: "Raw SQL Mode",
        content: "Switch to Raw SQL mode for full query flexibility. Write complex queries with JOINs, subqueries, aggregations, and CTEs.",
        steps: [
          "Click 'Raw SQL' toggle at the top of the query builder",
          "Write any SELECT query -- INSERT/UPDATE/DELETE are blocked for safety",
          "Press Ctrl+Enter to execute",
          "Use the 'View SQL' button in visual mode to see the generated SQL and switch to raw for editing",
        ],
        tip: "The schema sidebar on the left shows all tables and their columns with data types. Expand any table to see its structure.",
      },
      {
        title: "Display Modes",
        content: "Query results can be displayed in four different formats to best suit the data type.",
        steps: [
          "Table: Traditional data grid with sortable columns -- best for detailed data",
          "Cards: Card layout showing each row as a card -- best for profile-like data",
          "Statistic: Large number display -- best for aggregate queries (COUNT, SUM, AVG)",
          "List: Compact list format -- best for simple lookups",
        ],
      },
      {
        title: "Saving & Managing Tools",
        content: "Save any query as a reusable tool with a name, color, and category. Saved tools appear as tabs for instant access.",
        steps: [
          "After running a query, click 'Save as Tool'",
          "Give it a name, description, category, and color",
          "The tool appears as a new tab at the top of the page",
          "Click any tool tab to run its query and see live results",
          "Star tools as favorites for quick access",
          "Edit, refresh, or delete tools from their tab view",
        ],
        tip: "Tools are shared -- any user can see and use saved tools created by anyone.",
      },
    ],
  },
]

// --- Component ---
export default function HowToPage() {
  const [activeSection, setActiveSection] = useState("getting-started")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["Initial Setup"]))

  const toggleItem = (title: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  // Search across all sections
  const searchResults = searchQuery.trim().length > 1
    ? GUIDE_SECTIONS.flatMap((s) =>
        s.items.filter((item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.steps?.some((step) => step.toLowerCase().includes(searchQuery.toLowerCase()))
        ).map((item) => ({ ...item, section: s }))
      )
    : []

  const activeGuide = GUIDE_SECTIONS.find((s) => s.id === activeSection)

  return (
    <div className="flex flex-col gap-0 h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b bg-card/50 px-6 py-4">
        <div className="max-w-[1600px]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">How to Use</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Complete guide to all CRM features and workflows</p>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-xs"
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left nav */}
        <div className="w-56 shrink-0 border-r bg-card/30 overflow-y-auto">
          <div className="p-3 flex flex-col gap-0.5">
            {GUIDE_SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setSearchQuery("") }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
                  <span className="truncate">{section.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            {/* Search results mode */}
            {searchQuery.trim().length > 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                  </h2>
                </div>
                {searchResults.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-12 flex flex-col items-center gap-3">
                      <HelpCircle className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No matching guides found</p>
                      <p className="text-xs text-muted-foreground/60">Try a different search term</p>
                    </CardContent>
                  </Card>
                )}
                {searchResults.map((item, i) => (
                  <Card key={i} className="border-border/60 hover:border-primary/20 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <item.section.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold">{item.title}</h3>
                            <Badge variant="outline" className="text-[9px]">{item.section.title}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Section content mode */}
            {(!searchQuery.trim() || searchQuery.trim().length <= 1) && activeGuide && (
              <div className="flex flex-col gap-6">
                {/* Section header */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <activeGuide.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{activeGuide.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeGuide.description}</p>
                  </div>
                </div>

                {/* Guide items */}
                <div className="flex flex-col gap-2">
                  {activeGuide.items.map((item) => {
                    const isExpanded = expandedItems.has(item.title)
                    return (
                      <Card key={item.title} className="border-border/60 overflow-hidden">
                        <button
                          onClick={() => toggleItem(item.title)}
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold">{item.title}</h3>
                            {!isExpanded && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>
                            )}
                          </div>
                          {item.steps && (
                            <Badge variant="outline" className="text-[9px] shrink-0">{item.steps.length} steps</Badge>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t px-4 pb-4 pt-3">
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{item.content}</p>

                            {item.steps && item.steps.length > 0 && (
                              <div className="flex flex-col gap-2 mb-4">
                                {item.steps.map((step, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                      <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                                    </div>
                                    <p className="text-xs text-foreground leading-relaxed flex-1">{step}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {item.tip && (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-chart-4/[0.05] border border-chart-4/15">
                                <Lightbulb className="h-3.5 w-3.5 text-chart-4 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-muted-foreground leading-relaxed"><span className="font-medium text-foreground">Tip:</span> {item.tip}</p>
                              </div>
                            )}

                            {item.related && item.related.length > 0 && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                <span className="text-[10px] text-muted-foreground">Related:</span>
                                {item.related.map((r) => (
                                  <Badge key={r} variant="outline" className="text-[9px] cursor-pointer hover:bg-muted">{r}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>

                {/* Quick links to next section */}
                {(() => {
                  const currentIdx = GUIDE_SECTIONS.findIndex((s) => s.id === activeSection)
                  const nextSection = GUIDE_SECTIONS[currentIdx + 1]
                  if (!nextSection) return null
                  return (
                    <button
                      onClick={() => setActiveSection(nextSection.id)}
                      className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group"
                    >
                      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <nextSection.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Next Section</p>
                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">{nextSection.title}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
