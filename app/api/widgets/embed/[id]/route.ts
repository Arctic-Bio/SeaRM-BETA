// SeaRM Public Widget Embed Endpoint
// This is the ONLY public endpoint -- no auth required, secured by access token + rate limiting.
import { NextResponse, type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getDataSource } from "@/lib/widgets/data-sources"
import { buildWidgetQuery, buildWidgetCountQuery } from "@/lib/widgets/query-builder"
import { renderWidgetHTML } from "@/lib/widgets/renderer"
import { generateWidgetCSS } from "@/lib/widgets/style-generator"
import type { ViewType, StylePreset, WidgetFilter } from "@/lib/widgets/types"

const sql = neon(process.env.DATABASE_URL!)

// In-memory rate limiting (per-process; resets on cold start -- good enough for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(widgetId: string, limit: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(widgetId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(widgetId, { count: 1, resetAt: now + 60000 })
    return true
  }
  entry.count++
  return entry.count <= limit
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: widgetId } = await params
  const token = req.nextUrl.searchParams.get("token")
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1") || 1)
  const search = req.nextUrl.searchParams.get("search") || ""
  const isIframe = req.nextUrl.searchParams.get("iframe") === "1"

  if (!token) {
    return new NextResponse("Missing token", { status: 401, headers: { "Content-Type": "text/plain" } })
  }

  // Fetch widget config
  const widgets = await sql`SELECT * FROM widgets WHERE id = ${widgetId} AND access_token = ${token} AND is_active = true`
  const widget = widgets[0]
  if (!widget) {
    return new NextResponse('<div style="padding:20px;text-align:center;color:#ef4444;font-family:sans-serif">Widget not found or disabled</div>', {
      status: 404, headers: { "Content-Type": "text/html; charset=utf-8" }
    })
  }

  // Rate limiting
  if (!checkRateLimit(widgetId, Number(widget.rate_limit_per_min) || 60)) {
    return new NextResponse('<div style="padding:20px;text-align:center;color:#f59e0b;font-family:sans-serif">Rate limit exceeded. Please try again later.</div>', {
      status: 429, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "60" }
    })
  }

  // Domain check (if allowed_domains is set)
  const allowedDomains = widget.allowed_domains as string[] || []
  if (allowedDomains.length > 0) {
    const origin = req.headers.get("origin") || req.headers.get("referer") || ""
    const originHost = (() => { try { return new URL(origin).hostname } catch { return "" } })()
    if (originHost && !allowedDomains.some(d => originHost === d || originHost.endsWith("." + d))) {
      return new NextResponse('<div style="padding:20px;text-align:center;color:#ef4444;font-family:sans-serif">Domain not authorized</div>', {
        status: 403, headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }
  }

  const source = getDataSource(widget.data_source as string)
  if (!source) {
    return new NextResponse("Invalid data source", { status: 500, headers: { "Content-Type": "text/plain" } })
  }

  // Build filters -- merge stored filters with optional search
  let filters: WidgetFilter[] = []
  try { filters = typeof widget.filters === "string" ? JSON.parse(widget.filters) : (widget.filters || []) } catch { filters = [] }

  // If search is provided, add a LIKE filter on first text column
  if (search) {
    const textCol = source.columns.find(c => c.type === "text" && c.filterable)
    if (textCol) filters = [...filters, { column: textCol.key, operator: "like", value: search }]
  }

  let selectedCols: string[] = []
  try { selectedCols = typeof widget.columns === "string" ? JSON.parse(widget.columns) : (widget.columns || []) } catch { selectedCols = [] }

  const maxRows = Math.min(Number(widget.max_rows) || 25, 500)
  const offset = (page - 1) * maxRows

  const query = buildWidgetQuery(widget.data_source as string, selectedCols, filters, widget.sort_by as string, (widget.sort_dir as "asc" | "desc") || "asc", maxRows, offset)
  if (query.error) {
    return new NextResponse(`Query error: ${query.error}`, { status: 500, headers: { "Content-Type": "text/plain" } })
  }

  let rows: Record<string, unknown>[] = []
  let totalRows = 0
  try {
    rows = await sql.query(query.sql, query.params) as Record<string, unknown>[]
    const countQuery = buildWidgetCountQuery(widget.data_source as string, filters)
    if (!countQuery.error) {
      const countResult = await sql.query(countQuery.sql, countQuery.params)
      totalRows = Number(countResult[0]?.total) || 0
    }
  } catch (err: any) {
    return new NextResponse(`Data error: ${err.message}`, { status: 500, headers: { "Content-Type": "text/plain" } })
  }

  const totalPages = Math.ceil(totalRows / maxRows) || 1

  const resolvedCols = selectedCols.length > 0
    ? source.columns.filter(c => selectedCols.includes(c.key))
    : source.columns.filter(c => c.defaultVisible)

  const viewType = (widget.view_type || "table") as ViewType
  const stylePreset = (widget.style_preset || "modern") as StylePreset

  const css = generateWidgetCSS(stylePreset, viewType, widgetId)
  const bodyHtml = renderWidgetHTML(viewType, rows, resolvedCols, widgetId, {
    page, totalPages, totalRows, showPagination: widget.show_pagination !== false, emptyMessage: (widget.empty_message as string) || "No data available"
  })

  const showHeader = widget.show_header !== false
  const showFooter = widget.show_footer !== false
  const showSearch = widget.show_search === true
  const showPagination = widget.show_pagination !== false

  const headerHtml = showHeader
    ? `<div class="sw-header"><div><div class="sw-title">${escapeHtml((widget.header_title || widget.name) as string)}</div><div class="sw-subtitle">${totalRows} record${totalRows !== 1 ? "s" : ""}</div></div>${showSearch ? '<input class="sw-search" placeholder="Search..." />' : ""}</div>`
    : ""

  let paginationHtml = ""
  if (showPagination && totalPages > 1) {
    paginationHtml = `<div style="display:flex;gap:6px;align-items:center;">`
    paginationHtml += `<button class="sw-page-btn" data-sw-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Prev</button>`
    paginationHtml += `<span style="font-size:12px;">Page ${page} of ${totalPages}</span>`
    paginationHtml += `<button class="sw-page-btn" data-sw-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next</button>`
    paginationHtml += `</div>`
  }

  const footerHtml = showFooter
    ? `<div class="sw-footer"><span>${escapeHtml((widget.footer_text || "Powered by SeaRM") as string)}</span>${paginationHtml}</div>`
    : (showPagination && totalPages > 1 ? `<div class="sw-footer">${paginationHtml}</div>` : "")

  const widgetHtml = `<style>${css}${widget.custom_css ? "\n" + widget.custom_css : ""}</style><div id="searm-widget-${widgetId}">${headerHtml}<div class="sw-body">${bodyHtml}</div>${footerHtml}</div>`

  // Update view counter (fire and forget)
  sql`UPDATE widgets SET total_views = total_views + 1, last_viewed_at = NOW() WHERE id = ${widgetId}`.catch(() => {})

  // Log access
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || ""
  sql`INSERT INTO widget_logs (widget_id, action, ip_address, user_agent, referer, row_count) VALUES (${widgetId}, 'view', ${ip}, ${req.headers.get("user-agent") || ""}, ${req.headers.get("referer") || ""}, ${rows.length})`.catch(() => {})

  if (isIframe) {
    const fullPage = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;}</style></head><body>${widgetHtml}</body></html>`
    return new NextResponse(fullPage, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      }
    })
  }

  return new NextResponse(widgetHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    }
  })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
