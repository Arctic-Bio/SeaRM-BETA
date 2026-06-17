// ============================================================================
// Integrations / Inbound Webhook System
// ----------------------------------------------------------------------------
// Modular, expandable engine for pulling crew profiles from ANY forms software
// (Google Forms, Typeform, Jotform, Microsoft Forms, etc.) via Zapier or a
// direct webhook. New sources and target fields can be added here without
// touching the mapping engine or the API routes.
// ============================================================================

export const INTEGRATION_SOURCES = [
  { value: "google_forms", label: "Google Forms", hint: "Via Zapier 'Google Forms' trigger or Apps Script" },
  { value: "zapier", label: "Zapier (generic)", hint: "Webhooks by Zapier - POST action" },
  { value: "typeform", label: "Typeform", hint: "Via Zapier or native Typeform webhook" },
  { value: "jotform", label: "Jotform", hint: "Via Zapier or Jotform webhook integration" },
  { value: "microsoft_forms", label: "Microsoft Forms", hint: "Via Power Automate or Zapier" },
  { value: "tally", label: "Tally", hint: "Via Tally webhook or Zapier" },
  { value: "make", label: "Make (Integromat)", hint: "HTTP module - POST action" },
  { value: "custom", label: "Custom / Other", hint: "Any service that can POST JSON" },
] as const

export type IntegrationSource = (typeof INTEGRATION_SOURCES)[number]["value"]

// ----------------------------------------------------------------------------
// Crew target fields - the destination columns a form field can map into.
// These mirror the writable columns of the `crew` table. Add new entries here
// when the crew schema gains new mappable fields.
// ----------------------------------------------------------------------------
export type FieldTransform =
  | "none"
  | "trim"
  | "lowercase"
  | "uppercase"
  | "email"
  | "phone"
  | "boolean"
  | "date"
  | "skill_level"
  | "first_name" // take first token of a full name
  | "last_name" // take remaining tokens of a full name

export interface TargetField {
  key: string
  label: string
  group: string
  transform: FieldTransform
  // Common incoming field-name aliases used for auto-detection
  aliases: string[]
}

