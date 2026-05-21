// SeaRM Widget Builder – Type Definitions

export interface DataSourceDefinition {
  key: string
  label: string
  table: string
  description: string
  category: string
  columns: ColumnDef[]
  defaultSort?: string
  defaultSortDir?: "asc" | "desc"
}

export interface ColumnDef {
  key: string
  label: string
  type: "text" | "number" | "date" | "boolean" | "badge" | "email" | "url" | "json"
  sortable?: boolean
  filterable?: boolean
  defaultVisible?: boolean
  format?: string // date format, number precision, etc.
}

export interface WidgetFilter {
  column: string
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in" | "notnull" | "isnull"
  value: string
}

export interface WidgetConfig {
  id: string
  name: string
  slug: string
  description: string
  data_source: string
  columns: string[]
  filters: WidgetFilter[]
  sort_by: string
  sort_dir: "asc" | "desc"
  view_type: ViewType
  style_preset: StylePreset
  custom_css: string
  max_rows: number
  refresh_interval_sec: number
  show_header: boolean
  show_footer: boolean
  show_pagination: boolean
  show_search: boolean
  header_title: string
  footer_text: string
  empty_message: string
  card_layout: Record<string, unknown>
  chart_config: Record<string, unknown>
  access_token: string
  allowed_domains: string[]
  rate_limit_per_min: number
  is_active: boolean
  is_public: boolean
  total_views: number
  last_viewed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type ViewType = "table" | "cards" | "list" | "stats" | "timeline" | "chart" | "gallery" | "minimal"

export type StylePreset = "modern" | "ocean" | "minimal" | "vibrant" | "corporate" | "seafoam"

export const VIEW_TYPES: { value: ViewType; label: string; description: string }[] = [
  { value: "table", label: "Data Table", description: "Classic sortable table with rows and columns" },
  { value: "cards", label: "Card Grid", description: "Visual cards in a responsive grid layout" },
  { value: "list", label: "List View", description: "Compact vertical list with key details" },
  { value: "stats", label: "Stats / KPI", description: "Aggregate statistics and key metrics" },
  { value: "timeline", label: "Timeline", description: "Chronological timeline of events" },
  { value: "chart", label: "Chart", description: "Bar, line, or pie chart visualization" },
  { value: "gallery", label: "Gallery", description: "Image-focused tiled layout" },
  { value: "minimal", label: "Minimal", description: "Ultra-clean single-line entries" },
]

export const STYLE_PRESETS: { value: StylePreset; label: string; description: string; colors: { bg: string; text: string; accent: string; border: string; headerBg: string; accentLight: string } }[] = [
  { 
    value: "modern", 
    label: "Modern", 
    description: "Clean professional with blue accents",
    colors: { bg: "#ffffff", text: "#0f172a", accent: "#3b82f6", border: "#e2e8f0", headerBg: "#f8fafc", accentLight: "#dbeafe" } 
  },
  { 
    value: "ocean", 
    label: "Ocean", 
    description: "Deep maritime blues with cyan highlights",
    colors: { bg: "#0f172a", text: "#e2e8f0", accent: "#06b6d4", border: "#334155", headerBg: "#1e293b", accentLight: "#165e7d" } 
  },
  { 
    value: "minimal", 
    label: "Minimal", 
    description: "High contrast monochrome",
    colors: { bg: "#ffffff", text: "#000000", accent: "#000000", border: "#d1d5db", headerBg: "#ffffff", accentLight: "#f3f4f6" } 
  },
  { 
    value: "vibrant", 
    label: "Vibrant", 
    description: "Bold orange and warm sunset tones",
    colors: { bg: "#fafaf9", text: "#1c1917", accent: "#ea580c", border: "#fed7aa", headerBg: "#fff7ed", accentLight: "#ffedd5" } 
  },
  { 
    value: "corporate", 
    label: "Corporate", 
    description: "Professional purple with gold accents",
    colors: { bg: "#f5f3ff", text: "#3f3f46", accent: "#7c3aed", border: "#ddd6fe", headerBg: "#eae5ff", accentLight: "#f3e8ff" } 
  },
  { 
    value: "seafoam", 
    label: "Seafoam", 
    description: "Soft mint and teal for maritime themes",
    colors: { bg: "#f0fdfa", text: "#164e63", accent: "#0d9488", border: "#b2dfdb", headerBg: "#e0f2f1", accentLight: "#ccf7f3" } 
  },
]

export const FILTER_OPERATORS: { value: WidgetFilter["operator"]; label: string; description: string }[] = [
  { value: "eq", label: "Equals", description: "Exact match" },
  { value: "neq", label: "Not Equals", description: "Does not match" },
  { value: "gt", label: "Greater Than", description: "Numeric/date comparison" },
  { value: "gte", label: "Greater or Equal", description: "Numeric/date comparison" },
  { value: "lt", label: "Less Than", description: "Numeric/date comparison" },
  { value: "lte", label: "Less or Equal", description: "Numeric/date comparison" },
  { value: "like", label: "Contains", description: "Partial text match" },
  { value: "in", label: "In List", description: "Matches any value in comma-separated list" },
  { value: "notnull", label: "Is Not Empty", description: "Field has a value" },
  { value: "isnull", label: "Is Empty", description: "Field is null or empty" },
]
