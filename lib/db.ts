import { neon as createNeon, type NeonQueryFunction } from "@neondatabase/serverless"

let cachedSql: NeonQueryFunction<false, false> | null = null

export function getDb() {
  if (!cachedSql) {
    // Create stub for build time
    if (!process.env.DATABASE_URL) {
      // Return a stub function (tagged-template) with a .query method during build
      const stub = (async (..._args: any[]) => []) as any
      stub.query = async (..._args: any[]) => []
      stub.unsafe = (s: string) => s
      return stub
    }
    cachedSql = createNeon(process.env.DATABASE_URL)
  }
  return cachedSql
}

// Crew member status lifecycle
export const CREW_STATUSES = [
  "application",
  "screening",
  "interview",
  "verified",
  "volunteer",
  "active",
  "standby",
  "inactive",
  "alumni",
  "rejected",
] as const

export type CrewStatus = (typeof CREW_STATUSES)[number]

// Keep old names as aliases for backward compatibility during migration
export const APPLICANT_STATUSES = CREW_STATUSES
export type ApplicantStatus = CrewStatus

export const STATUS_LABELS: Record<CrewStatus, string> = {
  application: "Application",
  screening: "Screening",
  interview: "Interview",
  verified: "Verified",
  volunteer: "Volunteer",
  active: "Active",
  standby: "Standby",
  inactive: "Inactive",
  alumni: "Alumni",
  rejected: "Rejected",
}

export const STATUS_COLORS: Record<CrewStatus, string> = {
  application: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  screening: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  interview: "bg-warning/15 text-warning border-warning/25",
  verified: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  volunteer: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  active: "bg-success/15 text-success border-success/25",
  standby: "bg-primary/15 text-primary border-primary/25",
  inactive: "bg-muted text-muted-foreground border-border",
  alumni: "bg-sidebar-accent/50 text-sidebar-foreground border-sidebar-border",
  rejected: "bg-destructive/15 text-destructive border-destructive/25",
}

export const SKILL_LEVELS = ["", "Basic", "Experienced", "Professional"] as const

export const SKILL_FIELDS = [
  { key: "skill_small_boats", label: "Small Boats" },
  { key: "skill_engineering", label: "Engineering" },
  { key: "skill_mechanical", label: "Mechanical" },
  { key: "skill_scuba_diving", label: "Scuba Diving" },
  { key: "skill_electrical", label: "Electrical" },
  { key: "skill_electronics", label: "Electronics & IT" },
  { key: "skill_cooking", label: "Cooking" },
  { key: "skill_media", label: "Media" },
  { key: "skill_drone", label: "Drone" },
  { key: "skill_photography", label: "Photography" },
  { key: "skill_videography", label: "Videography" },
  { key: "skill_medical", label: "Medical" },
  { key: "skill_welding", label: "Welding" },
  { key: "skill_crane_operation", label: "Crane Operation" },
  { key: "skill_biology_science", label: "Biology/Science" },
] as const

// CSV column mapping - maps CSV headers to database fields
export const CSV_COLUMN_MAP: Record<string, string> = {
  "Timestamp": "timestamp",
  "First Name": "first_name",
  "Last Name": "last_name",
  "Email Address": "email_address",
  "Email": "email_alt",
  "Phone Number": "phone",
  "What's App Number": "whatsapp",
  "Date of Birth": "date_of_birth",
  "Gender": "gender",
  "Country": "country",
  "Address": "address",
  "City": "city",
  "Zip/Postal Code": "zip_code",
  "Please upload a Profile Picture": "profile_picture_url",
  "Current Occupation": "current_occupation",
  "Why would you like to join SeaRM": "motivation",
  "Have you volunteered previously with the Captain Paul Watson Foundation or any other Sea Shepherd Entity previously? If so, please provide details (entity, role etc).": "previous_volunteer",
  "Approximate Availability Start Date": "availability_start_date",
  "Duration (weeks, months)": "duration",
  "Check All Languages of Fluency": "languages",
  "List any other languages of proficiency": "other_languages",
  "Do you have Professional Maritime Qualifications": "maritime_qualifications",
  "Professional Qualifications ": "professional_qualifications",
  "If selected which department would you like to be considered for?": "department_preference",
}

// Skill column patterns in CSV
export const CSV_SKILL_MAP: Record<string, string> = {
  "Small Boats/Tender Operation": "skill_small_boats",
  "Engineering": "skill_engineering",
  "Mechanical": "skill_mechanical",
  "Scuba Diving": "skill_scuba_diving",
  "Electrical": "skill_electrical",
  "Electronics & IT Systems": "skill_electronics",
  "Cooking": "skill_cooking",
  "Media": "skill_media",
  "Drone": "skill_drone",
  "Photography": "skill_photography",
  "Videography": "skill_videography",
  "Medical": "skill_medical",
  "Welding": "skill_welding",
  "Crane Operation": "skill_crane_operation",
  "Biology/Science": "skill_biology_science",
}

