"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Shield, UserPlus, Loader2, Search, Users, ToggleLeft, ToggleRight, UserCheck, UserX, KeyRound, Eye, EyeOff, Copy, Link2 } from "lucide-react"
import { CrewLinkPopover } from "@/components/crew-link-popover"

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const ROLES = ["sysadmin", "captain", "hr", "crew"] as const
const ROLE_COLORS: Record<string, string> = {
  sysadmin: "bg-destructive/10 text-destructive border-destructive/20",
  captain: "bg-primary/10 text-primary border-primary/20",
  hr: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  crew: "bg-chart-4/15 text-chart-4 border-chart-4/20",
}

export default function UsersPage() {
  const { user } = useAuth()
  const { data: users, mutate } = useSWR("/api/users", fetcher)
  const { data: crewList } = useSWR("/api/crew?limit=500", fetcher)
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "crew" as string, crew_id: "" })
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; name: string; role: string } | null>(null)

  const genPw = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
  }

  const generatePassword = () => setForm((f) => ({ ...f, password: genPw() }))

  // Reset password state
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<any>(null)
  const [resetPw, setResetPw] = useState("")
  const [resetPwVisible, setResetPwVisible] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const openResetPassword = (u: any) => {
    const pw = genPw()
    setResetUser(u)
    setResetPw(pw)
    setResetPwVisible(true)
    setResetDone(false)
    setResetOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetUser || !resetPw) return
    setResetSaving(true)
    const res = await fetch("/api/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resetUser.id, reset_password: resetPw }),
    })
    setResetSaving(false)
    if (res.ok) { setResetDone(true); toast.success("Password reset successfully") }
    else toast.error("Failed to reset password")
  }

  // Link crew handler
  const handleLinkCrew = async (userId: string, crewId: string) => {
    await fetch("/api/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, crew_id: crewId || null }),
    })
    toast.success(crewId ? "Crew linked" : "Crew unlinked")
    mutate()
  }

  if (!user || user.role !== "sysadmin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Only sysadmin can manage users.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allUsers = Array.isArray(users) ? users : []
  const filtered = allUsers.filter((u: any) => {
    if (filterRole !== "all" && u.role !== filterRole) return false
    if (search) {
      const q = search.toLowerCase()
      return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    return true
  })

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) { toast.error("All fields required"); return }
    setSaving(true)
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setCreatedCreds({ email: form.email, password: form.password, name: form.name, role: form.role })
      toast.success(`Account created for ${form.name}`)
      setCreateOpen(false)
      setForm({ email: "", password: "", name: "", role: "crew", crew_id: "" })
      mutate()
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to create account")
    }
  }

  const handleToggleActive = async (userId: string, active: boolean) => {
    await fetch("/api/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, is_active: !active }),
    })
    toast.success(active ? "Account deactivated" : "Account activated")
    mutate()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch("/api/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: newRole }),
    })
    toast.success("Role updated")
    mutate()
  }

  const handleBulkActivate = async (activate: boolean) => {
    if (selected.size === 0) return
    for (const id of selected) {
      await fetch("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: activate }),
      })
    }
    toast.success(`${selected.size} account(s) ${activate ? "activated" : "deactivated"}`)
    setSelected(new Set())
    mutate()
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((u: any) => u.id)))
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />Users & Roles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{allUsers.length} accounts total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />Create Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total", count: allUsers.length, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Active", count: allUsers.filter((u: any) => u.is_active).length, icon: UserCheck, color: "bg-success/10 text-success" },
          { label: "Inactive", count: allUsers.filter((u: any) => !u.is_active).length, icon: UserX, color: "bg-muted text-muted-foreground" },
          { label: "Sysadmin", count: allUsers.filter((u: any) => u.role === "sysadmin").length, icon: Shield, color: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + bulk */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <Badge variant="outline" className="text-xs">{selected.size} selected</Badge>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => handleBulkActivate(true)}>
              <ToggleRight className="h-3 w-3" />Activate All
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8 text-destructive" onClick={() => handleBulkActivate(false)}>
              <ToggleLeft className="h-3 w-3" />Deactivate All
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Linked Crew</TableHead>
                <TableHead className="text-xs">Last Login</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No users found.</TableCell>
                </TableRow>
              ) : filtered.map((u: any) => (
                <TableRow key={u.id} className="group">
                  <TableCell>
                    <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} />
                  </TableCell>
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.id === user?.id ? (
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role] || ""}`}>{u.role}</Badge>
                    ) : (
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent p-0">
                          <SelectValue>
                            <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role] || ""}`}>{u.role}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {crewList?.data && crewList.data.length > 0 ? (
                      <CrewLinkPopover
                        crewList={crewList.data}
                        currentCrewId={u.crew_id}
                        onLink={(crewId) => handleLinkCrew(u.id, crewId)}
                        onUnlink={() => handleLinkCrew(u.id, "")}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No crew available</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {u.id !== user?.id && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset Password" onClick={() => openResetPassword(u)}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>Create a new user account. Only sysadmin can perform this action.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Full name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input type="email" placeholder="Email address *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <div className="flex gap-2">
              <Input type="text" placeholder="Password *" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="flex-1 font-mono text-sm" />
              <Button type="button" variant="outline" size="sm" onClick={generatePassword}>Generate</Button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.role === "crew" && crewList?.data && crewList.data.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Link to Crew Profile (optional)</label>
                <CrewLinkPopover
                  crewList={crewList.data}
                  currentCrewId={form.crew_id || null}
                  onLink={(crewId) => setForm((f) => ({ ...f, crew_id: crewId }))}
                  onUnlink={() => setForm((f) => ({ ...f, crew_id: "" }))}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                      <Link2 className="h-3.5 w-3.5 mr-2" />
                      {form.crew_id ? "Change Crew" : "Select Crew Member"}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.email || !form.password || !form.name}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={(open) => { if (!open) { setResetOpen(false); setResetUser(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetUser && <>Generate a new password for <span className="font-medium text-foreground">{resetUser.name}</span> ({resetUser.email})</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <label className="text-xs text-muted-foreground mb-2 block">New Password</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={resetPwVisible ? "text" : "password"}
                    value={resetPw}
                    onChange={(e) => { setResetPw(e.target.value); setResetDone(false) }}
                    className="font-mono text-sm pr-10"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="absolute right-0 top-0 h-full w-9"
                    onClick={() => setResetPwVisible(!resetPwVisible)}
                  >
                    {resetPwVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setResetPw(genPw()); setResetDone(false) }}>
                  Regenerate
                </Button>
                <Button
                  type="button" variant="outline" size="icon" className="h-9 w-9"
                  onClick={() => { navigator.clipboard.writeText(resetPw); toast.success("Password copied") }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {resetDone && (
              <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                <p className="text-xs text-success font-medium mb-2">Password has been reset. Copy the credentials below to send to the user:</p>
                <div className="bg-background rounded border p-3 text-xs font-mono space-y-1">
                  <div><span className="text-muted-foreground">Name:</span> {resetUser?.name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {resetUser?.email}</div>
                  <div><span className="text-muted-foreground">Password:</span> {resetPw}</div>
                </div>
                <Button
                  variant="outline" size="sm" className="mt-2 w-full text-xs gap-1"
                  onClick={() => {
                    const text = `SeaRM Login Credentials\n\nName: ${resetUser?.name}\nEmail: ${resetUser?.email}\nNew Password: ${resetPw}\n\nLogin at: ${window.location.origin}/login`
                    navigator.clipboard.writeText(text)
                    toast.success("Credentials copied to clipboard")
                  }}
                >
                  <Copy className="h-3 w-3" />Copy All Credentials
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {resetDone ? "Done" : "Cancel"}
            </Button>
            {!resetDone && (
              <Button onClick={handleResetPassword} disabled={resetSaving || !resetPw}>
                {resetSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Reset Password
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Credentials Display */}
      <Dialog open={!!createdCreds} onOpenChange={(open) => !open && setCreatedCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Created Successfully</DialogTitle>
            <DialogDescription>Save these credentials and send them to the user. The password will not be shown again.</DialogDescription>
          </DialogHeader>
          {createdCreds && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{createdCreds.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_COLORS[createdCreds.role] || ""}`}>{createdCreds.role}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <span className="text-sm font-mono">{createdCreds.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password</span>
                  <span className="text-sm font-mono font-bold tracking-wide">{createdCreds.password}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm" className="flex-1"
                  onClick={() => {
                    const text = `SeaRM Login Credentials\n\nName: ${createdCreds.name}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}\nRole: ${createdCreds.role}\n\nLogin at: ${window.location.origin}/login`
                    navigator.clipboard.writeText(text)
                    toast.success("Credentials copied to clipboard")
                  }}
                >
                  Copy All to Clipboard
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setCreatedCreds(null)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
