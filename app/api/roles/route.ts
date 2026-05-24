import { NextRequest, NextResponse } from 'next/server'
import { getAllRoles, getRoleWithPermissions, createRole, updateRole, deleteRole, setRolePermissions, addPermissionToRole, removePermissionFromRole, getUsersByRole } from '@/lib/rbac'
import { PERMISSIONS } from '@/lib/rbac/permissions'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roleId = searchParams.get('roleId')

  if (roleId) {
    // Get specific role with permissions
    const role = await getRoleWithPermissions(roleId)
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    return NextResponse.json({ data: role })
  }

  // Get all roles
  const roles = await getAllRoles()
  return NextResponse.json({ data: roles })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, roleId, name, description, color, permissions } = body

  // Create new role
  if (action === 'create') {
    const role = await createRole(name, description, color, permissions || [])
    return NextResponse.json({ data: role })
  }

  // Guard: look up the role to check if it's the Administrator
  if (roleId && ['update', 'delete', 'setPermissions', 'addPermission', 'removePermission'].includes(action)) {
    const target = await getRoleWithPermissions(roleId)
    if (target?.name === 'Administrator') {
      return NextResponse.json({ error: 'The Administrator role cannot be modified.' }, { status: 403 })
    }
  }

  // Update role
  if (action === 'update') {
    const role = await updateRole(roleId, { name, description, color })
    return NextResponse.json({ data: role })
  }

  // Delete role
  if (action === 'delete') {
    await deleteRole(roleId)
    return NextResponse.json({ success: true })
  }

  // Set permissions for role
  if (action === 'setPermissions') {
    await setRolePermissions(roleId, permissions || [])
    return NextResponse.json({ success: true })
  }

  // Add permission to role
  if (action === 'addPermission') {
    await addPermissionToRole(roleId, permissions[0])
    return NextResponse.json({ success: true })
  }

  // Remove permission from role
  if (action === 'removePermission') {
    await removePermissionFromRole(roleId, permissions[0])
    return NextResponse.json({ success: true })
  }

  // Get users with role
  if (action === 'getUsers') {
    const users = await getUsersByRole(roleId)
    return NextResponse.json({ data: users })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// Get all available permissions
export async function PUT(req: NextRequest) {
  const allPermissions = Object.values(PERMISSIONS).flatMap(cat => Object.values(cat))
  return NextResponse.json({ data: allPermissions })
}
