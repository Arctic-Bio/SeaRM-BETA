// SeaRM Widget Style Generator - Advanced CSS Isolation
// Generates bulletproof, fully-scoped CSS that survives any host-page styling

import { STYLE_PRESETS, type StylePreset, type ViewType } from "./types"

export function generateWidgetCSS(preset: StylePreset, viewType: ViewType, widgetId: string): string {
  const presetDef = STYLE_PRESETS.find(s => s.value === preset)
  if (!presetDef) return ""

  const c = presetDef.colors
  const w = `#searm-widget-${widgetId}` // scoped selector

  return `
/* ── RESET ────────────────────────────── */
${w}, ${w} *, ${w} *::before, ${w} *::after {
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  font: inherit !important;
  color: inherit !important;
  background: transparent !important;
  text-decoration: none !important;
  list-style: none !important;
  vertical-align: baseline !important;
}
${w} {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  color: ${c.text} !important;
  background: ${c.bg} !important;
  border: 1px solid ${c.border} !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  -webkit-font-smoothing: antialiased !important;
}

/* ── NULL / EMPTY ─────────────────────── */
${w} .sw-null { opacity: 0.3 !important; }

/* ── BADGE ────────────────────────────── */
${w} .sw-badge {
  display: inline-block !important;
  padding: 2px 10px !important;
  border-radius: 999px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  background: ${c.accentLight} !important;
  color: ${c.accent} !important;
  white-space: nowrap !important;
  line-height: 1.6 !important;
  letter-spacing: 0.01em !important;
}

/* ── BOOL ─────────────────────────────── */
${w} .sw-bool { font-weight: 500 !important; font-size: 12px !important; }
${w} .sw-bool-yes { color: #16a34a !important; }
${w} .sw-bool-no { color: #dc2626 !important; }

/* ── NUMBER ───────────────────────────── */
${w} .sw-number { font-variant-numeric: tabular-nums !important; }

/* ── JSON ─────────────────────────────── */
${w} .sw-json {
  font-family: 'SF Mono', Menlo, Consolas, monospace !important;
  font-size: 11px !important;
  background: ${c.headerBg} !important;
  padding: 6px 8px !important;
  border-radius: 4px !important;
  overflow-x: auto !important;
  max-width: 300px !important;
  white-space: pre-wrap !important;
  word-break: break-all !important;
  line-height: 1.4 !important;
  display: block !important;
}
${w} .sw-json-raw { font-family: 'SF Mono', Menlo, Consolas, monospace !important; font-size: 11px !important; }

/* ── LINKS ────────────────────────────── */
${w} a, ${w} .sw-link {
  color: ${c.accent} !important;
  text-decoration: none !important;
  cursor: pointer !important;
}
${w} a:hover, ${w} .sw-link:hover { text-decoration: underline !important; }

/* ── HEADER / FOOTER ──────────────────── */
${w} .sw-header {
  padding: 14px 18px !important;
  background: ${c.headerBg} !important;
  border-bottom: 1px solid ${c.border} !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
}
${w} .sw-title { font-weight: 700 !important; font-size: 15px !important; color: ${c.text} !important; }
${w} .sw-subtitle { font-size: 11px !important; opacity: 0.5 !important; margin-top: 2px !important; }
${w} .sw-search {
  padding: 6px 12px !important;
  border: 1px solid ${c.border} !important;
  border-radius: 6px !important;
  font-size: 13px !important;
  background: ${c.bg} !important;
  color: ${c.text} !important;
  outline: none !important;
  width: 200px !important;
  max-width: 100% !important;
}
${w} .sw-search:focus { border-color: ${c.accent} !important; box-shadow: 0 0 0 2px ${c.accentLight} !important; }
${w} .sw-body { overflow-x: auto !important; }
${w} .sw-footer {
  padding: 10px 18px !important;
  border-top: 1px solid ${c.border} !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  font-size: 11px !important;
  opacity: 0.6 !important;
  background: ${c.headerBg} !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}
${w} .sw-empty {
  padding: 40px 18px !important;
  text-align: center !important;
  opacity: 0.45 !important;
  font-size: 13px !important;
}

/* ── TABLE ────────────────────────────── */
${w} .sw-table-wrap { overflow-x: auto !important; }
${w} table {
  width: 100% !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  display: table !important;
}
${w} thead { display: table-header-group !important; background: ${c.headerBg} !important; }
${w} tbody { display: table-row-group !important; }
${w} tr { display: table-row !important; }
${w} th {
  display: table-cell !important;
  padding: 10px 14px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: ${c.text} !important;
  opacity: 0.6 !important;
  background: ${c.headerBg} !important;
  border-bottom: 2px solid ${c.border} !important;
  white-space: nowrap !important;
  user-select: none !important;
}
${w} td {
  display: table-cell !important;
  padding: 10px 14px !important;
  border-bottom: 1px solid ${c.border}30 !important;
  font-size: 13px !important;
  color: ${c.text} !important;
  max-width: 320px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
${w} tr.sw-alt td { background: ${c.headerBg}40 !important; }
${w} tbody tr:hover td { background: ${c.accentLight}50 !important; }
${w} tbody tr:last-child td { border-bottom: none !important; }

/* ── CARDS ────────────────────────────── */
${w} .sw-cards {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
  gap: 14px !important;
  padding: 16px !important;
}
${w} .sw-card {
  border: 1px solid ${c.border} !important;
  border-radius: 8px !important;
  background: ${c.bg} !important;
  overflow: hidden !important;
  transition: box-shadow 0.2s, border-color 0.2s !important;
}
${w} .sw-card:hover {
  box-shadow: 0 4px 16px ${c.accent}18 !important;
  border-color: ${c.accent}60 !important;
}
${w} .sw-card-header {
  padding: 14px 16px 10px !important;
  border-bottom: 1px solid ${c.border}30 !important;
}
${w} .sw-card-title { font-weight: 700 !important; font-size: 14px !important; color: ${c.text} !important; }
${w} .sw-card-subtitle { font-size: 12px !important; opacity: 0.6 !important; margin-top: 4px !important; }
${w} .sw-card-body { padding: 10px 16px !important; display: flex !important; flex-direction: column !important; gap: 6px !important; }
${w} .sw-card-field {
  display: flex !important;
  align-items: flex-start !important;
  gap: 10px !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
}
${w} .sw-card-label {
  min-width: 80px !important;
  flex-shrink: 0 !important;
  opacity: 0.5 !important;
  font-weight: 500 !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  padding-top: 1px !important;
}
${w} .sw-card-value { flex: 1 !important; }
${w} .sw-card-extras {
  padding: 8px 16px 12px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  font-size: 11px !important;
  opacity: 0.55 !important;
  border-top: 1px solid ${c.border}20 !important;
}

/* ── LIST ─────────────────────────────── */
${w} .sw-list { display: flex !important; flex-direction: column !important; }
${w} .sw-list-item {
  padding: 12px 18px !important;
  border-bottom: 1px solid ${c.border}25 !important;
  transition: background 0.1s !important;
}
${w} .sw-list-item.sw-alt { background: ${c.headerBg}40 !important; }
${w} .sw-list-item:hover { background: ${c.accentLight}40 !important; }
${w} .sw-list-item:last-child { border-bottom: none !important; }
${w} .sw-list-main {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  flex-wrap: wrap !important;
}
${w} .sw-list-primary { font-weight: 600 !important; font-size: 14px !important; flex: 1 !important; min-width: 100px !important; }
${w} .sw-list-meta { display: flex !important; gap: 8px !important; align-items: center !important; flex-wrap: wrap !important; }
${w} .sw-list-tag { font-size: 12px !important; }
${w} .sw-list-extra {
  margin-top: 6px !important;
  padding-top: 6px !important;
  border-top: 1px solid ${c.border}15 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  font-size: 11px !important;
  opacity: 0.6 !important;
}
${w} .sw-list-extra-label { font-weight: 600 !important; opacity: 0.7 !important; }

/* ── STATS ────────────────────────────── */
${w} .sw-stats {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
  gap: 12px !important;
  padding: 16px !important;
}
${w} .sw-stat {
  text-align: center !important;
  padding: 18px 12px !important;
  border: 1px solid ${c.border} !important;
  border-radius: 8px !important;
  background: ${c.headerBg} !important;
  transition: border-color 0.2s !important;
}
${w} .sw-stat:hover { border-color: ${c.accent} !important; }
${w} .sw-stat-value {
  font-size: 22px !important;
  font-weight: 800 !important;
  color: ${c.accent} !important;
  line-height: 1.2 !important;
  font-variant-numeric: tabular-nums !important;
}
${w} .sw-stat-label {
  font-size: 10px !important;
  opacity: 0.55 !important;
  margin-top: 6px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  font-weight: 700 !important;
}
${w} .sw-stat-sub {
  font-size: 11px !important;
  opacity: 0.45 !important;
  margin-top: 3px !important;
}

/* ── TIMELINE ─────────────────────────── */
${w} .sw-timeline { padding: 16px 18px 16px 18px !important; }
${w} .sw-tl-item {
  display: flex !important;
  gap: 14px !important;
  padding-bottom: 18px !important;
  position: relative !important;
}
${w} .sw-tl-item:last-child { padding-bottom: 0 !important; }
${w} .sw-tl-marker {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  flex-shrink: 0 !important;
  width: 18px !important;
}
${w} .sw-tl-dot {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  background: ${c.accent} !important;
  flex-shrink: 0 !important;
  margin-top: 5px !important;
  box-shadow: 0 0 0 3px ${c.accentLight} !important;
}
${w} .sw-tl-item:not(:last-child) .sw-tl-marker::after {
  content: '' !important;
  display: block !important;
  width: 2px !important;
  flex: 1 !important;
  background: ${c.border} !important;
  margin-top: 4px !important;
}
${w} .sw-tl-content { flex: 1 !important; min-width: 0 !important; }
${w} .sw-tl-header {
  display: flex !important;
  align-items: baseline !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
}
${w} .sw-tl-title { font-weight: 700 !important; font-size: 13px !important; }
${w} .sw-tl-date { font-size: 11px !important; opacity: 0.5 !important; white-space: nowrap !important; }
${w} .sw-tl-meta {
  margin-top: 6px !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  font-size: 12px !important;
}
${w} .sw-tl-tag { display: inline !important; }
${w} .sw-tl-tag-label { font-weight: 600 !important; opacity: 0.5 !important; font-size: 10px !important; text-transform: uppercase !important; }

/* ── MINIMAL ──────────────────────────── */
${w} .sw-minimal { padding: 4px 0 !important; }
${w} .sw-min-row {
  padding: 8px 18px !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  font-size: 13px !important;
  border-bottom: 1px solid ${c.border}15 !important;
  transition: background 0.1s !important;
}
${w} .sw-min-row.sw-alt { background: ${c.headerBg}30 !important; }
${w} .sw-min-row:hover { background: ${c.accentLight}40 !important; }
${w} .sw-min-row:last-child { border-bottom: none !important; }
${w} .sw-min-title { font-weight: 600 !important; min-width: 100px !important; flex-shrink: 0 !important; }
${w} .sw-min-details { flex: 1 !important; font-size: 12px !important; opacity: 0.7 !important; overflow: hidden !important; text-overflow: ellipsis !important; }
${w} .sw-min-sep { opacity: 0.3 !important; margin: 0 2px !important; }
`.trim()
}
