"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { SignaturePad } from "@/components/signature-pad"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Anchor, LogOut, User, FileText, Ship, Calendar, Clock,
  Upload, Download, Loader2, CheckCircle2, AlertTriangle,
  MapPin, Lightbulb, PenLine, Check, X, Timer, Pencil, Save,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CrewPortalPage() {
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const crewId = user?.crew_id

  const { data: portal, mutate: mutatePortal } = useSWR(crewId ? "/api/portal" : null, fetcher)
  const { data: seaTime } = useSWR(crewId ? `/api/crew/${crewId}/sea-time` : null, fetcher)
  const { data: docs, mutate: mutateDocs } = useSWR(crewId ? `/api/documents?crew_id=${crewId}` : null, fetcher)

  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState("passport")
  const [docExpiry, setDocExpiry] = useState("")
  const [signOpen, setSignOpen] = useState(false)
  const [signDocId, setSignDocId] = useState("")
  const [signDocName, setSignDocName] = useState("")
  const [signDocType, setSignDocType] = useState("")
  const [signName, setSignName] = useState("")
  const [signing, setSigning] = useState(false)
  const [signMode, setSignMode] = useState<"typed" | "drawn">("typed")
  const [signDrawnData, setSignDrawnData] = useState<string | null>(null)
  const [signAgreed, setSignAgreed] = useState(false)
  const [signStep, setSignStep] = useState<"preview" | "sign">("preview")
  const [editProfile, setEditProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", pronouns: "" })
  const [savingProfile, setSavingProfile] = useState(false)

  // Availability dates
  const [editAvail, setEditAvail] = useState(false)
  const [availStart, setAvailStart] = useState("")
  const [availEnd, setAvailEnd] = useState("")
  const [savingAvail, setSavingAvail] = useState(false)
  const [availConfirm, setAvailConfirm] = useState(false)

  const openEditAvail = () => {
    setAvailStart(portal?.profile?.availability_start_date || "")
    setAvailEnd(portal?.profile?.availability_end_date || "")
    setEditAvail(true)
    setAvailConfirm(false)
  }

  const handleSaveAvail = async () => {
    if (!availConfirm) { setAvailConfirm(true); return }
    setSavingAvail(true)
    const res = await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability_start_date: availStart, availability_end_date: availEnd }),
    })
    setSavingAvail(false)
    if (res.ok) {
      toast.success("Availability updated")
      setEditAvail(false)
      setAvailConfirm(false)
      mutatePortal()
    } else toast.error("Failed to update availability")
  }

  const profile = portal?.profile
  const assignments = portal?.assignments || []
  const requirements = portal?.requirements || []
  const allDocs = portal?.documents || []
  const tips = portal?.tips || []
  const requiredDocuments = portal?.requiredDocuments || []
  const tasks = portal?.tasks || []
  const requiredEsignDocuments = portal?.requiredEsignDocuments || []
  const onboardingStages = portal?.onboardingStages || []

  const handleLogout = async () => { await logout(); router.push("/login") }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !crewId) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("crew_id", crewId)
    fd.append("document_type", docType)
    if (docExpiry) fd.append("expiry_date", docExpiry)
    fd.append("uploaded_by", user?.name || "crew")
    const res = await fetch("/api/documents", { method: "POST", body: fd })
    setUploading(false)
    if (res.ok) { toast.success("Document uploaded"); mutateDocs(); mutatePortal() }
  else toast.error("Upload failed")
  e.target.value = ""
  }

  const [deleting, setDeleting] = useState<string | null>(null)
  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) return
    setDeleting(docId)
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
    setDeleting(null)
    if (res.ok) { toast.success("Document deleted"); mutateDocs(); mutatePortal() }
    else toast.error("Failed to delete document")
  }

  const openSign = (docId: string, docName: string, docType?: string) => {
    setSignDocId(docId)
    setSignDocName(docName)
    setSignDocType(docType || "")
    setSignName("")
    setSignMode("typed")
    setSignDrawnData(null)
    setSignAgreed(false)
    setSignStep("preview")
    setSignOpen(true)
  }

  const handleSign = async () => {
    if (!signName.trim()) { toast.error("Please type your full legal name"); return }
    if (!signAgreed) { toast.error("You must agree to the electronic signature terms"); return }
    if (signMode === "drawn" && !signDrawnData) { toast.error("Please draw your signature on the pad"); return }
    setSigning(true)
    const res = await fetch("/api/portal/sign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: signDocId,
        signature_name: signName,
        signature_type: signMode,
        signature_image: signMode === "drawn" ? signDrawnData : null,
        agreed: true,
      }),
    })
    setSigning(false)
    if (res.ok) {
      toast.success("Document signed successfully")
      setSignOpen(false)
      mutatePortal()
      mutateDocs()
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to sign")
    }
  }

  const openEditProfile = () => {
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      pronouns: profile?.pronouns || "",
    })
    setEditProfile(true)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const res = await fetch("/api/portal/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    })
    setSavingProfile(false)
    if (res.ok) {
      toast.success("Profile updated")
      setEditProfile(false)
      mutatePortal()
    } else toast.error("Failed to update profile")
  }

  // Campaign timeline calculations
  const activeAssignment = assignments.find((a: any) => a.voyage_status === "active" || a.voyage_status === "planning")
  const campaignStart = activeAssignment?.start_date ? new Date(activeAssignment.start_date) : null
  const campaignEnd = activeAssignment?.end_date ? new Date(activeAssignment.end_date) : null
  const now = new Date()
  const daysUntilCampaign = campaignStart && campaignStart > now ? Math.ceil((campaignStart.getTime() - now.getTime()) / 86400000) : null
  const daysIntoCampaign = campaignStart && campaignStart <= now ? Math.ceil((now.getTime() - campaignStart.getTime()) / 86400000) : null
  const totalCampaignDays = campaignStart && campaignEnd ? Math.ceil((campaignEnd.getTime() - campaignStart.getTime()) / 86400000) : null
  const campaignProgress = daysIntoCampaign && totalCampaignDays ? Math.min(100, Math.round((daysIntoCampaign / totalCampaignDays) * 100)) : 0

  // Requirements progress
  const completedReqs = requirements.filter((r: any) => r.completed)
  const reqProgress = requirements.length > 0 ? Math.round((completedReqs.length / requirements.length) * 100) : 0

  // Docs needing signature
  const unsignedDocs = allDocs.filter((d: any) => d.requires_signature && !d.signed_by)
  const signedDocs = allDocs.filter((d: any) => d.requires_signature && d.signed_by)

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Anchor className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground mt-1">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (!user) { router.push("/login"); return null }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10">
              <Anchor className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">Crew Portal</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Welcome back, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {!crewId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-medium mb-1">No crew profile linked</h2>
              <p className="text-sm text-muted-foreground">Contact your administrator to link your account to a crew profile.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Campaign Timeline Banner */}
            {activeAssignment && (
              <Card className="mb-5 border-primary/20 bg-primary/[0.03]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Ship className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">{activeAssignment.voyage_name}</h2>
                        <p className="text-xs text-muted-foreground">{activeAssignment.ship_name} -- {activeAssignment.position_title || "Crew"}</p>
                      </div>
                    </div>
                    <Badge variant={activeAssignment.voyage_status === "active" ? "default" : "outline"} className="text-[10px] capitalize">
                      {activeAssignment.voyage_status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {campaignStart?.toLocaleDateString()} - {campaignEnd?.toLocaleDateString() || "TBD"}
                    </div>
                    {daysUntilCampaign !== null && daysUntilCampaign > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-chart-3" />
                        <span className="text-xs font-medium text-chart-3">{daysUntilCampaign} days until departure</span>
                      </div>
                    )}
                    {daysIntoCampaign !== null && daysIntoCampaign > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">Day {daysIntoCampaign} of {totalCampaignDays}</span>
                      </div>
                    )}
                  </div>

                  {daysIntoCampaign !== null && totalCampaignDays && (
                    <Progress value={campaignProgress} className="h-2" />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium capitalize">{profile?.status || "..."}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-chart-2/10 flex items-center justify-center"><Ship className="h-4 w-4 text-chart-2" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sea Days</p>
                    <p className="text-sm font-medium">{seaTime?.totalDays ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-chart-3/10 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-chart-3" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Requirements</p>
                    <p className="text-sm font-medium">{completedReqs.length}/{requirements.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-chart-4/10 flex items-center justify-center"><PenLine className="h-4 w-4 text-chart-4" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">To Sign</p>
                    <p className="text-sm font-medium">{unsignedDocs.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            {tips.length > 0 && (
              <Card className="mb-5 border-chart-3/20 bg-chart-3/[0.03]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-chart-3" />
                    <span className="text-xs font-semibold text-chart-3">Tips & Reminders</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {tips.map((tip: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-chart-3 mt-0.5">--</span>{tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview" className="flex flex-col gap-4">
              <TabsList className="w-auto self-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="esign">
                  E-Sign
                  {unsignedDocs.length > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]">{unsignedDocs.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex flex-col gap-4">
                {/* Onboarding Timeline */}
                {onboardingStages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">Onboarding Timeline</CardTitle>
                          <CardDescription>Track your progress through each stage of the onboarding process.</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {onboardingStages.filter((s: any) => s.completed).length}/{onboardingStages.length} complete
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-0">
                        {onboardingStages.map((stage: any, i: number) => {
                          const isLast = i === onboardingStages.length - 1
                          const isCurrent = !stage.completed && (i === 0 || onboardingStages[i - 1]?.completed)
                          return (
                            <div key={stage.key} className="flex gap-3">
                              {/* Timeline line + dot */}
                              <div className="flex flex-col items-center">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                  stage.completed
                                    ? "bg-success/15 border-success text-success"
                                    : isCurrent
                                    ? "bg-primary/15 border-primary text-primary animate-pulse"
                                    : "bg-muted border-border text-muted-foreground"
                                }`}>
                                  {stage.completed ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : isCurrent ? (
                                    <Clock className="h-3.5 w-3.5" />
                                  ) : (
                                    <span className="text-[10px] font-medium">{i + 1}</span>
                                  )}
                                </div>
                                {!isLast && (
                                  <div className={`w-0.5 flex-1 min-h-6 ${
                                    stage.completed ? "bg-success/30" : "bg-border"
                                  }`} />
                                )}
                              </div>
                              {/* Content */}
                              <div className={`pb-4 flex-1 ${isLast ? "pb-0" : ""}`}>
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${
                                    stage.completed ? "text-success" : isCurrent ? "text-foreground" : "text-muted-foreground"
                                  }`}>
                                    {stage.label}
                                  </p>
                                  {stage.completed && (
                                    <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Done</Badge>
                                  )}
                                  {isCurrent && (
                                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Current</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                                {stage.date && (
                                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {new Date(stage.date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Campaign Assignments</CardTitle>
                    <CardDescription>Your current and past voyage assignments.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {assignments.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No assignments yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Voyage</TableHead>
                            <TableHead className="text-xs">Ship</TableHead>
                            <TableHead className="text-xs">Position</TableHead>
                            <TableHead className="text-xs">Dates</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell className="text-sm font-medium">{a.voyage_name}</TableCell>
                              <TableCell className="text-sm">{a.ship_name || "-"}</TableCell>
                              <TableCell className="text-sm">{a.position_title || "-"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {a.start_date ? new Date(a.start_date).toLocaleDateString() : "?"} - {a.end_date ? new Date(a.end_date).toLocaleDateString() : "TBD"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize">{a.status || a.voyage_status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Requirements summary */}
                {requirements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">Onboarding Progress</CardTitle>
                          <CardDescription>{completedReqs.length} of {requirements.length} requirements completed</CardDescription>
                        </div>
                        <span className="text-lg font-bold text-primary">{reqProgress}%</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={reqProgress} className="h-2" />
                    </CardContent>
                  </Card>
                )}

                {/* Sea Time Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sea Time Summary</CardTitle>
                    <CardDescription>Total: {seaTime?.totalDays ?? 0} days at sea</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!seaTime?.records?.length ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No sea time records yet.</div>
                    ) : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="text-xs">Voyage</TableHead>
                          <TableHead className="text-xs">Ship</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                          <TableHead className="text-xs">Days</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {seaTime.records.map((r: any) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">{r.voyage_name || "-"}</TableCell>
                              <TableCell className="text-sm">{r.ship_name || "-"}</TableCell>
                              <TableCell className="text-sm">{r.role || "-"}</TableCell>
                              <TableCell className="text-sm font-medium">{r.days}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Requirements Tab */}
              <TabsContent value="requirements">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Onboarding Requirements</CardTitle>
                        <CardDescription>Complete these items before your deployment.</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">{completedReqs.length}/{requirements.length} done</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {requirements.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No requirements assigned yet.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Progress value={reqProgress} className="h-2 mb-3" />
                        {requirements.map((req: any) => (
                          <div key={req.id} className={`flex items-center gap-3 p-3 rounded-lg border ${req.completed ? "bg-muted/30 border-muted" : "border-border"}`}>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${req.completed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                              {req.completed ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${req.completed ? "line-through text-muted-foreground" : "font-medium"}`}>{req.title}</p>
                              {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                            </div>
                            {req.completed ? (
                              <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 shrink-0">Done</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20 shrink-0">Pending</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="flex flex-col gap-4">
                {/* Required Documents Checklist */}
                {requiredDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">Required Documents</CardTitle>
                          <CardDescription>These documents must be uploaded and verified before deployment.</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {requiredDocuments.filter((r: any) => r.fulfilled).length}/{requiredDocuments.length} submitted
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {requiredDocuments.map((rd: any) => (
                          <div key={rd.type} className={`flex items-center gap-3 p-3 rounded-lg border ${rd.fulfilled ? (rd.verified ? "bg-success/[0.03] border-success/20" : "bg-muted/30 border-muted") : "border-destructive/20 bg-destructive/[0.03]"}`}>
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${rd.fulfilled ? (rd.verified ? "bg-success/15 text-success" : "bg-primary/10 text-primary") : "bg-destructive/10 text-destructive"}`}>
                              {rd.fulfilled ? (rd.verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />) : <AlertTriangle className="h-3.5 w-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${rd.fulfilled ? (rd.verified ? "text-muted-foreground" : "font-medium") : "font-medium"}`}>{rd.label}</p>
                              {rd.description && <p className="text-xs text-muted-foreground mt-0.5">{rd.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {rd.expired && (
                                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" />Expired
                                </Badge>
                              )}
                              {rd.fulfilled ? (
                                rd.verified ? (
                                  <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" />Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20">Awaiting Review</Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">Missing</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* All Documents + Upload */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">All Documents</CardTitle>
                      <CardDescription>Upload and manage your certificates and documents.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["passport", "stcw", "medical", "visa", "certificate", "id_card", "contract", "waiver", "other"].map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-muted-foreground whitespace-nowrap">Exp. Date:</label>
                        <Input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} className="h-8 w-32 text-xs" />
                      </div>
                      <label className="cursor-pointer">
                        <Button size="sm" className="gap-1" asChild disabled={uploading}>
                          <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload</span>
                        </Button>
                        <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!Array.isArray(docs) || docs.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Document</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Required</TableHead>
                            <TableHead className="text-xs">Expiry</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {docs.map((doc: any) => {
                            const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date()
                            const isRequired = requiredDocuments.some((rd: any) => rd.type === doc.document_type)
                            return (
                              <TableRow key={doc.id}>
                                <TableCell className="text-sm"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{doc.file_name}</div></TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px]">{doc.document_type?.replace(/_/g, " ")}</Badge></TableCell>
                                <TableCell>
                                  {isRequired ? (
                                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Required</Badge>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Optional</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {doc.expiry_date ? (
                                    <span className={isExpired ? "text-destructive font-medium" : "text-muted-foreground"}>
                                      {isExpired && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                                      {new Date(doc.expiry_date).toLocaleDateString()}
                                    </span>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>
                                  {doc.verified ? (
                                    <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/20 gap-0.5"><CheckCircle2 className="h-3 w-3" />Verified</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-chart-3/15 text-chart-3 border-chart-3/25">Pending</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={`/api/documents/${doc.id}`} download><Download className="h-3 w-3" /></a></Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteDoc(doc.id)}
                                      disabled={deleting === doc.id}
                                    >
                                      {deleting === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* E-Sign Tab */}
              <TabsContent value="esign">
                <div className="flex flex-col gap-4">
                  {/* Required E-Signature Documents Checklist */}
                  {requiredEsignDocuments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">Required E-Signature Documents</CardTitle>
                            <CardDescription>These documents must be electronically signed before deployment.</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {requiredEsignDocuments.filter((e: any) => e.signed).length}/{requiredEsignDocuments.length} signed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          {requiredEsignDocuments.map((esign: any) => (
                            <div key={esign.type} className={`flex items-center gap-3 p-3 rounded-lg border ${
                              esign.signed
                                ? "bg-success/[0.03] border-success/20"
                                : esign.uploaded
                                ? "bg-chart-3/[0.03] border-chart-3/20"
                                : "bg-muted/30 border-border"
                            }`}>
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                                esign.signed
                                  ? "bg-success/15 text-success"
                                  : esign.uploaded
                                  ? "bg-chart-3/10 text-chart-3"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {esign.signed ? <CheckCircle2 className="h-3.5 w-3.5" /> : esign.uploaded ? <PenLine className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{esign.label}</p>
                                  {esign.is_global && (
                                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-chart-2/10 text-chart-2 border-chart-2/20">Global</Badge>
                                  )}
                                </div>
                                {esign.description && <p className="text-xs text-muted-foreground mt-0.5">{esign.description}</p>}
                                {!esign.uploaded && !esign.signed && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Your coordinator will upload this document for you to sign.</p>
                                )}
                                {esign.signed && esign.signature_name && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Signed as <span className="italic font-serif">{esign.signature_name}</span>
                                    {esign.signed_at && ` on ${new Date(esign.signed_at).toLocaleDateString()}`}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {esign.signed ? (
                                  <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" />Signed
                                  </Badge>
                                ) : esign.uploaded ? (
                                  <div className="flex items-center gap-1.5">
                                    <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                                      <a href={`/api/documents/${esign.doc_id}`} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-3 w-3 mr-1" />View
                                      </a>
                                    </Button>
                                    <Button size="sm" className="text-xs h-7 gap-1" onClick={() => openSign(esign.doc_id, esign.file_name, esign.label)}>
                                      <PenLine className="h-3 w-3" />Sign
                                    </Button>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] bg-chart-1/10 text-chart-1 border-chart-1/20 gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />Pending from Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Unsigned docs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Other Documents Requiring Signature</CardTitle>
                      <CardDescription>Review and electronically sign the documents below by typing your full legal name.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {unsignedDocs.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">No documents pending your signature.</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {unsignedDocs.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-chart-3/20 bg-chart-3/[0.03]">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-chart-3/10 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-chart-3" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                    {doc.document_type && ` -- ${doc.document_type.replace(/_/g, " ")}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                                  <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3 w-3 mr-1" />View
                                  </a>
                                </Button>
                                <Button size="sm" className="text-xs h-7 gap-1" onClick={() => openSign(doc.id, doc.file_name, doc.document_type)}>
                                  <PenLine className="h-3 w-3" />Sign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Already signed */}
                  {signedDocs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Signed Documents</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Document</TableHead>
                              <TableHead className="text-xs">Signed As</TableHead>
                              <TableHead className="text-xs">Signed On</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {signedDocs.map((doc: any) => (
                              <TableRow key={doc.id}>
                                <TableCell className="text-sm">{doc.file_name}</TableCell>
                                <TableCell className="text-sm italic font-serif">{doc.signature_name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 gap-0.5">
                                    <CheckCircle2 className="h-3 w-3" />Signed
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Personal Information</CardTitle>
                      <CardDescription>You can update your name and pronouns. Other fields are managed by administration.</CardDescription>
                    </div>
                    {!editProfile && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={openEditProfile}>
                        <Pencil className="h-3 w-3" />Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {profile ? (
                      editProfile ? (
                        <div className="flex flex-col gap-3 max-w-md">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name</label>
                            <Input value={profileForm.first_name} onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
                            <Input value={profileForm.last_name} onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pronouns</label>
                            <Input value={profileForm.pronouns} onChange={(e) => setProfileForm((f) => ({ ...f, pronouns: e.target.value }))} placeholder="e.g. they/them, she/her, he/him" />
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="gap-1">
                              {savingProfile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditProfile(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: "Name", value: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() },
                            { label: "Pronouns", value: profile.pronouns || "Not set" },
                            { label: "Email", value: profile.email },
                            { label: "Phone", value: profile.phone },
                            { label: "Country", value: profile.country },
                            { label: "City", value: profile.city },
                            { label: "Date of Birth", value: profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : "-" },
                            { label: "Occupation", value: profile.current_occupation },
                            { label: "Languages", value: profile.languages },
                            { label: "Maritime Quals", value: profile.maritime_qualifications },
                            { label: "Department Pref.", value: profile.department_preference },
                            { label: "Available From", value: profile.availability_start_date ? new Date(profile.availability_start_date).toLocaleDateString() : "-" },
                          ].map((item) => (
                            <div key={item.label} className="flex flex-col gap-0.5">
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                              <span className="text-sm">{item.value || "-"}</span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading profile...</div>
                    )}
                  </CardContent>
                </Card>

                {/* Availability Dates */}
                <Card className="mt-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Availability
                      </CardTitle>
                      <CardDescription>Your available dates for deployment. Changes may affect scheduling.</CardDescription>
                    </div>
                    {!editAvail && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={openEditAvail}>
                        <Pencil className="h-3 w-3" />Change
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editAvail ? (
                      <div className="flex flex-col gap-4 max-w-md">
                        <div className="rounded-lg border border-chart-3/30 bg-chart-3/[0.04] p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-chart-3 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-chart-3">Schedule Impact Warning</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Changing your availability dates may cause delays to planned deployments and
                                affect voyage crew assignments. Your scheduling coordinator will be notified
                                of the change and will review the impact on any active or upcoming campaigns.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Available From</label>
                            <Input
                              type="date"
                              value={availStart}
                              onChange={(e) => { setAvailStart(e.target.value); setAvailConfirm(false) }}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Available Until</label>
                            <Input
                              type="date"
                              value={availEnd}
                              onChange={(e) => { setAvailEnd(e.target.value); setAvailConfirm(false) }}
                            />
                          </div>
                        </div>

                        {availConfirm && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-destructive">Are you sure?</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  This will update your availability on record. Your coordinator will be notified
                                  and any affected assignments may need to be rescheduled. Click &quot;Confirm &amp; Save&quot; again to proceed.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveAvail}
                            disabled={savingAvail}
                            variant={availConfirm ? "destructive" : "default"}
                            className="gap-1"
                          >
                            {savingAvail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            {availConfirm ? "Confirm & Save" : "Update Availability"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setEditAvail(false); setAvailConfirm(false) }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">Available From</span>
                          <span className="text-sm font-medium">
                            {profile?.availability_start_date
                              ? new Date(profile.availability_start_date).toLocaleDateString()
                              : "Not set"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">Available Until</span>
                          <span className="text-sm font-medium">
                            {profile?.availability_end_date
                              ? new Date(profile.availability_end_date).toLocaleDateString()
                              : "Not set"}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* E-Sign Dialog -- Professional Signing Modal */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenLine className="h-4 w-4 text-primary" />
              </div>
              Electronic Signature
            </DialogTitle>
            <DialogDescription>
              {signStep === "preview" ? "Review the document before signing." : "Complete your electronic signature below."}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Document Preview */}
          {signStep === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-chart-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{signDocName}</p>
                    {signDocType && <p className="text-xs text-muted-foreground mt-0.5">{signDocType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Please review this document carefully before signing.</p>
                  </div>
                </div>
              </div>

              {/* Embedded document preview */}
              <div className="rounded-lg border overflow-hidden bg-card">
                <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Document Preview</p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" asChild>
                    <a href={`/api/documents/${signDocId}`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" />Open Full Size
                    </a>
                  </Button>
                </div>
                <iframe
                  src={`/api/documents/${signDocId}?inline=true`}
                  className="w-full h-[300px] border-0"
                  title="Document preview"
                />
              </div>

              <DialogFooter className="flex-row justify-between sm:justify-between">
                <Button variant="outline" onClick={() => setSignOpen(false)}>Cancel</Button>
                <Button onClick={() => setSignStep("sign")} className="gap-1">
                  I Have Reviewed This Document
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2: Sign */}
          {signStep === "sign" && (
            <div className="flex flex-col gap-4">
              {/* Document being signed */}
              <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{signDocName}</p>
                  {signDocType && <p className="text-[10px] text-muted-foreground">{signDocType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setSignStep("preview")}>
                  <ChevronLeft className="h-3 w-3 mr-1" />Review
                </Button>
              </div>

              {/* Signature Mode Tabs */}
              <div className="flex rounded-lg border p-1 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setSignMode("typed")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    signMode === "typed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Type Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignMode("drawn")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    signMode === "drawn" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Draw Signature
                </button>
              </div>

              {/* Full Legal Name (required for both modes) */}
              <div>
                <label htmlFor="sign-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Legal Name</label>
                <Input
                  id="sign-name"
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="text-center text-lg font-serif italic h-12"
                  autoComplete="name"
                />
              </div>

              {/* Typed Signature Preview */}
              {signMode === "typed" && signName.trim() && (
                <div className="rounded-lg border-2 border-dashed border-primary/20 bg-card p-6 text-center">
                  <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Signature Preview</p>
                  <p className="text-3xl font-serif italic text-foreground leading-relaxed">{signName}</p>
                  <div className="mt-3 mx-8 border-t border-muted-foreground/20" />
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              )}

              {/* Drawn Signature Pad */}
              {signMode === "drawn" && (
                <SignaturePad
                  onSignatureChange={setSignDrawnData}
                  width={480}
                  height={180}
                />
              )}

              {/* Agreement Checkbox */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sign-agree"
                    checked={signAgreed}
                    onCheckedChange={(checked) => setSignAgreed(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="sign-agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I, <strong className="text-foreground">{signName || "[your name]"}</strong>, confirm that I have reviewed and understand the contents of this document. I agree that my {signMode === "drawn" ? "drawn" : "typed"} signature constitutes a legally binding electronic signature under applicable law, with the same force and effect as a handwritten signature.
                  </label>
                </div>
              </div>

              <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
                <Button variant="outline" onClick={() => setSignStep("preview")}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Back
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={signing || !signName.trim() || !signAgreed || (signMode === "drawn" && !signDrawnData)}
                  className="gap-1"
                >
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  Apply Signature
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
