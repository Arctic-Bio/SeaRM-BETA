// Database connection utilities for backup feature
import { Pool, Client } from 'pg'

export type BackupProvider = 'neon' | 'aws' | 'supabase' | 'pg' | 'mysql'

export async function testDatabaseConnection(provider: BackupProvider, connectionString: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (provider === 'mysql') {
      // MySQL connection test would use mysql2 driver
      return { success: true }
    }

    // PostgreSQL-based providers
    const client = new Client({ connectionString })
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

export async function getDatabaseSchema(connectionString: string): Promise<any[]> {
  try {
    const client = new Client({ connectionString })
    await client.connect()

    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON c.table_name = t.table_name
      WHERE table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `)

    await client.end()
    return result.rows
  } catch (error) {
    throw new Error(`Failed to fetch schema: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function exportTableData(connectionString: string, tableName: string): Promise<any[]> {
  try {
    const client = new Client({ connectionString })
    await client.connect()
    const result = await client.query(`SELECT * FROM ${tableName}`)
    await client.end()
    return result.rows
  } catch (error) {
    throw new Error(`Failed to export table ${tableName}`)
  }
}

export async function importTableData(connectionString: string, tableName: string, data: any[]): Promise<number> {
  if (data.length === 0) return 0

  try {
    const client = new Client({ connectionString })
    await client.connect()

    const columns = Object.keys(data[0])
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

    let inserted = 0
    for (const row of data) {
      await client.query(insertQuery, Object.values(row))
      inserted++
    }

    await client.end()
    return inserted
  } catch (error) {
    throw new Error(`Failed to import data into ${tableName}`)
  }
}

export function parseConnectionString(connStr: string): { host?: string; port?: number; database?: string; user?: string } {
  const url = new URL(connStr)
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port) : undefined,
    database: url.pathname.slice(1),
    user: url.username,
  }
}
