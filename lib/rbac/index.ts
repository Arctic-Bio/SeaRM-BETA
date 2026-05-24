import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface UserPermissions {
  userId: string
  roleId: string | null
  roleName: string | null
  permissions: string[]
  isAdmin: boolean
}

// Get all permissions for a user from DB
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    const result = await sql`
      SELECT 
        u.id,
        r.id as role_id,
        r.name as role_name,
        COALESCE(array_agg(rp.permission) FILTER (WHERE rp.permission IS NOT NULL), ARRAY[]::text[]) as permissions
      FROM users u
      LEFT JOIN custom_roles r ON u.custom_role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE u.id = ${userId}
      GROUP BY u.id, r.id, r.name
    `

    if (result.length === 0) {
      return { userId, roleId: null, roleName: null, permissions: [], isAdmin: false }
    }

    const row = result[0]
    return {
      userId,
      roleId: row.role_id || null,
      roleName: row.role_name || null,
      permissions: row.permissions || [],
      isAdmin: row.role_name === 'Administrator',
    }
  } catch (error) {
    console.error('[RBAC] Error fetching user permissions:', error)
    return { userId, roleId: null, roleName: null, permissions: [], isAdmin: false }
  }
}

// Check if user has specific permission
export function hasPermission(userPerms: UserPermissions, permission: string): boolean {
  if (userPerms.isAdmin) return true // Admins have all permissions
  return userPerms.permissions.includes(permission)
}

// Check if user has any of multiple permissions
export function hasAnyPermission(userPerms: UserPermissions, permissions: string[]): boolean {
  if (userPerms.isAdmin) return true
  return permissions.some(p => userPerms.permissions.includes(p))
}

// Check if user has all of multiple permissions
export function hasAllPermissions(userPerms: UserPermissions, permissions: string[]): boolean {
  if (userPerms.isAdmin) return true
  return permissions.every(p => userPerms.permissions.includes(p))
}

// Get all available roles with their permissions
export async function getAllRoles() {
  const roles = await sql`
    SELECT 
      r.id, r.name, r.description, r.color, r.is_system, r.created_at, r.updated_at,
      COALESCE(array_agg(rp.permission) FILTER (WHERE rp.permission IS NOT NULL), ARRAY[]::text[]) as permissions
    FROM custom_roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name, r.description, r.color, r.is_system, r.created_at, r.updated_at
    ORDER BY r.is_system DESC, r.name ASC
  `
  return roles
}

// Get a specific role with its permissions
export async function getRoleWithPermissions(roleId: string) {
  const result = await sql`
    SELECT 
      r.id, r.name, r.description, r.color, r.is_system,
      COALESCE(array_agg(rp.permission) FILTER (WHERE rp.permission IS NOT NULL), ARRAY[]::text[]) as permissions
    FROM custom_roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    WHERE r.id = ${roleId}
    GROUP BY r.id, r.name, r.description, r.color, r.is_system
  `
  if (result.length === 0) return null
  return result[0]
}

// Create a new custom role
export async function createRole(name: string, description: string = '', color: string = '#6366f1', permissions: string[] = []) {
  // Insert role
  const roleResult = await sql`
    INSERT INTO custom_roles (name, description, color, is_system)
    VALUES (${name}, ${description}, ${color}, false)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name, description, color, is_system
  `

  if (roleResult.length === 0) {
    throw new Error(`Role "${name}" already exists`)
  }

  const role = roleResult[0]

  // Insert permissions (if any)
  if (permissions.length > 0) {
    for (const perm of permissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission)
        VALUES (${role.id}, ${perm})
        ON CONFLICT (role_id, permission) DO NOTHING
      `
    }
  }

  return role
}

// Update a role
export async function updateRole(roleId: string, updates: { name?: string; description?: string; color?: string }) {
  const result = await sql`
    UPDATE custom_roles
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
  const role = await sql`SELECT is_system FROM custom_roles WHERE id = ${roleId}`
  if (role.length > 0 && role[0].is_system) {
    throw new Error('Cannot delete system roles')
  }

  await sql`DELETE FROM custom_roles WHERE id = ${roleId}`
}

// Set role permissions (replace all)
export async function setRolePermissions(roleId: string, permissions: string[]) {
  // Delete existing
  await sql`DELETE FROM role_permissions WHERE role_id = ${roleId}`

  // Insert new (if any)
  if (permissions.length > 0) {
    for (const perm of permissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission)
        VALUES (${roleId}, ${perm})
        ON CONFLICT (role_id, permission) DO NOTHING
      `
    }
  }
}

// Add permission to role
export async function addPermissionToRole(roleId: string, permission: string) {
  await sql`
    INSERT INTO role_permissions (role_id, permission)
    VALUES (${roleId}, ${permission})
    ON CONFLICT (role_id, permission) DO NOTHING
  `
}

// Remove permission from role
export async function removePermissionFromRole(roleId: string, permission: string) {
  await sql`
    DELETE FROM role_permissions
    WHERE role_id = ${roleId} AND permission = ${permission}
  `
}

// Assign role to user
export async function assignRoleToUser(userId: string, roleId: string | null) {
  await sql`
    UPDATE users
    SET custom_role_id = ${roleId}
    WHERE id = ${userId}
  `
}

// Get users with a specific role
export async function getUsersByRole(roleId: string) {
  const users = await sql`
    SELECT id, email, name, custom_role_id
    FROM users
    WHERE custom_role_id = ${roleId}
  `
  return users
}
