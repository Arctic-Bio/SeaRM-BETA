"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Copy } from "lucide-react"
import { useState } from "react"
import { CREW_TARGET_FIELDS, FULL_NAME_TARGET } from "@/lib/integrations/types"
import type { FieldMapRule } from "@/lib/integrations/types"

interface FieldPreviewProps {
  lastSubmissionPayload: Record<string, unknown> | null
  currentMappings: FieldMapRule[]
  onApplyMapping: (rules: FieldMapRule[]) => void
}

function detectType(value: unknown): string {
  if (value === null || value === undefined) return "null"
  if (typeof value === "string") {
    if (!isNaN(Number(value)) && value.trim() !== "") return "number"
    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") return "boolean"
    if (value.includes("@")) return "email"
    if (/^\d{10}|^\+\d{10,}|\(\d{3}\)/.test(value.replace(/[\s\-]/g, ""))) return "phone"
    return "text"
  }
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  if (Array.isArray(value)) return "array"
  return "object"
}

function suggestTarget(fieldName: string, value: string): string | null {
  const name = fieldName.toLowerCase()
  const val = String(value).toLowerCase()

  if (name.includes("name") || name.includes("full")) {
    if (name.includes("first")) return "first_name"
    if (name.includes("last")) return "last_name"
    return FULL_NAME_TARGET.key
  }
  if (name.includes("email") || name.includes("e-mail")) return "email"
  if (name.includes("phone") || name.includes("tel") || name.includes("mobile")) return "phone_number"
  if (name.includes("title") || name.includes("position") || name.includes("job")) return "job_title"
  if (name.includes("company") || name.includes("employer")) return "company"
  if (name.includes("location") || name.includes("city")) return "location"
  if (name.includes("experience") || name.includes("exp")) return "experience_level"
  if (name.includes("skill") || name.includes("expertise")) return "skills"
  if (name.includes("linkedin")) return "linkedin_url"

  return null
}

export function FieldPreview({ lastSubmissionPayload, currentMappings, onApplyMapping }: FieldPreviewProps) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!lastSubmissionPayload || Object.keys(lastSubmissionPayload).length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No recent submission data available. Submit a form first to see detected fields and types.
        </p>
      </div>
    )
  }

  const entries = Object.entries(lastSubmissionPayload).map(([key, value]) => {
    const type = detectType(value)
    const suggested = suggestTarget(key, String(value))
    const isMapped = currentMappings.some((m) => m.source === key)

    return { key, value, type, suggested, isMapped }
  })

  const suggestions = entries.filter((e) => e.suggested && !e.isMapped)

  const applySuggestions = () => {
    const newRules = suggestions.map((e) => ({
      source: e.key,
      target: e.suggested || "",
    }))
    onApplyMapping([...currentMappings, ...newRules])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-chart-2/25 bg-chart-2/5 p-3">
        <div className="text-2xl leading-none mt-0.5">💡</div>
        <div>
          <p className="text-xs font-semibold text-foreground">Auto-detect fields and types</p>
          <p className="text-xs text-muted-foreground mt-1">
            Below are all fields from your last submission. Click any to see its value, type, and suggested crew field.
            {suggestions.length > 0 && (
              <>
                {" "}
                <span className="font-semibold">{suggestions.length} field{suggestions.length !== 1 ? "s" : ""} can be auto-mapped.</span>
              </>
            )}
          </p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <Button onClick={applySuggestions} className="self-start gap-2" size="sm">
          <Check className="h-3.5 w-3.5" />
          Apply {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
        </Button>
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <FieldRow key={i} entry={entry} copied={copied} onCopy={setCopied} />
        ))}
      </div>
    </div>
  )
}

function FieldRow({
  entry,
  copied,
  onCopy,
}: {
  entry: ReturnType<typeof Object.entries>[0] & { type: string; suggested: string | null; isMapped: boolean }
  copied: string | null
  onCopy: (id: string) => void
}) {
  const [showValue, setShowValue] = useState(false)
  const valueStr = typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value)
  const isCopied = copied === entry.key

  const typeColors: Record<string, string> = {
    text: "bg-blue-100 text-blue-800",
    email: "bg-purple-100 text-purple-800",
    phone: "bg-green-100 text-green-800",
    number: "bg-orange-100 text-orange-800",
    boolean: "bg-pink-100 text-pink-800",
    null: "bg-gray-100 text-gray-800",
    array: "bg-cyan-100 text-cyan-800",
    object: "bg-indigo-100 text-indigo-800",
  }

  const targetField =
    CREW_TARGET_FIELDS.find((f) => f.key === entry.suggested) || 
    (entry.suggested === FULL_NAME_TARGET.key ? FULL_NAME_TARGET : null)

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono font-semibold text-foreground truncate">{entry.key}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[entry.type] || typeColors.text}`}>
          {entry.type}
        </Badge>
        {entry.isMapped && (
          <Badge className="text-xs bg-green-100 text-green-800 shrink-0">Already mapped</Badge>
        )}
      </div>

      <button
        onClick={() => setShowValue(!showValue)}
        className="text-left p-2 bg-muted/50 rounded text-xs font-mono hover:bg-muted/70 transition max-h-24 overflow-y-auto break-words whitespace-pre-wrap"
      >
        {showValue ? valueStr.slice(0, 500) : `${valueStr.slice(0, 80)}${valueStr.length > 80 ? "..." : ""}`}
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => {
            navigator.clipboard.writeText(valueStr)
            onCopy(entry.key)
            setTimeout(() => onCopy(null), 1500)
          }}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? "Copied" : "Copy value"}
        </Button>

        {entry.suggested && targetField && !entry.isMapped && (
          <div className="flex items-center gap-2 text-xs flex-1">
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Suggests:</span>
            <Badge className="text-xs">{targetField.label}</Badge>
          </div>
        )}
      </div>
    </div>
  )
}
