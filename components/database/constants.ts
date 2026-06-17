// Column types offered in the create-table / add-column UI.
// Must stay in sync with ddlType() in lib/db-admin.ts.
export const COLUMN_TYPE_OPTIONS = [
  "uuid",
  "text",
  "varchar",
  "integer",
  "bigint",
  "numeric",
  "boolean",
  "date",
  "timestamptz",
  "timestamp",
  "jsonb",
  "json",
] as const
