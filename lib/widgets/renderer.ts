// SeaRM Widget HTML Renderer
// Generates self-contained HTML for each view type that can be embedded anywhere
// ALL selected columns are always shown -- no truncation or dropping

import type { ColumnDef, ViewType } from "./types"

function esc(str: unknown): string {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function formatValue(value: unknown, col: ColumnDef): string {
  if (value === null || value === undefined || value === "") return '<span class="sw-null">&mdash;</span>'
  const str = String(value)
  switch (col.type) {
    case "date": {
      try {
        const d = new Date(str)
        if (isNaN(d.getTime())) return esc(str)
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      } catch { return esc(str) }
    }
    case "badge":
      return `<span class="sw-badge">${esc(str)}</span>`
    case "email":
      return `<a href="mailto:${esc(str)}" class="sw-link">${esc(str)}</a>`
    case "url":
      return `<a href="${esc(str)}" target="_blank" rel="noopener" class="sw-link">${esc(str.length > 50 ? str.slice(0, 47) + "..." : str)}</a>`
    case "boolean":
      return str === "true" || str === "1"
        ? '<span class="sw-bool sw-bool-yes">Yes</span>'
        : '<span class="sw-bool sw-bool-no">No</span>'
    case "number": {
      const n = Number(str)
      return isNaN(n) ? esc(str) : `<span class="sw-number">${n.toLocaleString()}</span>`
    }
    case "json": {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value
        const pretty = JSON.stringify(parsed, null, 2)
        return `<pre class="sw-json">${esc(pretty.length > 300 ? pretty.slice(0, 297) + "..." : pretty)}</pre>`
      } catch {
        return `<span class="sw-json-raw">${esc(str.length > 200 ? str.slice(0, 197) + "..." : str)}</span>`
      }
    }
    default: {
      if (str.length <= 200) return esc(str)
      return `<span title="${esc(str)}">${esc(str.slice(0, 197))}...</span>`
    }
  }
}

/** Pick the best title column from a set */
function pickTitleCol(columns: ColumnDef[]): ColumnDef {
  const nameCol = columns.find(c => /^(name|title|voyage_name|ship_name|first_name)$/i.test(c.key))
  if (nameCol) return nameCol
  const textCol = columns.find(c => c.type === "text" && !c.key.endsWith("_id") && c.key !== "id")
  return textCol || columns[0]
}

export function renderWidgetHTML(
  viewType: ViewType,
  rows: Record<string, unknown>[],
  columns: ColumnDef[],
  widgetId: string,
  opts: { page: number; totalPages: number; totalRows: number; showPagination: boolean; emptyMessage: string }
): string {
  if (!columns.length) return `<div class="sw-empty">No columns selected</div>`
  if (rows.length === 0) return `<div class="sw-empty">${esc(opts.emptyMessage)}</div>`

  switch (viewType) {
    case "table": return renderTable(rows, columns)
    case "cards": return renderCards(rows, columns)
    case "list": return renderList(rows, columns)
    case "stats": return renderStats(rows, columns)
    case "timeline": return renderTimeline(rows, columns)
    case "minimal": return renderMinimal(rows, columns)
    default: return renderTable(rows, columns)
  }
}

// ─── TABLE ──────────────────────────────────────────────────
// Shows ALL columns. Horizontally scrollable for many columns.
function renderTable(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const ths = columns.map(c => {
    const align = c.type === "number" ? "right" : "left"
    return `<th style="text-align:${align}!important;white-space:nowrap!important;">${esc(c.label)}</th>`
  }).join("")

  const trs = rows.map((row, i) => {
    const tds = columns.map(c => {
      const align = c.type === "number" ? "right" : "left"
      return `<td style="text-align:${align}!important;">${formatValue(row[c.key], c)}</td>`
    }).join("")
    return `<tr class="${i % 2 === 1 ? "sw-alt" : ""}">${tds}</tr>`
  }).join("")

  return `<div class="sw-table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`
}

