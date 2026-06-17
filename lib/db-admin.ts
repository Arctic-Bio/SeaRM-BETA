import { getDb } from "@/lib/db"

// ---------------------------------------------------------------------------
// Database administration helpers
//
// Security model:
//  - Every identifier (schema, table, column) that gets interpolated directly
//    into SQL is FIRST validated against the live information_schema. We never
//    trust a caller-supplied identifier without confirming it exists.
//  - All *values* are passed as parameters ($1, $2, ...) -- never interpolated.
//  - These helpers are only ever called from sysadmin-guarded routes.
// ---------------------------------------------------------------------------

// Schemas a sysadmin is allowed to browse/modify.
export const ALLOWED_SCHEMAS = ["public", "neon_auth"] as const

// Quote a Postgres identifier safely (double-quote, escape embedded quotes).
// Only used AFTER an identifier has been validated against the catalog.
export function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`
}

export function qualified(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`
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

// List all tables and views across the allowed schemas with metadata.
export async function listTables(): Promise<TableInfo[]> {
  const sql = getDb()
  const rows = await sql.query(
    `
    SELECT
      c.relnamespace::regnamespace::text AS schema,
      c.relname AS name,
      CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'view' ELSE 'table' END AS type,
      c.relrowsecurity AS has_rls,
      COALESCE(c.reltuples, 0)::bigint AS est_rows,
      pg_total_relation_size(c.oid) AS size_bytes,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
      (SELECT COUNT(*) FROM information_schema.columns col
        WHERE col.table_schema = c.relnamespace::regnamespace::text
          AND col.table_name = c.relname) AS column_count
    FROM pg_class c
    WHERE c.relkind IN ('r','v','m','p')
      AND c.relnamespace::regnamespace::text = ANY($1)
    ORDER BY c.relnamespace::regnamespace::text, c.relname
    `,
    [ALLOWED_SCHEMAS as unknown as string[]],
  )

  const tables: TableInfo[] = rows.map((r: any) => ({
    schema: r.schema,
    name: r.name,
    type: r.type,
    columns: Number(r.column_count ?? 0),
    // reltuples is only a planner estimate and is -1/0 until ANALYZE runs,
    // so it is used purely as a fallback below.
    rows: Math.max(0, Number(r.est_rows ?? 0)),
    size: r.size ?? "0 bytes",
    size_bytes: Number(r.size_bytes ?? 0),
    has_rls: Boolean(r.has_rls),
  }))

  // Replace the row estimate with an exact COUNT(*) for base tables so the
  // dashboard totals are accurate even before autovacuum has analyzed them.
  // Views are left at their estimate to avoid running expensive view queries.
  await Promise.all(
    tables.map(async (t) => {
      if (t.type !== "table") return
      try {
        const c = await sql.query(`SELECT COUNT(*)::bigint AS n FROM ${qualified(t.schema, t.name)}`)
        t.rows = Number(c[0]?.n ?? 0)
      } catch {
        // keep the estimate on any per-table failure
      }
    }),
  )

  return tables
}

// Confirm a schema.table exists (in an allowed schema). Returns the resolved
// kind ("table" | "view") or null if not found / not allowed.
export async function resolveTable(
  schema: string,
  table: string,
): Promise<"table" | "view" | null> {
  if (!ALLOWED_SCHEMAS.includes(schema as any)) return null
  const sql = getDb()
  const rows = await sql.query(
    `
    SELECT CASE c.relkind WHEN 'r' THEN 'table' WHEN 'p' THEN 'table' ELSE 'view' END AS kind
    FROM pg_class c
    WHERE c.relname = $1 AND c.relnamespace::regnamespace::text = $2
      AND c.relkind IN ('r','v','m','p')
    LIMIT 1
    `,
    [table, schema],
  )
  return rows.length ? (rows[0].kind as "table" | "view") : null
}

