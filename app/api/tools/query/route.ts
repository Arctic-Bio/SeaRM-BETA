import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

const MAX_ROWS = 500
const BLOCKED_KEYWORDS = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"]

function validateQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim().replace(/;+$/, "").trim()
  const upper = trimmed.toUpperCase()

  // Must start with SELECT or WITH (for CTEs)
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, error: "Only SELECT queries are allowed" }
  }

  // Block dangerous keywords
  for (const kw of BLOCKED_KEYWORDS) {
    // Check for keyword as a standalone word (not inside a string literal)
    const regex = new RegExp(`\\b${kw}\\b`, "i")
    // Simple check -- strip string literals first
    const noStrings = trimmed.replace(/'[^']*'/g, "")
    if (regex.test(noStrings)) {
      return { valid: false, error: `Keyword "${kw}" is not allowed in read-only queries` }
    }
  }

  // Block multiple statements
  const noStrings = trimmed.replace(/'[^']*'/g, "")
  if (noStrings.includes(";") && noStrings.indexOf(";") < noStrings.length - 1) {
    return { valid: false, error: "Multiple statements are not allowed" }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const { query, params = [] } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const validation = validateQuery(query)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const sql = getDb()

    // Enforce LIMIT if not present
    let finalQuery = query.trim().replace(/;+$/, "")
    const upperQuery = finalQuery.toUpperCase()
    if (!upperQuery.includes("LIMIT")) {
      finalQuery += ` LIMIT ${MAX_ROWS}`
    } else {
      // Ensure existing LIMIT doesn't exceed MAX_ROWS
      const limitMatch = upperQuery.match(/LIMIT\s+(\d+)/)
      if (limitMatch && parseInt(limitMatch[1]) > MAX_ROWS) {
        finalQuery = finalQuery.replace(/LIMIT\s+\d+/i, `LIMIT ${MAX_ROWS}`)
      }
    }

    const startTime = Date.now()
    const rows = await sql.query(finalQuery, params)
    const duration = Date.now() - startTime

    // Determine column types from first row
    const columnMeta: Record<string, string> = {}
    if (rows.length > 0) {
      const first = rows[0]
      for (const [key, value] of Object.entries(first)) {
        if (value === null) columnMeta[key] = "null"
        else if (typeof value === "number") columnMeta[key] = Number.isInteger(value) ? "integer" : "float"
        else if (typeof value === "boolean") columnMeta[key] = "boolean"
        else if (typeof value === "object" && Array.isArray(value)) columnMeta[key] = "array"
        else if (typeof value === "object") columnMeta[key] = "json"
        else if (typeof value === "string") {
          // Check if it looks like a date
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) columnMeta[key] = "date"
          else columnMeta[key] = "string"
        } else columnMeta[key] = "string"
      }
    }

    return NextResponse.json({
      rows,
      rowCount: rows.length,
      columnMeta,
      duration,
      query: finalQuery,
      truncated: rows.length >= MAX_ROWS,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg, query: true }, { status: 400 })
  }
}