// ─── CARDS ──────────────────────────────────────────────────
// Title + subtitle at top, ALL remaining columns shown as labeled fields in a grid.
function renderCards(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const titleCol = pickTitleCol(columns)
  const subtitleCol = columns.find(c => c !== titleCol && (c.type === "badge") && c.key !== "id" && !c.key.endsWith("_id"))
  const fieldCols = columns.filter(c => c !== titleCol && c !== subtitleCol)

  const cards = rows.map(row => {
    const title = formatValue(row[titleCol.key], titleCol)
    const subtitle = subtitleCol ? formatValue(row[subtitleCol.key], subtitleCol) : ""

    // Show ALL remaining columns as labeled key-value fields
    const fields = fieldCols.map(c =>
      `<div class="sw-card-field"><span class="sw-card-label">${esc(c.label)}</span><span class="sw-card-value">${formatValue(row[c.key], c)}</span></div>`
    ).join("")

    return `<div class="sw-card">
      <div class="sw-card-header">
        <div class="sw-card-title">${title}</div>
        ${subtitle ? `<div class="sw-card-subtitle">${subtitle}</div>` : ""}
      </div>
      <div class="sw-card-body">${fields}</div>
    </div>`
  }).join("")

  return `<div class="sw-cards">${cards}</div>`
}

// ─── LIST ───────────────────────────────────────────────────
// Title as main line, ALL other columns shown -- first few inline, rest in expandable row.
function renderList(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const titleCol = pickTitleCol(columns)
  const restCols = columns.filter(c => c !== titleCol)

  const items = rows.map((row, i) => {
    const primary = formatValue(row[titleCol.key], titleCol)

    // ALL remaining columns are shown -- first 4 inline, rest in secondary row
    const inlineCols = restCols.slice(0, 4)
    const overflowCols = restCols.slice(4)

    const inlineMeta = inlineCols.map(c =>
      `<span class="sw-list-tag" title="${esc(c.label)}">${formatValue(row[c.key], c)}</span>`
    ).join("")

    const extraMeta = overflowCols.length > 0
      ? `<div class="sw-list-extra">${overflowCols.map(c =>
          `<span class="sw-list-extra-item"><span class="sw-list-extra-label">${esc(c.label)}:</span> ${formatValue(row[c.key], c)}</span>`
        ).join("")}</div>`
      : ""

    return `<div class="sw-list-item ${i % 2 === 1 ? "sw-alt" : ""}">
      <div class="sw-list-main">
        <div class="sw-list-primary">${primary}</div>
        <div class="sw-list-meta">${inlineMeta}</div>
      </div>
      ${extraMeta}
    </div>`
  }).join("")

  return `<div class="sw-list">${items}</div>`
}

