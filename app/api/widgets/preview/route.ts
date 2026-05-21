// SeaRM Widget Preview API -- admin-only, renders live preview
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"
import { getDataSource } from "@/lib/widgets/data-sources"
import { buildWidgetQuery } from "@/lib/widgets/query-builder"
import { renderWidgetHTML } from "@/lib/widgets/renderer"
import { generateWidgetCSS } from "@/lib/widgets/style-generator"
import type { WidgetFilter, ViewType, StylePreset } from "@/lib/widgets/types"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  const user = await getSession()
  if (!user || user.role !== "sysadmin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    data_source, columns: selectedCols, filters, sort_by, sort_dir,
    view_type, style_preset, max_rows, show_header, show_footer,
    show_pagination, show_search, header_title, footer_text, empty_message
  } = body

  const source = getDataSource(data_source)
  if (!source) return NextResponse.json({ error: "Unknown data source" }, { status: 400 })

  const query = buildWidgetQuery(data_source, selectedCols || [], filters || [], sort_by, sort_dir || "asc", max_rows || 25, 0)
  if (query.error) return NextResponse.json({ error: query.error }, { status: 400 })

  let rows: Record<string, unknown>[] = []
  try {
    rows = await sql.query(query.sql, query.params) as Record<string, unknown>[]
  } catch (err: any) {
    return NextResponse.json({ error: "Query error: " + err.message }, { status: 500 })
  }

  const resolvedCols = (selectedCols && selectedCols.length > 0)
    ? source.columns.filter(c => selectedCols.includes(c.key))
    : source.columns.filter(c => c.defaultVisible)

  const css = generateWidgetCSS((style_preset || "modern") as StylePreset, (view_type || "table") as ViewType, "preview")
  const bodyHtml = renderWidgetHTML(
    (view_type || "table") as ViewType, rows, resolvedCols, "preview",
    { page: 1, totalPages: 1, totalRows: rows.length, showPagination: show_pagination !== false, emptyMessage: empty_message || "No data available" }
  )

  const headerHtml = show_header !== false
    ? `<div class="sw-header"><div><div class="sw-title">${header_title || data_source}</div><div class="sw-subtitle">${rows.length} record${rows.length !== 1 ? "s" : ""}</div></div>${show_search ? '<input class="sw-search" placeholder="Search..." />' : ""}</div>`
    : ""

  const footerHtml = show_footer !== false
    ? `<div class="sw-footer"><span>${footer_text || "Powered by SeaRM"}</span><span>${rows.length} rows</span></div>`
    : ""

  const html = `<style>${css}</style><div id="searm-widget-preview">${headerHtml}<div class="sw-body">${bodyHtml}</div>${footerHtml}</div>`

  return NextResponse.json({ html, row_count: rows.length })
}
