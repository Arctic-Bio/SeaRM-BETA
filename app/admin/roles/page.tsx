'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { PERMISSIONS } from '@/lib/rbac/permissions'

interface Role {
  id: string
  name: string
  description: string
  color: string
  is_system: boolean
  permissions: string[]
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [expanding, setExpanding] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newRole, setNewRole] = useState({ name: '', description: '', color: '#6366f1' })
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    const res = await fetch('/api/roles')
    const data = await res.json()
    setRoles(data.data || [])
    setLoading(false)
  }

  const allPermissions = Object.values(PERMISSIONS).flatMap(cat => Object.values(cat))

  const handleCreateRole = async () => {
    if (!newRole.name) return
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...newRole, permissions: selectedPerms }),
    })
    if (res.ok) {
      await fetchRoles()
      setShowForm(false)
      setNewRole({ name: '', description: '', color: '#6366f1' })
      setSelectedPerms([])
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        roleId: editingRole.id,
        name: editingRole.name,
        description: editingRole.description,
        color: editingRole.color,
      }),
    })
    if (res.ok) {
      // Update permissions separately
      const permRes = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setPermissions', roleId: editingRole.id, permissions: selectedPerms }),
      })
      if (permRes.ok) {
        await fetchRoles()
        setEditingRole(null)
        setSelectedPerms([])
      }
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role? Users with this role will have no role assigned.')) return
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', roleId }),
    })
    if (res.ok) await fetchRoles()
  }

  const handleTogglePermission = (perm: string) => {
    setSelectedPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage custom roles and permissions</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingRole(null); setSelectedPerms([]) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showForm || editingRole) && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  value={editingRole ? editingRole.name : newRole.name}
                  onChange={e => editingRole ? setEditingRole({ ...editingRole, name: e.target.value }) : setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g. Map Supervisor"
                  disabled={editingRole?.is_system && editingRole?.name === 'Administrator'}
                />
                {editingRole?.is_system && editingRole?.name !== 'Administrator' && (
                  <p className="text-xs text-muted-foreground mt-1">System role -- you can rename and customize permissions.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editingRole ? editingRole.description : newRole.description}
                  onChange={e => editingRole ? setEditingRole({ ...editingRole, description: e.target.value }) : setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="What is this role for?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingRole ? editingRole.color : newRole.color}
                    onChange={e => editingRole ? setEditingRole({ ...editingRole, color: e.target.value }) : setNewRole({ ...newRole, color: e.target.value })}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground self-center">{editingRole ? editingRole.color : newRole.color}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Permissions</label>
              <div className="grid gap-2 md:grid-cols-2 max-h-96 overflow-y-auto p-3 bg-white rounded border">
                {allPermissions.map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(perm)}
                      onChange={() => handleTogglePermission(perm)}
                      className="w-4 h-4 rounded"
                    />
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">{perm}</code>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingRole(null); setSelectedPerms([]) }}>
                Cancel
              </Button>
              <Button onClick={editingRole ? handleUpdateRole : handleCreateRole}>
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    {role.is_system && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">System</span>}
                  </div>
                  <CardDescription className="mt-1">{role.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  {role.name !== 'Administrator' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setSelectedPerms(role.permissions || []); setShowForm(false) }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <button
                  onClick={() => setExpanding(expanding === role.id ? null : role.id)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                >
                  {expanding === role.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {(role.permissions || []).length} permissions
                </button>
                  {expanding === role.id && (
                  <div className="mt-2 space-y-1">
                    {(role.permissions || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No permissions</p>
                    ) : (
                      (role.permissions || []).map(perm => (
                        <div key={perm} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {perm}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