export interface CrewMember {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: CrewStatus
  rating: number
  gender: string
  country: string
  city: string
  date_of_birth: string
  current_occupation: string
  availability_start_date: string
  duration: string
  languages: string
  maritime_qualifications: string
  department_preference: string
  has_criminal_record: boolean
  position_id: string | null
  preferred_position_id: string | null
  skill_small_boats: string
  skill_engineering: string
  skill_mechanical: string
  skill_scuba_diving: string
  skill_electrical: string
  skill_electronics: string
  skill_cooking: string
  skill_media: string
  skill_drone: string
  skill_photography: string
  skill_videography: string
  skill_medical: string
  skill_welding: string
  skill_crane_operation: string
  skill_biology_science: string
  application_data: Record<string, string>
  notes: string
  upload_batch_id: string
  csv_row_number: number
}

// Backward-compatible alias
export type CrewApplication = CrewMember

// Ship types
export const SHIP_TYPES = ["research", "patrol", "rescue", "supply", "other"] as const
export const SHIP_STATUSES = ["active", "maintenance", "decommissioned", "in_transit"] as const
export type ShipType = (typeof SHIP_TYPES)[number]
export type ShipStatus = (typeof SHIP_STATUSES)[number]

export const SHIP_TYPE_LABELS: Record<ShipType, string> = {
  research: "Research Vessel",
  patrol: "Patrol Boat",
  rescue: "Rescue Vessel",
  supply: "Supply Ship",
  other: "Other",
}

export const SHIP_STATUS_LABELS: Record<ShipStatus, string> = {
  active: "Active",
  maintenance: "In Maintenance",
  decommissioned: "Decommissioned",
  in_transit: "In Transit",
}

export const SHIP_STATUS_COLORS: Record<ShipStatus, string> = {
  active: "bg-success/15 text-success border-success/25",
  maintenance: "bg-warning/15 text-warning border-warning/25",
  decommissioned: "bg-destructive/15 text-destructive border-destructive/25",
  in_transit: "bg-chart-4/15 text-chart-4 border-chart-4/25",
}

export interface Ship {
  id: string
  name: string
  type: ShipType
  flag: string
  imo_number: string
  call_sign: string
  mmsi: string
  length_m: number
  beam_m: number
  draft_m: number
  gross_tonnage: number
  crew_capacity: number
  year_built: number
  hull_material: string
  engine_type: string
  max_speed_knots: number
  home_port: string
  status: ShipStatus
  notes: string
  vessel_data: Record<string, any>
  created_at: string
  updated_at: string
}

// Voyage types
export const VOYAGE_STATUSES = ["planned", "crewing", "ready", "active", "completed", "cancelled"] as const
export type VoyageStatus = (typeof VOYAGE_STATUSES)[number]

export const VOYAGE_STATUS_LABELS: Record<VoyageStatus, string> = {
  planned: "Planned",
  crewing: "Crewing",
  ready: "Ready",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const VOYAGE_STATUS_COLORS: Record<VoyageStatus, string> = {
  planned: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  crewing: "bg-warning/15 text-warning border-warning/25",
  ready: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  active: "bg-success/15 text-success border-success/25",
  completed: "bg-primary/15 text-primary border-primary/25",
  cancelled: "bg-destructive/15 text-destructive border-destructive/25",
}

export interface Voyage {
  id: string
  ship_id: string | null
  voyage_name: string
  description: string
  departure_port: string
  destination_port: string
  departure_date: string | null
  return_date: string | null
  status: VoyageStatus
  mission_type: string
  mission_objectives: string
  notes: string
  voyage_data: Record<string, any>
  created_at: string
  updated_at: string
}

// Task types
export const TASK_TYPES = [
  "follow_up", "interview", "documents_needed", "background_check",
  "medical_exam", "reference_check", "send_welcome_guide", "send_crew_forms",
  "visa_check", "travel_arrangement", "sign_on", "sign_off", "crew_review", "general"
] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  follow_up: "Follow-up",
  interview: "Interview",
  documents_needed: "Documents Needed",
  background_check: "Background Check",
  medical_exam: "Medical Exam",
  reference_check: "Reference Check",
  send_welcome_guide: "Send Welcome Guide",
  send_crew_forms: "Send Crew Forms",
  visa_check: "Visa Check",
  travel_arrangement: "Travel Arrangement",
  sign_on: "Sign On",
  sign_off: "Sign Off",
  crew_review: "Crew Review",
  general: "General",
}

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_STATUSES = ["open", "in_progress", "completed", "cancelled", "overdue"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  overdue: "Overdue",
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  high: "bg-warning/15 text-warning border-warning/25",
  urgent: "bg-destructive/15 text-destructive border-destructive/25",
}

