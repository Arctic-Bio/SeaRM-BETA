import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getDb } from "@/lib/db"
import {
  getColumns,
  resolveTable,
  getRowKey,
  quoteIdent,
  qualified,
  coerceValue,
  validColumns,
} from "@/lib/db-admin"

async function requireAdmin() {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return null
  return user
}

function getSchema(req: NextRequest): string {
  return req.nextUrl.searchParams.get("schema") ?? "public"
}

// GET /api/admin/database/[table]?schema=&page=&pageSize=&search=&sort=&dir=
export async function GET(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { table } = await ctx.params
  const schema = getSchema(req)
  const kind = await resolveTable(schema, table)
  if (!kind) return NextResponse.json({ error: "Table not found" }, { status: 404 })

  const sql = getDb()
  const params = req.nextUrl.searchParams
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize") ?? 50)))
  const offset = (page - 1) * pageSize
  const search = (params.get("search") ?? "").trim()
  const sortCol = params.get("sort") ?? ""
  const sortDir = params.get("dir") === "desc" ? "DESC" : "ASC"

  const columns = await getColumns(schema, table)
  const colNames = columns.map((c) => c.name)

  try {
    // Build a WHERE clause for search across text-ish columns.
    let where = ""
    const args: any[] = []
    if (search) {
      const searchable = columns.filter((c) =>
        ["text", "varchar", "bpchar", "uuid", "name", "citext"].includes(c.udt_name),
      )
      if (searchable.length) {
        args.push(`%${search}%`)
        const clauses = searchable.map((c) => `${quoteIdent(c.name)}::text ILIKE $1`)
        where = `WHERE ${clauses.join(" OR ")}`
      }
    }

    // ORDER BY (validate the requested sort column)
    let orderBy = ""
    if (sortCol && colNames.includes(sortCol)) {
      orderBy = `ORDER BY ${quoteIdent(sortCol)} ${sortDir} NULLS LAST`
    } else {
      const key = await getRowKey(schema, table)
      if (key.length) orderBy = `ORDER BY ${quoteIdent(key[0])} ${sortDir}`
    }

    const countRows = await sql.query(
      `SELECT COUNT(*)::int AS cnt FROM ${qualified(schema, table)} ${where}`,
      args,
    )
    const total = Number(countRows[0]?.cnt ?? 0)

    const rows = await sql.query(
      `SELECT * FROM ${qualified(schema, table)} ${where} ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`,
      args,
    )

    const keyColumns = await getRowKey(schema, table)

    return NextResponse.json({
      schema,
      table,
      kind,
      columns,
      keyColumns,
      rows,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// POST /api/admin/database/[table]  { schema, values }  -> insert row
export async function POST(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { table } = await ctx.params
  const body = await req.json()
  const schema = body.schema ?? "public"
  if (!(await resolveTable(schema, table))) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 })
  }

  const sql = getDb()
  const columns = await getColumns(schema, table)
  const colMap = new Map(columns.map((c) => [c.name, c]))
  const values = body.values ?? {}

  // Only keep keys that are real, non-empty columns.
  const keys = Object.keys(values).filter((k) => colMap.has(k) && values[k] !== "" && values[k] != null)
  if (keys.length === 0) {
    return NextResponse.json({ error: "No values provided" }, { status: 400 })
  }

  try {
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const args = keys.map((k) => coerceValue(values[k], colMap.get(k)!.udt_name))
    const colList = keys.map((k) => quoteIdent(k)).join(", ")
    const rows = await sql.query(
      `INSERT INTO ${qualified(schema, table)} (${colList}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      args,
    )
    return NextResponse.json({ success: true, row: rows[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// PATCH /api/admin/database/[table]  { schema, key: {col: val}, values: {col: val} }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { table } = await ctx.params
  const body = await req.json()
  const schema = body.schema ?? "public"
  if (!(await resolveTable(schema, table))) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 })
  }

  const sql = getDb()
  const columns = await getColumns(schema, table)
  const colMap = new Map(columns.map((c) => [c.name, c]))

  const updates = body.values ?? {}
  const key = body.key ?? {}

  const updateCols = await validColumns(schema, table, Object.keys(updates))
  const keyCols = await validColumns(schema, table, Object.keys(key))

  if (updateCols.length === 0) {
    return NextResponse.json({ error: "No valid columns to update" }, { status: 400 })
  }
  if (keyCols.length === 0) {
    return NextResponse.json({ error: "No key provided to identify the row" }, { status: 400 })
  }

  try {
    const args: any[] = []
    const setClauses = updateCols.map((c) => {
      args.push(coerceValue(updates[c], colMap.get(c)!.udt_name))
      return `${quoteIdent(c)} = $${args.length}`
    })
    const whereClauses = keyCols.map((c) => {
      args.push(coerceValue(key[c], colMap.get(c)!.udt_name))
      return `${quoteIdent(c)} = $${args.length}`
    })
    const rows = await sql.query(
      `UPDATE ${qualified(schema, table)} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING *`,
      args,
    )
    if (!rows.length) return NextResponse.json({ error: "Row not found" }, { status: 404 })
    return NextResponse.json({ success: true, row: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// DELETE /api/admin/database/[table]  { schema, keys: [{col: val}, ...] }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { table } = await ctx.params
  const body = await req.json()
  const schema = body.schema ?? "public"
  if (!(await resolveTable(schema, table))) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 })
  }

  const sql = getDb()
  const columns = await getColumns(schema, table)
  const colMap = new Map(columns.map((c) => [c.name, c]))
  const keys: Record<string, any>[] = Array.isArray(body.keys) ? body.keys : []
  if (keys.length === 0) {
    return NextResponse.json({ error: "No rows specified" }, { status: 400 })
  }

  try {
    let deleted = 0
    for (const key of keys) {
      const keyCols = Object.keys(key).filter((k) => colMap.has(k))
      if (keyCols.length === 0) continue
      const args: any[] = []
      const whereClauses = keyCols.map((c) => {
        args.push(coerceValue(key[c], colMap.get(c)!.udt_name))
        return `${quoteIdent(c)} = $${args.length}`
      })
      const rows = await sql.query(
        `DELETE FROM ${qualified(schema, table)} WHERE ${whereClauses.join(" AND ")} RETURNING *`,
        args,
      )
      deleted += rows.length
    }
    return NextResponse.json({ success: true, deleted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
