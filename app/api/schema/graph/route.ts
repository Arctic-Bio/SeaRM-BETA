import { getDb } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

interface SchemaTable {
  table_name: string
  columns: string[]
  data_types: string[]
  column_count: number
}

interface SchemaRelationship {
  from_table: string
  to_table: string
  from_column: string
  to_column: string
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin permission
    if (user.role !== 'sysadmin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const sql = getDb()

    // Get all tables with their columns
    const tablesArray = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const tables: SchemaTable[] = []
    
    for (const row of tablesArray) {
      const tableName = row.table_name as string
      
      // Get columns for each table
      const colsArray = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      
      const columns = colsArray.map((c: any) => c.column_name as string)
      const dataTypes = colsArray.map((c: any) => c.data_type as string)
      
      tables.push({
        table_name: tableName,
        columns,
        data_types: dataTypes,
        column_count: columns.length,
      })
    }

    // Get foreign key relationships
    const relationsArray = await sql`
      SELECT
        kcu1.table_name as from_table,
        kcu1.column_name as from_column,
        kcu2.table_name as to_table,
        kcu2.column_name as to_column
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu1 
        ON rc.constraint_name = kcu1.constraint_name 
        AND kcu1.table_schema = rc.constraint_schema
      JOIN information_schema.key_column_usage kcu2 
        ON rc.unique_constraint_name = kcu2.constraint_name 
        AND kcu2.table_schema = rc.constraint_schema
      WHERE rc.constraint_schema = 'public'
    `

    const relationships: SchemaRelationship[] = relationsArray.map((row: any) => ({
      from_table: row.from_table,
      to_table: row.to_table,
      from_column: row.from_column,
      to_column: row.to_column,
    }))

    return NextResponse.json({
      tables,
      relationships,
      total_tables: tables.length,
      total_relationships: relationships.length,
    })
  } catch (err: any) {
    console.error('[v0] Schema API error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch schema: ' + err.message }, { status: 500 })
  }
}