// Full column metadata for a table, including PK / unique / FK info.
export async function getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
  const sql = getDb()

  const cols = await sql.query(
    `
    SELECT
      col.column_name AS name,
      col.data_type,
      col.udt_name,
      col.is_nullable,
      col.column_default AS default,
      col.ordinal_position AS ordinal,
      col.character_maximum_length AS char_max_length,
      col.is_identity
    FROM information_schema.columns col
    WHERE col.table_schema = $1 AND col.table_name = $2
    ORDER BY col.ordinal_position
    `,
    [schema, table],
  )

  // Primary key columns
  const pks = await sql.query(
    `
    SELECT a.attname AS name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ($1 || '.' || $2)::regclass AND i.indisprimary
    `,
    [quoteIdent(schema), quoteIdent(table)],
  ).catch(() => [] as any[])
  const pkSet = new Set(pks.map((r: any) => r.name))

  // Unique (non-primary) single-column constraints
  const uniques = await sql.query(
    `
    SELECT a.attname AS name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ($1 || '.' || $2)::regclass AND i.indisunique AND NOT i.indisprimary
    `,
    [quoteIdent(schema), quoteIdent(table)],
  ).catch(() => [] as any[])
  const uniqueSet = new Set(uniques.map((r: any) => r.name))

  // Foreign keys
  const fks = await sql.query(
    `
    SELECT
      kcu.column_name AS name,
      ccu.table_schema AS f_schema,
      ccu.table_name AS f_table,
      ccu.column_name AS f_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1 AND tc.table_name = $2
    `,
    [schema, table],
  ).catch(() => [] as any[])
  const fkMap = new Map<string, { schema: string; table: string; column: string }>()
  for (const f of fks) {
    fkMap.set(f.name, { schema: f.f_schema, table: f.f_table, column: f.f_column })
  }

  return cols.map((c: any) => ({
    name: c.name,
    data_type: c.data_type,
    udt_name: c.udt_name,
    is_nullable: c.is_nullable === "YES",
    default: c.default,
    is_primary: pkSet.has(c.name),
    is_unique: uniqueSet.has(c.name) || pkSet.has(c.name),
    is_identity: c.is_identity === "YES",
    ordinal: Number(c.ordinal),
    char_max_length: c.char_max_length ? Number(c.char_max_length) : null,
    foreign_key: fkMap.get(c.name) ?? null,
  }))
}

// Validate that every name in `names` is a real column of schema.table.
// Returns the subset that is valid (preserving order).
export async function validColumns(
  schema: string,
  table: string,
  names: string[],
): Promise<string[]> {
  const cols = await getColumns(schema, table)
  const valid = new Set(cols.map((c) => c.name))
  return names.filter((n) => valid.has(n))
}

// Pick the best key columns to identify a row for UPDATE/DELETE:
// prefer the primary key, fall back to all columns.
export async function getRowKey(schema: string, table: string): Promise<string[]> {
  const cols = await getColumns(schema, table)
  const pk = cols.filter((c) => c.is_primary).map((c) => c.name)
  if (pk.length) return pk
  const id = cols.find((c) => c.name === "id")
  if (id) return ["id"]
  return cols.map((c) => c.name)
}

// Coerce an incoming JSON value into something the PG driver accepts for a
// given column type. Empty string -> null for non-text types; objects -> JSON.
export function coerceValue(value: any, udtName: string): any {
  if (value === undefined) return null
  if (value === null) return null

  const textLike = ["text", "varchar", "bpchar", "name", "citext"]
  if (value === "" && !textLike.includes(udtName)) return null

  // jsonb / json
  if ((udtName === "jsonb" || udtName === "json") && typeof value === "object") {
    return JSON.stringify(value)
  }
  if ((udtName === "jsonb" || udtName === "json") && typeof value === "string") {
    return value // assume already-valid JSON text
  }

  // booleans coming in as strings
  if (udtName === "bool") {
    if (typeof value === "boolean") return value
    if (value === "true") return true
    if (value === "false") return false
  }

  return value
}

// Whitelist of column types offered by the create-table / add-column UI.
export const COLUMN_TYPES = [
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

export type AllowedColumnType = (typeof COLUMN_TYPES)[number]

// Map a friendly type name -> concrete DDL fragment. Anything not whitelisted
// is rejected to avoid arbitrary DDL injection through the type field.
export function ddlType(type: string): string | null {
  switch (type) {
    case "uuid":
      return "uuid"
    case "text":
      return "text"
    case "varchar":
      return "varchar(255)"
    case "integer":
      return "integer"
    case "bigint":
      return "bigint"
    case "numeric":
      return "numeric"
    case "boolean":
      return "boolean"
    case "date":
      return "date"
    case "timestamptz":
      return "timestamptz"
    case "timestamp":
      return "timestamp"
    case "jsonb":
      return "jsonb"
    case "json":
      return "json"
    default:
      return null
  }
}

// Validate a proposed new identifier (table/column name a user wants to CREATE).
// Postgres allows a lot, but we constrain to a safe, predictable subset.
export function isValidNewIdentifier(name: string): boolean {
  return /^[a-z_][a-z0-9_]{0,62}$/.test(name)
}
