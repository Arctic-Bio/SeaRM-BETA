// ============================================================================
// SeaRM Email System - SMTP Transport Layer
// Pluggable transport supporting SMTP, and extensible for SES/SendGrid/etc.
// ============================================================================

import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { decrypt } from "./encryption"
import type { EmailProvider } from "./types"

// Cache transports by provider ID to avoid recreating connections
const transportCache = new Map<string, { transporter: Transporter; createdAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getTransport(provider: EmailProvider): Transporter {
  const cached = transportCache.get(provider.id)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return cached.transporter
  }

  const password = provider.password_encrypted ? decrypt(provider.password_encrypted) : ""

  const transporter = nodemailer.createTransport({
    host: provider.host,
    port: provider.port,
    secure: provider.secure,
    auth: provider.username ? { user: provider.username, pass: password } : undefined,
    tls: { rejectUnauthorized: provider.tls_reject_unauthorized },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 3600000,
    rateLimit: provider.max_per_hour,
  })

  transportCache.set(provider.id, { transporter, createdAt: Date.now() })
  return transporter
}

export function clearTransportCache(providerId?: string) {
  if (providerId) {
    const cached = transportCache.get(providerId)
    if (cached) {
      cached.transporter.close()
      transportCache.delete(providerId)
    }
  } else {
    transportCache.forEach((v) => v.transporter.close())
    transportCache.clear()
  }
}

export interface SendMailOptions {
  provider: EmailProvider
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  headers?: Record<string, string>
}

export interface SendMailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendMail(options: SendMailOptions): Promise<SendMailResult> {
  try {
    const transport = getTransport(options.provider)
    const fromAddr = options.provider.from_name
      ? `"${options.provider.from_name}" <${options.provider.from_email}>`
      : options.provider.from_email

    const info = await transport.sendMail({
      from: fromAddr,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      cc: options.cc?.join(", "),
      bcc: options.bcc?.join(", "),
      replyTo: options.replyTo || options.provider.reply_to || undefined,
      headers: { ...options.provider.custom_headers, ...options.headers },
    })

    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown transport error" }
  }
}

export async function testConnection(provider: EmailProvider): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransport(provider)
    await transport.verify()
    clearTransportCache(provider.id)
    return { success: true }
  } catch (err: any) {
    clearTransportCache(provider.id)
    return { success: false, error: err.message || "Connection failed" }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
