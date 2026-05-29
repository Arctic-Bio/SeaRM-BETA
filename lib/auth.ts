import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

let cachedSql: ReturnType<typeof neon> | null = null

function getSqlInstance() {
  if (!cachedSql) {
    cachedSql = neon(process.env.DATABASE_URL!)
  }
  return cachedSql
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "searm-secret-key-change-in-production")

export type UserRole = "sysadmin" | "captain" | "hr" | "crew"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  crew_id: string | null
  is_active: boolean
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    crew_id: user.crew_id,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      crew_id: payload.crew_id as string | null,
      is_active: true,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setAuthSession(userId: string): Promise<void> {
  const sql = getSqlInstance()
  const user = await sql`SELECT id, email, name, role, crew_id, is_active FROM users WHERE id = ${userId}`
  if (!user.length) throw new Error("User not found")
  
  const authUser: AuthUser = {
    id: user[0].id as string,
    email: user[0].email as string,
    name: user[0].name as string,
    role: user[0].role as UserRole,
    crew_id: user[0].crew_id as string | null,
    is_active: user[0].is_active as boolean,
  }
  
  const token = await createToken(authUser)
  const cookieStore = await cookies()
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthUser> {
  const user = await getSession()
  if (!user) throw new Error("UNAUTHORIZED")
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error("FORBIDDEN")
  return user
}

export function isStaff(role: UserRole): boolean {
  return ["sysadmin", "captain", "hr"].includes(role)
}

export async function registerUser(email: string, password: string, name: string, role: UserRole = "crew", crewId?: string) {
  const hash = await hashPassword(password)
  const emailLower = email.toLowerCase()
  const sql = getSqlInstance()
  const result = await sql`INSERT INTO users (email, password_hash, name, role, crew_id) VALUES (${emailLower}, ${hash}, ${name}, ${role}, ${crewId || null}) RETURNING id, email, name, role, crew_id, is_active`
  return result[0] as AuthUser
}

// Create user for SSO (no password required)
export async function createUser(data: { email: string; name: string; password?: string }): Promise<string> {
  const emailLower = data.email.toLowerCase()
  const hash = data.password ? await hashPassword(data.password) : null
  const sql = getSqlInstance()
  const result = await sql`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (${emailLower}, ${hash}, ${data.name}, 'crew', true)
    RETURNING id
  `
  return result[0]?.id as string
}

export async function loginUser(email: string, password: string): Promise<AuthUser | null> {
  const emailLower = email.toLowerCase()
  const sql = getSqlInstance()
  const result = await sql`SELECT * FROM users WHERE email = ${emailLower} AND is_active = true`
  if (!result.length) return null
  const user = result[0]
  const valid = await verifyPassword(password, user.password_hash as string)
  if (!valid) return null
  await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`
  return {
    id: user.id as string,
    email: user.email as string,
    name: user.name as string,
    role: user.role as UserRole,
    crew_id: user.crew_id as string | null,
    is_active: true,
  }
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  sysadmin: ["*"],
  captain: [
    "crew.view", "crew.edit", "crew.status", "crew.tags",
    "ships.view", "ships.edit", "voyages.view", "voyages.edit",
    "positions.view", "positions.edit", "positions.assign",
    "tasks.view", "tasks.edit", "tasks.create",
    "documents.view", "documents.upload", "documents.verify",
    "incidents.view", "incidents.create", "incidents.edit",
    "checklists.view", "checklists.edit",
    "export.data", "pipeline.view", "availability.view",
    "users.view",
  ],
  hr: [
    "crew.view", "crew.edit", "crew.status", "crew.tags",
    "ships.view", "voyages.view", "voyages.edit",
    "positions.view", "positions.edit", "positions.assign",
    "tasks.view", "tasks.edit", "tasks.create",
    "documents.view", "documents.upload", "documents.verify",
    "incidents.view", "incidents.create", "incidents.edit",
    "checklists.view", "checklists.edit",
    "export.data", "pipeline.view", "availability.view",
    "users.view",
  ],
  crew: [
    "portal.view",
    "crew.view.own", "documents.view.own", "documents.upload.own", "documents.sign.own",
    "tasks.view.own", "checklists.view.own", "incidents.create",
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (perms.includes("*")) return true
  if (perms.includes(permission)) return true
  const base = permission.replace(".own", "")
  return perms.includes(base)
}