// ─── STATS ──────────────────────────────────────────────────
// Generates stats for EVERY selected column, not capped.
function renderStats(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const stats: { label: string; value: string; sub?: string }[] = []

  stats.push({ label: "Total Records", value: rows.length.toLocaleString() })

  for (const col of columns) {
    switch (col.type) {
      case "number": {
        const nums = rows.map(r => Number(r[col.key])).filter(n => !isNaN(n))
        if (nums.length > 0) {
          const sum = nums.reduce((a, b) => a + b, 0)
          const avg = sum / nums.length
          const min = Math.min(...nums)
          const max = Math.max(...nums)
          stats.push({ label: `Total ${col.label}`, value: sum.toLocaleString(), sub: `Avg: ${avg.toFixed(1)}` })
          if (min !== max) stats.push({ label: `${col.label} Range`, value: `${min.toLocaleString()} \u2013 ${max.toLocaleString()}` })
        }
        break
      }
      case "badge": {
        const counts: Record<string, number> = {}
        for (const r of rows) { const v = String(r[col.key] ?? "").trim(); if (v) counts[v] = (counts[v] || 0) + 1 }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        if (sorted.length > 0) {
          stats.push({ label: `${col.label} Types`, value: String(sorted.length), sub: `Top: ${sorted[0][0]} (${sorted[0][1]})` })
        }
        break
      }
      case "date": {
        const dates = rows.map(r => new Date(String(r[col.key] ?? ""))).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime())
        if (dates.length >= 2) {
          const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
          stats.push({ label: `${col.label} Range`, value: `${fmt(dates[0])} \u2013 ${fmt(dates[dates.length - 1])}` })
        } else if (dates.length === 1) {
          stats.push({ label: `${col.label}`, value: dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) })
        }
        break
      }
      case "boolean": {
        const trueCount = rows.filter(r => String(r[col.key]) === "true" || String(r[col.key]) === "1").length
        stats.push({ label: col.label, value: `${trueCount} / ${rows.length}`, sub: `${((trueCount / rows.length) * 100).toFixed(0)}% yes` })
        break
      }
      case "email": {
        const unique = new Set(rows.map(r => String(r[col.key] ?? "").toLowerCase()).filter(Boolean))
        stats.push({ label: `Unique ${col.label}s`, value: String(unique.size) })
        break
      }
      case "text": {
        if (col.key === "id" || col.key.endsWith("_id")) break
        const unique = new Set(rows.map(r => String(r[col.key] ?? "").trim()).filter(Boolean))
        if (unique.size > 0 && unique.size <= 20) {
          stats.push({ label: `${col.label} Values`, value: String(unique.size), sub: `of ${rows.length} records` })
        } else if (unique.size > 20) {
          stats.push({ label: `Unique ${col.label}`, value: String(unique.size) })
        }
        break
      }
      case "url": {
        const filled = rows.filter(r => r[col.key] != null && String(r[col.key]).trim() !== "").length
        stats.push({ label: `${col.label} Filled`, value: `${filled} / ${rows.length}` })
        break
      }
      case "json": {
        const filled = rows.filter(r => r[col.key] != null && String(r[col.key]).trim() !== "" && String(r[col.key]) !== "null").length
        stats.push({ label: `${col.label} Present`, value: `${filled} / ${rows.length}` })
        break
      }
    }
  }

  const cards = stats.map(s =>
    `<div class="sw-stat">
      <div class="sw-stat-value">${esc(s.value)}</div>
      <div class="sw-stat-label">${esc(s.label)}</div>
      ${s.sub ? `<div class="sw-stat-sub">${esc(s.sub)}</div>` : ""}
    </div>`
  ).join("")

  return `<div class="sw-stats">${cards}</div>`
}

// ─── TIMELINE ───────────────────────────────────────────────
// Uses best date column for ordering, shows ALL other columns as meta tags per item.
function renderTimeline(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const dateCol = columns.find(c => c.type === "date") || columns[columns.length - 1]
  const titleCol = pickTitleCol(columns.filter(c => c !== dateCol))
  const allMeta = columns.filter(c => c !== dateCol && c !== titleCol)

  const items = rows.map(row => {
    const date = formatValue(row[dateCol.key], dateCol)
    const title = formatValue(row[titleCol.key], titleCol)
    // ALL remaining columns shown as labeled tags
    const metaHtml = allMeta.map(c =>
      `<span class="sw-tl-tag"><span class="sw-tl-tag-label">${esc(c.label)}:</span> ${formatValue(row[c.key], c)}</span>`
    ).join("")

    return `<div class="sw-tl-item">
      <div class="sw-tl-marker"><div class="sw-tl-dot"></div></div>
      <div class="sw-tl-content">
        <div class="sw-tl-header">
          <div class="sw-tl-title">${title}</div>
          <div class="sw-tl-date">${date}</div>
        </div>
        ${metaHtml ? `<div class="sw-tl-meta">${metaHtml}</div>` : ""}
      </div>
    </div>`
  }).join("")

  return `<div class="sw-timeline">${items}</div>`
}

// ─── MINIMAL ────────────────────────────────────────────────
// Title + ALL remaining columns as a flowing inline list with separators.
function renderMinimal(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const titleCol = pickTitleCol(columns)
  const restCols = columns.filter(c => c !== titleCol)

  const items = rows.map((row, i) => {
    const title = formatValue(row[titleCol.key], titleCol)
    // ALL remaining columns shown inline, separated by dots
    const details = restCols.map(c => formatValue(row[c.key], c)).join(' <span class="sw-min-sep">&middot;</span> ')

    return `<div class="sw-min-row ${i % 2 === 1 ? "sw-alt" : ""}">
      <span class="sw-min-title">${title}</span>
      ${restCols.length > 0 ? `<span class="sw-min-details">${details}</span>` : ""}
    </div>`
  }).join("")

  return `<div class="sw-minimal">${items}</div>`
}
