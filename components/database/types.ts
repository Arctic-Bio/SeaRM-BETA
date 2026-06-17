export interface ColumnInfo {
  name: string
  data_type: string
  udt_name: string
  is_nullable: boolean
  default: string | null
  is_primary: boolean
  is_unique: boolean
  is_identity: boolean
  ordinal: number
  char_max_length: number | null
  foreign_key: { schema: string; table: string; column: string } | null
}

export interface TableInfo {
  schema: string
  name: string
  type: "table" | "view"
  columns: number
  rows: number
  size: string
  size_bytes: number
  has_rls: boolean
}

export interface RowsResponse {
  schema: string
  table: string
  kind: "table" | "view"
  columns: ColumnInfo[]
  keyColumns: string[]
  rows: Record<string, any>[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
