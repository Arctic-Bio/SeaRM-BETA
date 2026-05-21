// ============================================================================
// SeaRM Email System - Credential Encryption
// Simple reversible encryption for SMTP passwords stored in DB.
// Uses AES-256-GCM with a secret derived from EMAIL_ENCRYPTION_KEY env var.
// ============================================================================

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.EMAIL_ENCRYPTION_KEY || process.env.DATABASE_URL || "searm-default-encryption-key-change-me"
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decrypt(encryptedStr: string): string {
  try {
    const key = getKey()
    const parts = encryptedStr.split(":")
    if (parts.length !== 3) return encryptedStr // Not encrypted, return as-is
    const iv = Buffer.from(parts[0], "base64")
    const tag = Buffer.from(parts[1], "base64")
    const encrypted = Buffer.from(parts[2], "base64")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final("utf8")
  } catch {
    return encryptedStr // If decryption fails, return original
  }
}