export interface Task {
  id: string
  crew_id: string | null
  voyage_id: string | null
  ship_id: string | null
  title: string
  description: string
  task_type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Departments & Positions
export const DEPARTMENTS = [
  "Deck", "Engine", "Bridge", "Galley", "Media", "Medical",
  "Science", "Small Boats", "Drone", "Admin",
] as const
export type Department = (typeof DEPARTMENTS)[number]

export const COMMON_POSITIONS = [
  "Captain", "First Mate", "Second Mate", "Third Mate", "Bosun",
  "Deckhand", "Chief Engineer", "Second Engineer", "Oiler",
  "Cook", "Steward", "Medic", "Photographer", "Videographer",
  "Drone Pilot", "Small Boat Driver", "Diver", "Science Officer",
  "Communications Officer", "Volunteer", "Campaign Leader",
] as const

// Assignment types
export const ASSIGNMENT_STATUSES = [
  "assigned", "travel", "on_board", "active", "completed", "signed_off", "cancelled",
] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: "Assigned",
  travel: "In Travel",
  on_board: "On Board",
  active: "Active",
  completed: "Completed",
  signed_off: "Signed Off",
  cancelled: "Cancelled",
}

export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  assigned: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  travel: "bg-warning/15 text-warning border-warning/25",
  on_board: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  active: "bg-success/15 text-success border-success/25",
  completed: "bg-primary/15 text-primary border-primary/25",
  signed_off: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  cancelled: "bg-destructive/15 text-destructive border-destructive/25",
}

export interface CrewAssignment {
  id: string
  crew_id: string
  voyage_id: string
  position_id: string | null
  role: string
  department: string
  status: AssignmentStatus
  expected_join_date: string | null
  actual_join_date: string | null
  expected_departure_date: string | null
  actual_departure_date: string | null
  sign_on_date: string | null
  sign_off_date: string | null
  days_at_sea: number
  crew_review: string
  crew_review_rating: number
  reviewed_by: string
  notes: string
  created_at: string
  updated_at: string
}

// Position types
export const POSITION_STATUSES = [
  "open", "candidates_identified", "interviewing", "offered", "filled", "cancelled",
] as const
export type PositionStatus = (typeof POSITION_STATUSES)[number]

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  open: "Open",
  candidates_identified: "Candidates Identified",
  interviewing: "Interviewing",
  offered: "Offered",
  filled: "Filled",
  cancelled: "Cancelled",
}

export const POSITION_STATUS_COLORS: Record<PositionStatus, string> = {
  open: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  candidates_identified: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  interviewing: "bg-warning/15 text-warning border-warning/25",
  offered: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  filled: "bg-success/15 text-success border-success/25",
  cancelled: "bg-destructive/15 text-destructive border-destructive/25",
}

export interface CrewPosition {
  id: string
  voyage_id: string
  position_name: string
  department: string
  required_skills: { skill: string; level: string }[]
  min_skill_level: string
  priority: string
  status: PositionStatus
  assigned_crew_id: string | null
  notes: string
  created_at: string
  updated_at: string
}

// Sea Time
export interface SeaTime {
  id: string
  crew_id: string
  voyage_id: string | null
  ship_id: string | null
  role: string
  embarked_at: string | null
  disembarked_at: string | null
  days: number
  notes: string
  created_at: string
}

// Check-in/out
export interface CrewCheckin {
  id: string
  crew_id: string
  voyage_id: string | null
  ship_id: string | null
  check_type: "check_in" | "check_out"
  checked_at: string
  location: string
  notes: string
  recorded_by: string
  created_at: string
}

// Ship Maintenance
export const MAINTENANCE_CATEGORIES = [
  "engine", "hull", "electrical", "navigation", "safety_equipment",
  "communications", "plumbing", "hvac", "deck_equipment", "general",
] as const

export const MAINTENANCE_STATUSES = [
  "scheduled", "in_progress", "completed", "cancelled", "overdue",
] as const

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed",
  cancelled: "Cancelled", overdue: "Overdue",
}

export const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  in_progress: "bg-warning/15 text-warning border-warning/25",
  completed: "bg-success/15 text-success border-success/25",
  cancelled: "bg-muted text-muted-foreground border-border",
  overdue: "bg-destructive/15 text-destructive border-destructive/25",
}

export interface ShipMaintenance {
  id: string
  ship_id: string
  title: string
  category: string
  status: string
  priority: string
  description: string
  scheduled_date: string | null
  completed_date: string | null
  cost: number
  performed_by: string
  notes: string
  created_at: string
  updated_at: string
}

// Ship Supplies
export const SUPPLY_CATEGORIES = [
  "fuel", "fresh_water", "provisions", "medical", "safety",
  "cleaning", "tools", "spare_parts", "electronics", "general",
] as const

export interface ShipSupply {
  id: string
  ship_id: string
  item_name: string
  category: string
  quantity: number
  unit: string
  min_quantity: number
  last_restocked: string | null
  notes: string
  created_at: string
  updated_at: string
}

// Activity types
export const ACTIVITY_TYPES = [
  "status_change", "note_added", "document_uploaded", "document_verified",
  "task_created", "task_completed", "interview_scheduled", "interview_completed",
  "assigned_to_voyage", "signed_on", "signed_off", "role_changed",
  "rating_changed", "communication_logged", "application_received", "forms_sent",
  "forms_completed", "welcome_guide_sent", "position_opened", "position_filled", "general"
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export interface Activity {
  id: string
  crew_id: string | null
  ship_id: string | null
  voyage_id: string | null
  activity_type: ActivityType
  title: string
  description: string
  metadata: Record<string, any>
  actor_name: string
  created_at: string
}
