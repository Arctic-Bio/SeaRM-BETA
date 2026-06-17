"use client"

import { useState } from "react"
import { ChevronDown, Copy, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { IntegrationLog } from "@/lib/integrations/types"

interface LogDetailProps {
  log: IntegrationLog
}

export function LogDetail({ log }: LogDetailProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    request: true,
    payload: log.payload ? true : false,
    mapping: log.mapped_data ? true : false,
    response: log.response_body ? true : false,
    error: log.error_message ? true : false,
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const statusColor = {
    received: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    duplicate: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
    skipped: "bg-gray-50 border-gray-200",
  }

  const statusIcon = {
    received: <Clock className="h-4 w-4 text-blue-600" />,
    success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    duplicate: <Zap className="h-4 w-4 text-yellow-600" />,
    error: <AlertCircle className="h-4 w-4 text-red-600" />,
    skipped: <Clock className="h-4 w-4 text-gray-600" />,
  }

  const Section = ({ title, field, content }: { title: string; field: string; content: React.ReactNode }) => (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setExpanded((p) => ({ ...p, [field]: !p[field] }))}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
      >
        <span className="font-semibold text-sm">{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition transform ${expanded[field] ? "rotate-180" : ""}`}
        />
      </button>
      {expanded[field] && <div className="p-3 bg-gray-50 border-t">{content}</div>}
    </div>
  )

  const JsonDisplay = ({ data, title }: { data: unknown; title: string }) => {
    const json = JSON.stringify(data, null, 2)
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">{title}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(json)}
            className="h-6 px-2"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <pre className="bg-white border rounded p-2 text-xs max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-words">
          {json}
        </pre>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg ${statusColor[log.status]}`}>
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex items-center gap-3">
          {statusIcon[log.status]}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {log.status}
              </Badge>
              {log.action !== "none" && (
                <Badge className="capitalize">{log.action}</Badge>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          {log.crew_name && (
            <div className="text-sm font-semibold">{log.crew_name}</div>
          )}
          {log.crew_id && (
            <div className="text-xs text-gray-600 font-mono">{log.crew_id}</div>
          )}
          {log.duration_ms && (
            <div className="text-xs text-gray-600">{log.duration_ms}ms</div>
          )}
        </div>
      </div>

      <div className="divide-y">
        <Section
          title="Request Details"
          field="request"
          content={
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Method:</span>
                  <div className="font-mono font-semibold">{log.http_method}</div>
                </div>
                <div>
                  <span className="text-gray-600">Content-Type:</span>
                  <div className="font-mono text-xs truncate">{log.content_type || "—"}</div>
                </div>
                <div>
                  <span className="text-gray-600">IP Address:</span>
                  <div className="font-mono text-xs">{log.request_ip || "—"}</div>
                </div>
                <div>
                  <span className="text-gray-600">Response Status:</span>
                  <div className="font-mono font-semibold text-sm">
                    {log.response_status ? (
                      <span className={log.response_status >= 200 && log.response_status < 300 ? "text-green-600" : "text-red-600"}>
                        {log.response_status}
                      </span>
                    ) : "—"}
                  </div>
                </div>
              </div>

              {log.headers && Object.keys(log.headers).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">Headers</div>
                  <div className="bg-white border rounded p-2 text-xs space-y-1 font-mono max-h-40 overflow-y-auto">
                    {Object.entries(log.headers).map(([key, value]) => (
                      <div key={key} className="text-gray-600">
                        <span className="font-semibold">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {log.raw_body && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">Raw Body</div>
                  <div className="bg-white border rounded p-2 text-xs max-h-40 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                    {log.raw_body}
                  </div>
                </div>
              )}
            </div>
          }
        />

        {log.payload && (
          <Section
            title="Parsed Payload"
            field="payload"
            content={<JsonDisplay data={log.payload} title="Form fields received from Zapier" />}
          />
        )}

        {log.matched_count !== null && (
          <Section
            title={`Matching (${log.matched_count} field${log.matched_count !== 1 ? "s" : ""})`}
            field="matching"
            content={
              <div className="text-sm">
                <div className="text-gray-600 mb-2">
                  {log.matched_count} form field{log.matched_count !== 1 ? "s" : ""} matched to crew profile fields
                </div>
              </div>
            }
          />
        )}

        {log.mapped_data && (
          <Section
            title="Mapped Data"
            field="mapping"
            content={<JsonDisplay data={log.mapped_data} title="Transformed crew profile data" />}
          />
        )}

        {log.response_body && (
          <Section
            title="Response"
            field="response"
            content={<JsonDisplay data={log.response_body} title="API response sent back to Zapier" />}
          />
        )}

        {log.error_message && (
          <Section
            title="Error"
            field="error"
            content={
              <div className="space-y-2">
                <div className="p-2 bg-white border border-red-200 rounded text-sm font-mono text-red-800">
                  {log.error_message}
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}
