// ============================================================================
// SeaRM Email System - Template Engine
// Handlebars-style variable interpolation with helpers and conditionals.
// ============================================================================

/**
 * Render a template string by replacing {{variable}} placeholders with data values.
 * Supports:
 *  - {{variable}} - simple substitution
 *  - {{#if variable}}...{{/if}} - conditional blocks
 *  - {{#unless variable}}...{{/unless}} - inverse conditional
 *  - {{#each items}}...{{/each}} - array iteration (uses {{this.field}})
 *  - {{formatDate variable}} - date formatting
 *  - {{uppercase variable}} - uppercase transform
 *  - {{lowercase variable}} - lowercase transform
 *  - {{default variable "fallback"}} - default value if empty
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template

  // Process {{#each items}}...{{/each}} blocks
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key, body) => {
    const arr = data[key]
    if (!Array.isArray(arr)) return ""
    return arr.map((item) => {
      let rendered = body
      if (typeof item === "object" && item !== null) {
        Object.entries(item).forEach(([k, v]) => {
          rendered = rendered.replace(new RegExp(`\\{\\{this\\.${k}\\}\\}`, "g"), String(v ?? ""))
        })
      } else {
        rendered = rendered.replace(/\{\{this\}\}/g, String(item ?? ""))
      }
      return rendered
    }).join("")
  })

  // Process {{#if variable}}...{{else}}...{{/if}} blocks
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (_match, key, ifBlock, elseBlock) => {
    const val = data[key]
    const truthy = val !== undefined && val !== null && val !== "" && val !== false && val !== 0
    return truthy ? ifBlock : (elseBlock || "")
  })

  // Process {{#unless variable}}...{{/unless}} blocks
  result = result.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_match, key, body) => {
    const val = data[key]
    const truthy = val !== undefined && val !== null && val !== "" && val !== false && val !== 0
    return truthy ? "" : body
  })

  // Process helpers: {{formatDate variable}}, {{uppercase variable}}, etc.
  result = result.replace(/\{\{formatDate\s+(\w+)\}\}/g, (_match, key) => {
    const val = data[key]
    if (!val) return ""
    try { return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) }
    catch { return String(val) }
  })

  result = result.replace(/\{\{uppercase\s+(\w+)\}\}/g, (_match, key) => String(data[key] ?? "").toUpperCase())
  result = result.replace(/\{\{lowercase\s+(\w+)\}\}/g, (_match, key) => String(data[key] ?? "").toLowerCase())
  result = result.replace(/\{\{default\s+(\w+)\s+"([^"]+)"\}\}/g, (_match, key, fallback) => data[key] ?? fallback)

  // Process simple {{variable}} substitutions (last, to avoid conflicts with helpers)
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const val = data[key]
    if (val === undefined || val === null) return ""
    return String(val)
  })

  return result
}

/**
 * Extract all variable keys from a template string.
 */
export function extractVariables(template: string): string[] {
  const vars = new Set<string>()
  const patterns = [
    /\{\{(\w+)\}\}/g,
    /\{\{#if\s+(\w+)\}\}/g,
    /\{\{#unless\s+(\w+)\}\}/g,
    /\{\{#each\s+(\w+)\}\}/g,
    /\{\{formatDate\s+(\w+)\}\}/g,
    /\{\{uppercase\s+(\w+)\}\}/g,
    /\{\{lowercase\s+(\w+)\}\}/g,
    /\{\{default\s+(\w+)\s+"[^"]+"\}\}/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(template)) !== null) {
      vars.add(match[1])
    }
  }
  return Array.from(vars)
}