export const CREW_TARGET_FIELDS: TargetField[] = [
  // Identity
  { key: "first_name", label: "First Name", group: "Identity", transform: "trim", aliases: ["first name", "firstname", "first", "given name", "fname"] },
  { key: "last_name", label: "Last Name", group: "Identity", transform: "trim", aliases: ["last name", "lastname", "last", "surname", "family name", "lname"] },
  { key: "email", label: "Email", group: "Contact", transform: "email", aliases: ["email", "email address", "e-mail", "mail"] },
  { key: "phone", label: "Phone", group: "Contact", transform: "phone", aliases: ["phone", "phone number", "mobile", "cell", "telephone", "contact number"] },
  // Demographics
  { key: "gender", label: "Gender", group: "Demographics", transform: "trim", aliases: ["gender", "sex"] },
  { key: "date_of_birth", label: "Date of Birth", group: "Demographics", transform: "date", aliases: ["date of birth", "dob", "birthday", "birth date"] },
  { key: "country", label: "Country", group: "Location", transform: "trim", aliases: ["country", "nationality", "country of residence"] },
  { key: "city", label: "City", group: "Location", transform: "trim", aliases: ["city", "town", "city of residence"] },
  // Profile
  { key: "current_occupation", label: "Current Occupation", group: "Profile", transform: "trim", aliases: ["current occupation", "occupation", "job", "profession", "job title"] },
  { key: "availability_start_date", label: "Availability Start Date", group: "Availability", transform: "date", aliases: ["availability start date", "approximate availability start date", "available from", "start date"] },
  { key: "duration", label: "Availability Duration", group: "Availability", transform: "trim", aliases: ["duration", "availability duration", "duration (weeks, months)", "how long"] },
  { key: "languages", label: "Languages", group: "Profile", transform: "trim", aliases: ["languages", "check all languages of fluency", "languages spoken", "fluent languages"] },
  { key: "maritime_qualifications", label: "Maritime Qualifications", group: "Profile", transform: "trim", aliases: ["maritime qualifications", "do you have professional maritime qualifications", "qualifications"] },
  { key: "department_preference", label: "Department Preference", group: "Profile", transform: "trim", aliases: ["department preference", "preferred department", "if selected which department would you like to be considered for?", "department"] },
  { key: "has_criminal_record", label: "Has Criminal Record", group: "Profile", transform: "boolean", aliases: ["criminal record", "do you have a criminal record or any convictions?", "convictions"] },
  { key: "notes", label: "Notes / Motivation", group: "Profile", transform: "trim", aliases: ["notes", "motivation", "why would you like to join", "comments", "anything else"] },
  // Skills (level: Basic / Experienced / Professional)
  { key: "skill_small_boats", label: "Skill: Small Boats", group: "Skills", transform: "skill_level", aliases: ["small boats", "small boats/tender operation", "tender operation"] },
  { key: "skill_engineering", label: "Skill: Engineering", group: "Skills", transform: "skill_level", aliases: ["engineering"] },
  { key: "skill_mechanical", label: "Skill: Mechanical", group: "Skills", transform: "skill_level", aliases: ["mechanical"] },
  { key: "skill_scuba_diving", label: "Skill: Scuba Diving", group: "Skills", transform: "skill_level", aliases: ["scuba diving", "diving", "scuba"] },
  { key: "skill_electrical", label: "Skill: Electrical", group: "Skills", transform: "skill_level", aliases: ["electrical"] },
  { key: "skill_electronics", label: "Skill: Electronics & IT", group: "Skills", transform: "skill_level", aliases: ["electronics", "electronics & it systems", "it systems", "it"] },
  { key: "skill_cooking", label: "Skill: Cooking", group: "Skills", transform: "skill_level", aliases: ["cooking", "cook", "galley"] },
  { key: "skill_media", label: "Skill: Media", group: "Skills", transform: "skill_level", aliases: ["media"] },
  { key: "skill_drone", label: "Skill: Drone", group: "Skills", transform: "skill_level", aliases: ["drone"] },
  { key: "skill_photography", label: "Skill: Photography", group: "Skills", transform: "skill_level", aliases: ["photography", "photo"] },
  { key: "skill_videography", label: "Skill: Videography", group: "Skills", transform: "skill_level", aliases: ["videography", "video"] },
  { key: "skill_medical", label: "Skill: Medical", group: "Skills", transform: "skill_level", aliases: ["medical", "medic", "first aid"] },
  { key: "skill_welding", label: "Skill: Welding", group: "Skills", transform: "skill_level", aliases: ["welding", "welder"] },
  { key: "skill_crane_operation", label: "Skill: Crane Operation", group: "Skills", transform: "skill_level", aliases: ["crane operation", "crane"] },
  { key: "skill_biology_science", label: "Skill: Biology/Science", group: "Skills", transform: "skill_level", aliases: ["biology/science", "biology", "science", "marine biology"] },
]

// Special virtual target used to split a single "Full Name" field into first/last
export const FULL_NAME_TARGET = {
  key: "__full_name__",
  label: "Full Name (auto-split into First + Last)",
  group: "Identity",
  transform: "none" as FieldTransform,
  aliases: ["full name", "name", "your name", "applicant name"],
}

export const TARGET_FIELD_GROUPS = [
  "Identity",
  "Contact",
  "Demographics",
  "Location",
  "Profile",
  "Availability",
  "Skills",
]

// A single mapping rule: incoming form field -> crew target field
export interface FieldMapRule {
  source: string // incoming form field key/label
  target: string // crew target field key (or __full_name__, or "" to ignore)
}

export interface IntegrationConnection {
  id: string
  name: string
  source: IntegrationSource
  api_key: string
  is_active: boolean
  default_status: string
  update_existing: boolean
  dedupe_field: string
  field_mapping: FieldMapRule[]
  auto_map: boolean
  total_received: number
  last_received_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface IntegrationLog {
  id: string
  connection_id: string
  status: "received" | "success" | "duplicate" | "error" | "skipped"
  action: "created" | "updated" | "skipped" | "none"
  crew_id: string | null
  crew_name: string | null
  payload: Record<string, unknown> | null
  mapped_data: Record<string, unknown> | null
  error_message: string | null
  // Advanced debugging fields
  http_method: string | null
  content_type: string | null
  headers: Record<string, string> | null
  raw_body: string | null
  request_ip: string | null
  response_status: number | null
  response_body: Record<string, unknown> | null
  matched_count: number | null
  duration_ms: number | null
  created_at: string
}
