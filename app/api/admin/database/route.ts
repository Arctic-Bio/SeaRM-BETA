import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"
import {
  listTables,
  getColumns,
  resolveTable,
  quoteIdent,
  qualified,
  ddlType,
  isValidNewIdentifier,
  ALLOWED_SCHEMAS,
} from "@/lib/db-admin"

async function requireAdmin() {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return null
  return user
}

// GET /api/admin/database
//   ?resource=tables                     -> list all tables + metadata
//   ?resource=columns&schema=&table=     -> column metadata for a table
//   ?resource=overview                   -> high level db stats
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const resource = req.nextUrl.searchParams.get("resource") ?? "tables"

  try {
    if (resource === "tables") {
      const tables = await listTables()
      return NextResponse.json({ tables })
    }

    if (resource === "overview") {
      const tables = await listTables()
      const sql = getDb()
      const dbSize = await sql.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`)
      return NextResponse.json({
        tableCount: tables.filter((t) => t.type === "table").length,
        viewCount: tables.filter((t) => t.type === "view").length,
        totalRows: tables.reduce((a, t) => a + t.rows, 0),
        dbSize: dbSize[0]?.size ?? "—",
        schemas: ALLOWED_SCHEMAS,
      })
    }

    if (resource === "columns") {
      const schema = req.nextUrl.searchParams.get("schema") ?? "public"
      const table = req.nextUrl.searchParams.get("table") ?? ""
      const kind = await resolveTable(schema, table)
      if (!kind) return NextResponse.json({ error: "Table not found" }, { status: 404 })
      const columns = await getColumns(schema, table)
      return NextResponse.json({ schema, table, kind, columns })
    }

    return NextResponse.json({ error: "Unknown resource" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/admin/database  { action, ... }
//   action: "create_table" | "drop_table" | "rename_table" | "truncate_table"
//         | "add_column" | "drop_column" | "rename_column" | "alter_column_null"
//         | "set_rls" | "run_sql"
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sql = getDb()
  const body = await req.json()
  const { action } = body

  try {
    // ---- CREATE TABLE -----------------------------------------------------
    if (action === "create_table") {
      const { name, columns } = body as {
        name: string
        columns: { name: string; type: string; nullable?: boolean; primary?: boolean }[]
      }
      if (!isValidNewIdentifier(name)) {
        return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
      }
      if (!Array.isArray(columns) || columns.length === 0) {
        return NextResponse.json({ error: "At least one column is required" }, { status: 400 })
      }
      const defs: string[] = []
      const pks: string[] = []
      for (const col of columns) {
        if (!isValidNewIdentifier(col.name)) {
          return NextResponse.json({ error: `Invalid column name: ${col.name}` }, { status: 400 })
        }
        const type = ddlType(col.type)
        if (!type) return NextResponse.json({ error: `Invalid type: ${col.type}` }, { status: 400 })
        let def = `${quoteIdent(col.name)} ${type}`
        if (col.primary && col.type === "uuid") def += " DEFAULT gen_random_uuid()"
        if (col.nullable === false || col.primary) def += " NOT NULL"
        defs.push(def)
        if (col.primary) pks.push(quoteIdent(col.name))
      }
      if (pks.length) defs.push(`PRIMARY KEY (${pks.join(", ")})`)
      await sql.query(`CREATE TABLE ${qualified("public", name)} (${defs.join(", ")})`)
      return NextResponse.json({ success: true, table: name })
    }

    // ---- DROP TABLE -------------------------------------------------------
    if (action === "drop_table") {
      const { schema, table } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      await sql.query(`DROP TABLE IF EXISTS ${qualified(schema, table)} CASCADE`)
      return NextResponse.json({ success: true })
    }

    // ---- TRUNCATE TABLE ---------------------------------------------------
    if (action === "truncate_table") {
      const { schema, table } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      await sql.query(`TRUNCATE TABLE ${qualified(schema, table)} CASCADE`)
      return NextResponse.json({ success: true })
    }

    // ---- RENAME TABLE -----------------------------------------------------
    if (action === "rename_table") {
      const { schema, table, newName } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      if (!isValidNewIdentifier(newName)) {
        return NextResponse.json({ error: "Invalid new table name" }, { status: 400 })
      }
      await sql.query(`ALTER TABLE ${qualified(schema, table)} RENAME TO ${quoteIdent(newName)}`)
      return NextResponse.json({ success: true })
    }

    // ---- ADD COLUMN -------------------------------------------------------
    if (action === "add_column") {
      const { schema, table, column } = body as {
        schema: string
        table: string
        column: { name: string; type: string; nullable?: boolean }
      }
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      if (!isValidNewIdentifier(column.name)) {
        return NextResponse.json({ error: "Invalid column name" }, { status: 400 })
      }
      const type = ddlType(column.type)
      if (!type) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
      const notNull = column.nullable === false ? " NOT NULL" : ""
      await sql.query(
        `ALTER TABLE ${qualified(schema, table)} ADD COLUMN ${quoteIdent(column.name)} ${type}${notNull}`,
      )
      return NextResponse.json({ success: true })
    }

    // ---- DROP COLUMN ------------------------------------------------------
    if (action === "drop_column") {
      const { schema, table, column } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      const cols = await getColumns(schema, table)
      if (!cols.some((c) => c.name === column)) {
        return NextResponse.json({ error: "Column not found" }, { status: 404 })
      }
      await sql.query(`ALTER TABLE ${qualified(schema, table)} DROP COLUMN ${quoteIdent(column)} CASCADE`)
      return NextResponse.json({ success: true })
    }

    // ---- RENAME COLUMN ----------------------------------------------------
    if (action === "rename_column") {
      const { schema, table, column, newName } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      const cols = await getColumns(schema, table)
      if (!cols.some((c) => c.name === column)) {
        return NextResponse.json({ error: "Column not found" }, { status: 404 })
      }
      if (!isValidNewIdentifier(newName)) {
        return NextResponse.json({ error: "Invalid new column name" }, { status: 400 })
      }
      await sql.query(
        `ALTER TABLE ${qualified(schema, table)} RENAME COLUMN ${quoteIdent(column)} TO ${quoteIdent(newName)}`,
      )
      return NextResponse.json({ success: true })
    }

    // ---- ALTER COLUMN NULLABILITY ----------------------------------------
    if (action === "alter_column_null") {
      const { schema, table, column, nullable } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      const cols = await getColumns(schema, table)
      if (!cols.some((c) => c.name === column)) {
        return NextResponse.json({ error: "Column not found" }, { status: 404 })
      }
      const op = nullable ? "DROP NOT NULL" : "SET NOT NULL"
      await sql.query(`ALTER TABLE ${qualified(schema, table)} ALTER COLUMN ${quoteIdent(column)} ${op}`)
      return NextResponse.json({ success: true })
    }

    // ---- TOGGLE ROW LEVEL SECURITY ---------------------------------------
    if (action === "set_rls") {
      const { schema, table, enabled } = body
      if (!(await resolveTable(schema, table))) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 })
      }
      const op = enabled ? "ENABLE" : "DISABLE"
      await sql.query(`ALTER TABLE ${qualified(schema, table)} ${op} ROW LEVEL SECURITY`)
      return NextResponse.json({ success: true })
    }

    // ---- RAW SQL CONSOLE --------------------------------------------------
    if (action === "run_sql") {
      const { query } = body as { query: string }
      if (!query || typeof query !== "string" || !query.trim()) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 })
      }
      const started = Date.now()
      const rows = await sql.query(query)
      const duration = Date.now() - started
      const fields = rows.length ? Object.keys(rows[0]) : []
      return NextResponse.json({
        success: true,
        rows: Array.isArray(rows) ? rows : [],
        fields,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        duration,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
