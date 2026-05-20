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
  HelpCircle, Lightbulb, Zap, ArrowRight,
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
        content: "The Ships page manages your fleet. Each ship has detailed specifications including vessel dimensions, engine details, capacity, and maintenance tracking.",
        steps: [
          "Navigate to Ships from the sidebar and click 'Add Ship'",
          "Enter vessel details: name, type, flag, IMO number, call sign, MMSI",
          "Add physical specs: length, beam, draft, tonnage, crew capacity",
          "Track status: Active, In Maintenance, Decommissioned, In Transit",
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
        content: "The Crew Calendar page shows crew availability and assignment timelines across campaigns.",
        steps: [
          "View crew availability start dates and assignment periods on the calendar",
          "Filter by department, ship, or campaign",
          "Identify scheduling conflicts and gaps in coverage",
          "Click on crew members to jump to their profile",
        ],
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
    description: "Safety incident tracking and data export capabilities",
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
        content: "The Export page allows you to export data from any table in CSV format for reporting and analysis.",
        steps: [
          "Navigate to Export Data from the sidebar",
          "Select the data type to export (crew, ships, voyages, tasks, etc.)",
          "Apply optional filters before exporting",
          "Download the CSV file for use in spreadsheets or other tools",
        ],
        tip: "For more advanced queries and data exploration, use the Custom Tools page to build SQL queries with the visual builder.",
        related: ["Custom Tools"],
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
