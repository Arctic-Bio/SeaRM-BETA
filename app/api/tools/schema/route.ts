import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const sql = getDb()

    // Get all tables and their columns from information_schema
    const columns = await sql`
      SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `

    // Group columns by table
    const tables: Record<string, {
      name: string
      columns: {
        name: string
        type: string
        udtName: string
        nullable: boolean
        hasDefault: boolean
        maxLength: number | null
      }[]
    }> = {}

    for (const col of columns) {
      const tbl = col.table_name as string
      if (!tables[tbl]) {
        tables[tbl] = { name: tbl, columns: [] }
      }
      tables[tbl].columns.push({
        name: col.column_name as string,
        type: col.data_type as string,
        udtName: col.udt_name as string,
        nullable: col.is_nullable === "YES",
        hasDefault: col.column_default !== null,
        maxLength: col.character_maximum_length as number | null,
      })
    }

    // Get approximate row counts from pg_stat (single query, no dynamic table names)
    const tableNames = Object.keys(tables)
    const stats = await sql`
      SELECT relname as table_name, n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `
    const counts: Record<string, number> = {}
    for (const row of stats) {
      counts[row.table_name as string] = parseInt(row.row_count as string) || 0
    }

    const schema = tableNames.map((name) => ({
      ...tables[name],
      rowCount: counts[name] || 0,
    }))

    return NextResponse.json({ tables: schema })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
