// SeaRM Widget Query Builder
// Generates safe, parameterized SQL from widget configuration.
// All user inputs are parameterized -- never interpolated into SQL strings.

import { getDataSource } from "./data-sources"
import type { WidgetFilter } from "./types"

interface QueryResult {
  sql: string
  params: unknown[]
  error?: string
}

export function buildWidgetQuery(
  dataSourceKey: string,
  columns: string[],
  filters: WidgetFilter[],
  sortBy: string | null,
  sortDir: "asc" | "desc",
  limit: number,
  offset: number = 0
): QueryResult {
  const source = getDataSource(dataSourceKey)
  if (!source) return { sql: "", params: [], error: `Unknown data source: ${dataSourceKey}` }

  // Validate columns against the source definition (whitelist only)
  const validColumnKeys = new Set(source.columns.map(c => c.key))
  const selectedCols = columns.length > 0
    ? columns.filter(c => validColumnKeys.has(c))
    : source.columns.filter(c => c.defaultVisible).map(c => c.key)

  if (selectedCols.length === 0) {
    return { sql: "", params: [], error: "No valid columns selected" }
  }

  // Build SELECT with only whitelisted column names (safe -- they come from our definition)
  const selectClause = selectedCols.map(c => `"${c}"`).join(", ")

  // Build WHERE from filters
  const whereClauses: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  for (const filter of filters) {
    if (!validColumnKeys.has(filter.column)) continue // skip unknown columns

    const col = `"${filter.column}"`

    switch (filter.operator) {
      case "eq":
        whereClauses.push(`${col} = $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "neq":
        whereClauses.push(`${col} != $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "gt":
        whereClauses.push(`${col} > $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "gte":
        whereClauses.push(`${col} >= $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "lt":
        whereClauses.push(`${col} < $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "lte":
        whereClauses.push(`${col} <= $${paramIdx}`)
        params.push(filter.value)
        paramIdx++
        break
      case "like":
        whereClauses.push(`${col}::text ILIKE $${paramIdx}`)
        params.push(`%${filter.value}%`)
        paramIdx++
        break
      case "in": {
        const vals = filter.value.split(",").map(v => v.trim()).filter(Boolean)
        if (vals.length > 0) {
          const placeholders = vals.map(() => `$${paramIdx++}`)
          whereClauses.push(`${col}::text IN (${placeholders.join(", ")})`)
          params.push(...vals)
        }
        break
      }
      case "notnull":
        whereClauses.push(`${col} IS NOT NULL`)
        break
      case "isnull":
        whereClauses.push(`${col} IS NULL`)
        break
    }
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""

  // Validate sort column
  const validSortCol = sortBy && validColumnKeys.has(sortBy) ? `"${sortBy}"` : (source.defaultSort ? `"${source.defaultSort}"` : `"${selectedCols[0]}"`)
  const validSortDir = sortDir === "desc" ? "DESC" : "ASC"
  const orderClause = `ORDER BY ${validSortCol} ${validSortDir}`

  // Limit & offset
  const safeLimit = Math.min(Math.max(1, limit), 500)
  const safeOffset = Math.max(0, offset)
  const limitClause = `LIMIT ${safeLimit} OFFSET ${safeOffset}`

  const sql = `SELECT ${selectClause} FROM "${source.table}" ${whereClause} ${orderClause} ${limitClause}`

  return { sql, params }
}

// Build a count query (for pagination)
export function buildWidgetCountQuery(
  dataSourceKey: string,
  filters: WidgetFilter[]
): QueryResult {
  const source = getDataSource(dataSourceKey)
  if (!source) return { sql: "", params: [], error: `Unknown data source: ${dataSourceKey}` }

  const validColumnKeys = new Set(source.columns.map(c => c.key))
  const whereClauses: string[] = []
  const params: unknown[] = []
  let paramIdx = 1

  for (const filter of filters) {
    if (!validColumnKeys.has(filter.column)) continue
    const col = `"${filter.column}"`
    switch (filter.operator) {
      case "eq": whereClauses.push(`${col} = $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "neq": whereClauses.push(`${col} != $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "gt": whereClauses.push(`${col} > $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "gte": whereClauses.push(`${col} >= $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "lt": whereClauses.push(`${col} < $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "lte": whereClauses.push(`${col} <= $${paramIdx}`); params.push(filter.value); paramIdx++; break
      case "like": whereClauses.push(`${col}::text ILIKE $${paramIdx}`); params.push(`%${filter.value}%`); paramIdx++; break
      case "in": {
        const vals = filter.value.split(",").map(v => v.trim()).filter(Boolean)
        if (vals.length > 0) { const ph = vals.map(() => `$${paramIdx++}`); whereClauses.push(`${col}::text IN (${ph.join(", ")})`); params.push(...vals) }
        break
      }
      case "notnull": whereClauses.push(`${col} IS NOT NULL`); break
      case "isnull": whereClauses.push(`${col} IS NULL`); break
    }
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
  return { sql: `SELECT COUNT(*) as total FROM "${source.table}" ${whereClause}`, params }
}
