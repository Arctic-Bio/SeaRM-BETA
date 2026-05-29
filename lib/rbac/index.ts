import { getDb } from "@/lib/db"

export interface UserPermissions {
  userId: string
  roles: { id: string; name: string; permissions: string[] }[]
  allPermissions: string[]
  isAdmin: boolean
  isSysadmin: boolean
}

// Get all permissions for a user from the new roles/user_roles tables
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const sql = getDb()
  try {
    // Get all roles assigned to this user via user_roles junction table
    const result = await sql`
      SELECT 
        r.id,
        r.name,
        r.permissions
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${userId}
      ORDER BY r.name
    `

    let roles = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    }))

    // Fallback: if no user_roles entries, check legacy role column on users table
    if (roles.length === 0) {
      const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`
      const legacyRole = userResult[0]?.role
      if (legacyRole) {
        // Try to match legacy role to a role in the roles table
        const matchedRole = await sql`SELECT id, name, permissions FROM roles WHERE name = ${legacyRole}`
        if (matchedRole.length > 0) {
          roles = matchedRole.map((row: any) => ({
            id: row.id,
            name: row.name,
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
          }))
          // Auto-assign the matched role to user_roles for future lookups
          await sql`
            INSERT INTO user_roles (user_id, role_id)
            VALUES (${userId}, ${matchedRole[0].id})
            ON CONFLICT (user_id, role_id) DO NOTHING
          `
        } else {
          // Legacy role is "sysadmin"/"captain"/"hr"/"crew" - map to new roles
          const roleMap: Record<string, string> = { sysadmin: 'sysadmin', captain: 'admin', hr: 'crew_manager', crew: 'viewer' }
          const mappedName = roleMap[legacyRole] || 'viewer'
          const mapped = await sql`SELECT id, name, permissions FROM roles WHERE name = ${mappedName}`
          if (mapped.length > 0) {
            roles = mapped.map((row: any) => ({
              id: row.id,
              name: row.name,
              permissions: Array.isArray(row.permissions) ? row.permissions : [],
            }))
            await sql`
              INSERT INTO user_roles (user_id, role_id)
              VALUES (${userId}, ${mapped[0].id})
              ON CONFLICT (user_id, role_id) DO NOTHING
            `
          }
        }
      }
    }

    // Flatten all permissions from all roles
    const allPermissions = [...new Set(roles.flatMap(r => r.permissions))]
    
    const isSysadmin = roles.some(r => r.name === 'sysadmin') || allPermissions.includes('*')
    const isAdmin = isSysadmin || roles.some(r => r.name === 'admin')

    return {
      userId,
      roles,
      allPermissions,
      isAdmin,
      isSysadmin,
    }
  } catch (error) {
    console.error('[RBAC] Error fetching user permissions:', error)
    return { userId, roles: [], allPermissions: [], isAdmin: false, isSysadmin: false }
  }
}

// Check if user has specific permission
export function hasPermission(userPerms: UserPermissions, permission: string): boolean {
  if (userPerms.isSysadmin) return true
  if (userPerms.allPermissions.includes('*')) return true
  return userPerms.allPermissions.includes(permission)
}

// Check if user has any of multiple permissions
export function hasAnyPermission(userPerms: UserPermissions, permissions: string[]): boolean {
  if (userPerms.isSysadmin) return true
  return permissions.some(p => userPerms.allPermissions.includes(p))
}

// Check if user has all of multiple permissions
export function hasAllPermissions(userPerms: UserPermissions, permissions: string[]): boolean {
  if (userPerms.isSysadmin) return true
  return permissions.every(p => userPerms.allPermissions.includes(p))
}

// Get all available roles
export async function getAllRoles() {
  const sql = getDb()
  const roles = await sql`
    SELECT id, name, description, permissions, is_system, color, created_at, updated_at
    FROM roles
    ORDER BY is_system DESC, name ASC
  `
  return roles
}

// Get a specific role
export async function getRoleWithPermissions(roleId: string) {
  const sql = getDb()
  const result = await sql`
    SELECT id, name, description, permissions, is_system, color
    FROM roles
    WHERE id = ${roleId}
  `
  if (result.length === 0) return null
  return result[0]
}

// Create a new role
export async function createRole(name: string, description: string = '', color: string = '#6366f1', permissions: string[] = []) {
  const sql = getDb()
  const roleResult = await sql`
    INSERT INTO roles (name, description, color, permissions, is_system)
    VALUES (${name}, ${description}, ${color}, ${JSON.stringify(permissions)}::jsonb, false)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name, description, color, permissions, is_system
  `

  if (roleResult.length === 0) {
    throw new Error(`Role "${name}" already exists`)
  }

  return roleResult[0]
}

// Update a role
export async function updateRole(roleId: string, updates: { name?: string; description?: string; color?: string }) {
  const sql = getDb()
  const result = await sql`
    UPDATE roles
    SET 
      name = COALESCE(${updates.name || null}, name),
      description = COALESCE(${updates.description || null}, description),
      color = COALESCE(${updates.color || null}, color),
      updated_at = NOW()
    WHERE id = ${roleId}
    RETURNING *
  `
  if (result.length === 0) throw new Error('Role not found')
  return result[0]
}

// Delete a role (can't delete system roles)
export async function deleteRole(roleId: string) {
  const sql = getDb()
  const role = await sql`SELECT is_system FROM roles WHERE id = ${roleId}`
  if (role.length > 0 && role[0].is_system) {
    throw new Error('Cannot delete system roles')
  }
  await sql`DELETE FROM user_roles WHERE role_id = ${roleId}`
  await sql`DELETE FROM roles WHERE id = ${roleId}`
}

// Set role permissions (replace all)
export async function setRolePermissions(roleId: string, permissions: string[]) {
  const sql = getDb()
  await sql`
    UPDATE roles
    SET permissions = ${JSON.stringify(permissions)}::jsonb, updated_at = NOW()
    WHERE id = ${roleId}
  `
}

// Add permission to role
export async function addPermissionToRole(roleId: string, permission: string) {
  const sql = getDb()
  await sql`
    UPDATE roles
    SET permissions = permissions || ${JSON.stringify([permission])}::jsonb, updated_at = NOW()
    WHERE id = ${roleId} AND NOT (permissions ? ${permission})
  `
}

// Remove permission from role
export async function removePermissionFromRole(roleId: string, permission: string) {
  const sql = getDb()
  await sql`
    UPDATE roles
    SET permissions = permissions - ${permission}, updated_at = NOW()
    WHERE id = ${roleId}
  `
}

// Assign role to user (using user_roles junction)
export async function assignRoleToUser(userId: string, roleId: string, assignedBy?: string) {
  const sql = getDb()
  await sql`
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (${userId}, ${roleId}, ${assignedBy || null})
    ON CONFLICT (user_id, role_id) DO NOTHING
  `
}

// Remove role from user
export async function removeRoleFromUser(userId: string, roleId: string) {
  const sql = getDb()
  await sql`
    DELETE FROM user_roles
    WHERE user_id = ${userId} AND role_id = ${roleId}
  `
}

// Get all roles for a user
export async function getUserRoles(userId: string) {
  const sql = getDb()
  const roles = await sql`
    SELECT r.id, r.name, r.description, r.color, r.permissions, ur.assigned_at
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ${userId}
    ORDER BY r.name
  `
  return roles
}

// Get users with a specific role
export async function getUsersByRole(roleId: string) {
  const sql = getDb()
  const users = await sql`
    SELECT u.id, u.email, u.name, ur.assigned_at
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role_id = ${roleId}
    ORDER BY u.name
  `
  return users
}

// Set all roles for a user (replace existing)
export async function setUserRoles(userId: string, roleIds: string[], assignedBy?: string) {
  const sql = getDb()
  await sql`DELETE FROM user_roles WHERE user_id = ${userId}`
  for (const roleId of roleIds) {
    await sql`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (${userId}, ${roleId}, ${assignedBy || null})
    `
  }
}
