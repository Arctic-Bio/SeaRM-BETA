"use client"

import { use } from "react"
import useSWR from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-badge"
import { StarRating } from "@/components/star-rating"
import { SkillBadge } from "@/components/skill-badge"
import {
  CREW_STATUSES,
  STATUS_LABELS,
  SKILL_FIELDS,
  type CrewStatus,
  type CrewMember,
} from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, Globe, Anchor,
  Loader2, User, Ship, Clock, LogIn, LogOut, Plus, Tag, X,
  FileText, Upload, CheckCircle2, AlertTriangle, Download, Trash2, Shield, PenLine, Check, Eye,
} from "lucide-react"
import { useState } from "react"
import { mutate as globalMutate } from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CrewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/crew/${id}`,
    fetcher
  )
  const [notes, setNotes] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [seaTimeOpen, setSeaTimeOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [tagInput, setTagInput] = useState("")

  // Sea time form
  const [stForm, setStForm] = useState({ voyage_id: "", ship_id: "", role: "", embarked_at: "", disembarked_at: "", days: "", notes: "" })
  // Checkin form
  const [ciForm, setCiForm] = useState({ voyage_id: "", ship_id: "", check_type: "check_in" as "check_in" | "check_out", location: "", notes: "" })

  const { data: docsData, mutate: mutateDocs } = useSWR(`/api/documents?crew_id=${id}`, fetcher)
  const { data: siteSettings } = useSWR("/api/settings", fetcher, { revalidateOnFocus: false })
  const requiredDocTypes: any[] = (() => { try { return siteSettings?.required_documents ? JSON.parse(siteSettings.required_documents) : [] } catch { return [] } })()
  const requiredEsignTypes: any[] = (() => { try { return siteSettings?.required_esign_documents ? JSON.parse(siteSettings.required_esign_documents) : [] } catch { return [] } })()
  const [docUploading, setDocUploading] = useState(false)
  const [docType, setDocType] = useState("passport")
  const [docExpiry, setDocExpiry] = useState("")
  const [docRequiresSig, setDocRequiresSig] = useState(false)
  const [sigPreviewOpen, setSigPreviewOpen] = useState(false)
  const [sigPreviewData, setSigPreviewData] = useState<{ name: string; type: string; image: string | null; docName: string; signedAt: string } | null>(null)
  const [sigPreviewLoading, setSigPreviewLoading] = useState(false)
  const { data: seaTimeData, mutate: mutateSeaTime } = useSWR(`/api/crew/${id}/sea-time`, fetcher)
  const { data: checkinData, mutate: mutateCheckins } = useSWR(`/api/crew/${id}/checkins`, fetcher)
  const { data: tagsData, mutate: mutateTags } = useSWR(`/api/crew/${id}/tags`, fetcher)
  const { data: voyagesData } = useSWR("/api/voyages", fetcher)
  const { data: shipsData } = useSWR("/api/ships", fetcher)

  const member: CrewMember | null = data?.data || null
  const voyageList = Array.isArray(voyagesData) ? voyagesData : voyagesData?.data ?? []
  const shipList = Array.isArray(shipsData) ? shipsData : shipsData?.data ?? []
  const tags: string[] = Array.isArray(tagsData) ? tagsData.map((t: any) => t.tag) : []

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/crew/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Status updated")
      mutate()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleRatingChange = async (rating: number) => {
    try {
      const res = await fetch(`/api/crew/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      })
      if (!res.ok) throw new Error("Update failed")
      mutate()
    } catch {
      toast.error("Failed to update rating")
    }
  }

  const handleSaveNotes = async () => {
    if (notes === null) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/crew/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast.success("Notes saved")
      mutate()
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("crew_id", id)
    fd.append("document_type", docType)
    if (docExpiry) fd.append("expiry_date", docExpiry)
    fd.append("uploaded_by", "admin")
    if (docRequiresSig) fd.append("requires_signature", "true")
    const res = await fetch("/api/documents", { method: "POST", body: fd })
    setDocUploading(false)
    if (res.ok) { toast.success("Document uploaded"); mutateDocs(); setDocRequiresSig(false) }
    else { const err = await res.json(); toast.error(err.error || "Upload failed") }
    e.target.value = ""
  }

  const handleVerifyDoc = async (docId: string) => {
    await fetch(`/api/documents/${docId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: true, verified_by: "admin" }),
    })
    toast.success("Document verified")
    mutateDocs()
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to permanently delete this document? This cannot be undone.")) return
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" })
    if (res.ok) { toast.success("Document permanently deleted"); mutateDocs() }
    else toast.error("Failed to delete document")
  }

  const viewSignature = async (docId: string, docName: string, signedAt: string) => {
    setSigPreviewLoading(true)
    setSigPreviewOpen(true)
    try {
      const res = await fetch(`/api/documents/${docId}/signature`)
      if (res.ok) {
        const data = await res.json()
        setSigPreviewData({ name: data.signature_name, type: data.signature_type, image: data.signature_image, docName, signedAt })
      } else {
        setSigPreviewData(null)
      }
    } catch {
      setSigPreviewData(null)
    }
    setSigPreviewLoading(false)
  }

  const handleAddSeaTime = async () => {
    const days = stForm.days ? parseInt(stForm.days) : (stForm.embarked_at && stForm.disembarked_at
      ? Math.ceil((new Date(stForm.disembarked_at).getTime() - new Date(stForm.embarked_at).getTime()) / 86400000) : 0)
    await fetch(`/api/crew/${id}/sea-time`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...stForm, days }),
    })
    toast.success("Sea time recorded")
    setSeaTimeOpen(false)
    setStForm({ voyage_id: "", ship_id: "", role: "", embarked_at: "", disembarked_at: "", days: "", notes: "" })
    mutateSeaTime()
  }

  const handleCheckin = async () => {
    await fetch(`/api/crew/${id}/checkins`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ciForm),
    })
    toast.success(ciForm.check_type === "check_in" ? "Checked in" : "Checked out")
    setCheckinOpen(false)
    setCiForm({ voyage_id: "", ship_id: "", check_type: "check_in", location: "", notes: "" })
    mutateCheckins()
  }

  const addTag = async (tag: string) => {
    if (!tag.trim()) return
    await fetch(`/api/crew/${id}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tag.trim() }),
    })
    setTagInput("")
    mutateTags()
    globalMutate("/api/tags")
  }

  const removeTag = async (tag: string) => {
    await fetch(`/api/crew/${id}/tags`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    })
    mutateTags()
    globalMutate("/api/tags")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Crew member not found</p>
        <Button variant="outline" asChild>
          <Link href="/crew">Back to Crew</Link>
        </Button>
      </div>
    )
  }

  const appData = member.application_data || {}

  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
  }) =>
    value ? (
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm text-foreground">{value}</p>
        </div>
      </div>
    ) : null

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crew">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {member.first_name} {member.last_name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <StatusBadge status={member.status as CrewStatus} />
                  <StarRating rating={member.rating} onChange={handleRatingChange} size="md" />
                  {checkinData?.currentStatus && (
                    <Badge variant={checkinData.currentStatus === "check_in" ? "default" : "outline"} className="text-[10px] gap-1">
                      {checkinData.currentStatus === "check_in" ? <><LogIn className="h-3 w-3" /> On Board</> : <><LogOut className="h-3 w-3" /> Ashore</>}
                    </Badge>
                  )}
                  {seaTimeData?.totalDays > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1"><Ship className="h-3 w-3" />{seaTimeData.totalDays} days at sea</Badge>
                  )}
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] gap-0.5">
                      <Tag className="h-2.5 w-2.5" />{t}
                      <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  ))}
                  <form onSubmit={(e) => { e.preventDefault(); addTag(tagInput) }} className="inline-flex">
                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="+ tag" className="h-5 w-16 text-[10px] px-1" />
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Select value={member.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREW_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList className="w-auto self-start">
          <TabsTrigger value="profile">Profile & Skills</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="sea-time">Sea Time</TabsTrigger>
          <TabsTrigger value="checkins">Check-in/out</TabsTrigger>
          <TabsTrigger value="application">Full Profile</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Personal Info */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InfoItem icon={Mail} label="Email" value={member.email} />
                <InfoItem icon={Phone} label="Phone" value={member.phone} />
                <InfoItem
                  icon={MapPin}
                  label="Location"
                  value={
                    [member.city, member.country].filter(Boolean).join(", ") ||
                    ""
                  }
                />
                <InfoItem
                  icon={Calendar}
                  label="Date of Birth"
                  value={member.date_of_birth}
                />
                <InfoItem
                  icon={User}
                  label="Gender"
                  value={member.gender}
                />
                <InfoItem
                  icon={Briefcase}
                  label="Current Occupation"
                  value={member.current_occupation}
                />
                <InfoItem
                  icon={Globe}
                  label="Languages"
                  value={member.languages}
                />
              </CardContent>
            </Card>

            {/* Maritime & Availability */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">
                  Maritime & Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InfoItem
                  icon={Anchor}
                  label="Maritime Qualifications"
                  value={member.maritime_qualifications}
                />
                <InfoItem
                  icon={Calendar}
                  label="Availability Start"
                  value={member.availability_start_date}
                />
                <InfoItem
                  icon={Calendar}
                  label="Duration"
                  value={member.duration}
                />
                <InfoItem
                  icon={Briefcase}
                  label="Department Preference"
                  value={member.department_preference}
                />
                {member.has_criminal_record && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    Has criminal record - review application details
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Skills & Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SKILL_FIELDS.map((sf) => {
                    const level =
                      member[sf.key as keyof CrewMember] as string
                    return (
                      <SkillBadge
                        key={sf.key}
                        label={sf.label}
                        level={level}
                      />
                    )
                  })}
                  {SKILL_FIELDS.every(
                    (sf) =>
                      !(member[sf.key as keyof CrewMember] as string)
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      No skills data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Motivation */}
          {appData[
            "Why would you like to join SeaRM"
          ] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Motivation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">
                  {
                    appData[
                      "Why would you like to join SeaRM"
                    ]
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Skills Description */}
          {appData["Describe your Skills and Experience"] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Skills Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">
                  {appData["Describe your Skills and Experience"]}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Readiness Tab */}
        <TabsContent value="readiness" className="flex flex-col gap-4">
          {/* Onboarding Stage Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Onboarding Stage</CardTitle>
              <CardDescription>
                Current pipeline stage and readiness overview for {member.first_name} {member.last_name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const docsArr = Array.isArray(docsData) ? docsData : []
                const fulfilledDocTypes = new Set(docsArr.map((d: any) => d.document_type))
                const esignDocsMap = docsArr.filter((d: any) => d.requires_signature)
                const stages = [
                  {
                    key: "application",
                    label: "Profile Created",
                    completed: true,
                  },
                  {
                    key: "screening",
                    label: "Screening",
                    completed: ["screening", "interview", "verified", "volunteer", "active", "standby"].includes(member.status),
                  },
                  {
                    key: "interview",
                    label: "Interview",
                    completed: ["interview", "verified", "volunteer", "active", "standby"].includes(member.status),
                  },
                  {
                    key: "verified",
                    label: "Verified",
                    completed: ["verified", "volunteer", "active", "standby"].includes(member.status),
                  },
                  {
                    key: "documents",
                    label: "Documents Submitted",
                    completed: requiredDocTypes.length > 0 && requiredDocTypes.every((rd: any) => fulfilledDocTypes.has(rd.type)),
                    detail: `${requiredDocTypes.filter((rd: any) => fulfilledDocTypes.has(rd.type)).length}/${requiredDocTypes.length}`,
                  },
                  {
                    key: "esign",
                    label: "E-Signatures Complete",
                    completed: requiredEsignTypes.length > 0 && requiredEsignTypes.every((rd: any) => esignDocsMap.some((d: any) => d.document_type === rd.type && d.signed_by)),
                    detail: `${requiredEsignTypes.filter((rd: any) => esignDocsMap.some((d: any) => d.document_type === rd.type && d.signed_by)).length}/${requiredEsignTypes.length}`,
                  },
                  {
                    key: "active",
                    label: "Active & Ready",
                    completed: ["active", "standby"].includes(member.status),
                  },
                ]
                return (
                  <div className="flex flex-col gap-0">
                    {stages.map((stage, i) => {
                      const isLast = i === stages.length - 1
                      const isCurrent = !stage.completed && (i === 0 || stages[i - 1]?.completed)
                      return (
                        <div key={stage.key} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                              stage.completed
                                ? "bg-success/15 border-success text-success"
                                : isCurrent
                                ? "bg-primary/15 border-primary text-primary"
                                : "bg-muted border-border text-muted-foreground"
                            }`}>
                              {stage.completed ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-medium">{i + 1}</span>}
                            </div>
                            {!isLast && <div className={`w-0.5 flex-1 min-h-6 ${stage.completed ? "bg-success/30" : "bg-border"}`} />}
                          </div>
                          <div className={`pb-4 flex-1 ${isLast ? "pb-0" : ""}`}>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${stage.completed ? "text-success" : isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                                {stage.label}
                              </p>
                              {stage.completed && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Done</Badge>}
                              {isCurrent && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Current</Badge>}
                              {"detail" in stage && stage.detail && (
                                <span className="text-[10px] text-muted-foreground">{stage.detail}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Required Documents Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Required Documents
                  </CardTitle>
                  <CardDescription>Status of required document uploads.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {requiredDocTypes.filter((rd: any) => Array.isArray(docsData) && docsData.some((d: any) => d.document_type === rd.type)).length}/{requiredDocTypes.length} submitted
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {requiredDocTypes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg">No required documents configured. Add them in Settings.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {requiredDocTypes.map((rd: any) => {
                    const matchingDoc = Array.isArray(docsData) ? docsData.find((d: any) => d.document_type === rd.type) : null
                    const isVerified = matchingDoc?.verified
                    const isExpired = matchingDoc?.expiry_date && new Date(matchingDoc.expiry_date) < new Date()
                    return (
                      <div key={rd.type} className={`flex items-center gap-3 p-3 rounded-lg border ${
                        matchingDoc ? (isVerified ? "bg-success/[0.03] border-success/20" : "bg-muted/30") : "bg-destructive/[0.03] border-destructive/20"
                      }`}>
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          matchingDoc ? (isVerified ? "bg-success/15 text-success" : "bg-primary/10 text-primary") : "bg-destructive/10 text-destructive"
                        }`}>
                          {matchingDoc ? (isVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />) : <AlertTriangle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rd.label}</p>
                          {rd.description && <p className="text-xs text-muted-foreground mt-0.5">{rd.description}</p>}
                        </div>
                        <div className="shrink-0">
                          {isExpired && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 mr-1">Expired</Badge>}
                          {matchingDoc ? (
                            isVerified ? (
                              <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20">Awaiting Review</Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">Missing</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required E-Signature Documents Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-chart-4" />
                    Required E-Signature Documents
                  </CardTitle>
                  <CardDescription>Status of required e-signature documents. Upload documents with &quot;E-Sign&quot; checked in the Documents tab.</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {requiredEsignTypes.filter((rd: any) => Array.isArray(docsData) && docsData.some((d: any) => d.document_type === rd.type && d.requires_signature && d.signed_by)).length}/{requiredEsignTypes.length} signed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {requiredEsignTypes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg">No required e-signature documents configured. Add them in Settings.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {requiredEsignTypes.map((rd: any) => {
                    const matchingDoc = Array.isArray(docsData) ? docsData.find((d: any) => d.document_type === rd.type && d.requires_signature) : null
                    const isSigned = !!matchingDoc?.signed_by
                    return (
                      <div key={rd.type} className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isSigned ? "bg-success/[0.03] border-success/20"
                        : matchingDoc ? "bg-chart-3/[0.03] border-chart-3/20"
                        : "bg-muted/30 border-border"
                      }`}>
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          isSigned ? "bg-success/15 text-success"
                          : matchingDoc ? "bg-chart-3/10 text-chart-3"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {isSigned ? <CheckCircle2 className="h-3.5 w-3.5" /> : matchingDoc ? <PenLine className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rd.label}</p>
                          {rd.description && <p className="text-xs text-muted-foreground mt-0.5">{rd.description}</p>}
                          {isSigned && matchingDoc && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Signed as <span className="italic font-serif">{matchingDoc.signature_name}</span>
                              {matchingDoc.signed_at && ` on ${new Date(matchingDoc.signed_at).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSigned ? (
                            <>
                              <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" />{matchingDoc?.signature_type === "drawn" ? "Drawn" : "Typed"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1 text-muted-foreground"
                                onClick={() => viewSignature(matchingDoc!.id, matchingDoc!.file_name, matchingDoc?.signed_at || "")}
                              >
                                <Eye className="h-3 w-3" />View
                              </Button>
                            </>
                          ) : matchingDoc ? (
                            <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20 gap-0.5">
                              <PenLine className="h-2.5 w-2.5" />Awaiting Signature
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Not Uploaded</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Documents</CardTitle>
                <CardDescription>{Array.isArray(docsData) ? docsData.length : 0} document(s) on file</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["passport", "stcw", "medical", "visa", "contract", "waiver", "certificate", "id_card", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] text-muted-foreground whitespace-nowrap">Exp. Date:</label>
                  <Input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} className="h-8 w-36 text-xs" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox id="req-sig" checked={docRequiresSig} onCheckedChange={(v) => setDocRequiresSig(!!v)} />
                  <label htmlFor="req-sig" className="text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">E-Sign</label>
                </div>
                <label className="cursor-pointer">
                  <Button size="sm" className="gap-1" asChild disabled={docUploading}>
                    <span>{docUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Upload</span>
                  </Button>
                  <input type="file" className="hidden" onChange={handleDocUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                </label>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!Array.isArray(docsData) || docsData.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Document</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Priority</TableHead>
                      <TableHead className="text-xs">Size</TableHead>
                      <TableHead className="text-xs">Expiry</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">E-Sign</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsData.map((doc: any) => {
                      const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date()
                      const isExpiringSoon = doc.expiry_date && !isExpired && new Date(doc.expiry_date) < new Date(Date.now() + 30 * 86400000)
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-48">{doc.file_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{doc.document_type.replace(/_/g, " ")}</Badge>
                          </TableCell>
                          <TableCell>
                            {requiredDocTypes.some((rd: any) => rd.type === doc.document_type) ? (
                              <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Required</Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Optional</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "-"}</TableCell>
                          <TableCell className="text-xs">
                            {doc.expiry_date ? (
                              <span className={isExpired ? "text-destructive font-medium" : isExpiringSoon ? "text-warning font-medium" : "text-muted-foreground"}>
                                {isExpired && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                                {new Date(doc.expiry_date).toLocaleDateString()}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {doc.verified ? (
                              <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/25 gap-0.5">
                                <CheckCircle2 className="h-3 w-3" />Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/25">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {doc.requires_signature ? (
                              doc.signed_by ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20 gap-0.5 w-fit">
                                      <CheckCircle2 className="h-2.5 w-2.5" />{doc.signature_type === "drawn" ? "Drawn" : "Typed"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-[9px] px-1.5 gap-0.5 text-muted-foreground"
                                      onClick={() => viewSignature(doc.id, doc.file_name, doc.signed_at || "")}
                                    >
                                      <Eye className="h-2.5 w-2.5" />View
                                    </Button>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground italic font-serif">{doc.signature_name}</span>
                                  {doc.signed_at && <span className="text-[9px] text-muted-foreground">{new Date(doc.signed_at).toLocaleDateString()}</span>}
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-chart-3/10 text-chart-3 border-chart-3/20 gap-0.5">
                                  <PenLine className="h-2.5 w-2.5" />Awaiting
                                </Badge>
                              )
                            ) : (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <a href={`/api/documents/${doc.id}`} download><Download className="h-3 w-3" /></a>
                              </Button>
                              {!doc.verified && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleVerifyDoc(doc.id)}>
                                  <Shield className="h-3 w-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDoc(doc.id)}>
                                <Trash2 className="h-3 w-3" />
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

        {/* Sea Time Tab */}
        <TabsContent value="sea-time">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Sea Time Log</CardTitle>
                <CardDescription>Total: {seaTimeData?.totalDays ?? 0} days at sea</CardDescription>
              </div>
              <Button size="sm" onClick={() => setSeaTimeOpen(true)} className="gap-1"><Plus className="h-3 w-3" /> Add Record</Button>
            </CardHeader>
            <CardContent className="p-0">
              {!seaTimeData?.records?.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No sea time records yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Voyage</TableHead>
                      <TableHead className="text-xs">Ship</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Embarked</TableHead>
                      <TableHead className="text-xs">Disembarked</TableHead>
                      <TableHead className="text-xs">Days</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seaTimeData.records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.voyage_name || "-"}</TableCell>
                        <TableCell className="text-sm">{r.ship_name || "-"}</TableCell>
                        <TableCell className="text-sm">{r.role || "-"}</TableCell>
                        <TableCell className="text-xs">{r.embarked_at ? new Date(r.embarked_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-xs">{r.disembarked_at ? new Date(r.disembarked_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-sm font-medium">{r.days}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{r.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-in/out Tab */}
        <TabsContent value="checkins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Check-in / Check-out Log</CardTitle>
                <CardDescription>
                  Current status: {checkinData?.currentStatus === "check_in" ? "On Board" : checkinData?.currentStatus === "check_out" ? "Ashore" : "No records"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setCiForm((f) => ({ ...f, check_type: "check_in" })); setCheckinOpen(true) }} className="gap-1">
                  <LogIn className="h-3 w-3" /> Check In
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setCiForm((f) => ({ ...f, check_type: "check_out" })); setCheckinOpen(true) }} className="gap-1">
                  <LogOut className="h-3 w-3" /> Check Out
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!checkinData?.records?.length ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No check-in/out records yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Date/Time</TableHead>
                      <TableHead className="text-xs">Voyage</TableHead>
                      <TableHead className="text-xs">Ship</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkinData.records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant={r.check_type === "check_in" ? "default" : "outline"} className="text-[10px] gap-1">
                            {r.check_type === "check_in" ? <><LogIn className="h-3 w-3" /> Check In</> : <><LogOut className="h-3 w-3" /> Check Out</>}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{new Date(r.checked_at).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{r.voyage_name || "-"}</TableCell>
                        <TableCell className="text-sm">{r.ship_name || "-"}</TableCell>
                        <TableCell className="text-sm">{r.location || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{r.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Application Tab */}
        <TabsContent value="application">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Complete Application Data
              </CardTitle>
              <CardDescription>
                All fields from the original CSV submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(appData)
                  .filter(([, value]) => value && value.trim())
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col gap-1 rounded-lg border p-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {key}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Internal Notes</CardTitle>
              <CardDescription>
                Add private notes about this crew member. Only visible to
                coordinators.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                placeholder="Add notes about this crew member - interview observations, follow-ups, special considerations..."
                value={notes ?? member.notes ?? ""}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="resize-y"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === null}
                  size="sm"
                >
                  {savingNotes ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Sea Time Dialog */}
      <Dialog open={seaTimeOpen} onOpenChange={setSeaTimeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sea Time Record</DialogTitle>
            <DialogDescription>Log days at sea for this crew member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Voyage</label>
                <Select value={stForm.voyage_id} onValueChange={(v) => setStForm((f) => ({ ...f, voyage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select voyage..." /></SelectTrigger>
                  <SelectContent>
                    {voyageList.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ship</label>
                <Select value={stForm.ship_id} onValueChange={(v) => setStForm((f) => ({ ...f, ship_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select ship..." /></SelectTrigger>
                  <SelectContent>
                    {shipList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Input value={stForm.role} onChange={(e) => setStForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Deckhand" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Embarked</label>
                <Input type="date" value={stForm.embarked_at} onChange={(e) => setStForm((f) => ({ ...f, embarked_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Disembarked</label>
                <Input type="date" value={stForm.disembarked_at} onChange={(e) => setStForm((f) => ({ ...f, disembarked_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Days (or auto)</label>
                <Input type="number" value={stForm.days} onChange={(e) => setStForm((f) => ({ ...f, days: e.target.value }))} placeholder="Auto" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={stForm.notes} onChange={(e) => setStForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeaTimeOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSeaTime}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in/out Dialog */}
      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ciForm.check_type === "check_in" ? "Check In" : "Check Out"}</DialogTitle>
            <DialogDescription>Record crew member {ciForm.check_type === "check_in" ? "boarding" : "departing"} the vessel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Voyage</label>
                <Select value={ciForm.voyage_id} onValueChange={(v) => setCiForm((f) => ({ ...f, voyage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select voyage..." /></SelectTrigger>
                  <SelectContent>
                    {voyageList.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.voyage_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ship</label>
                <Select value={ciForm.ship_id} onValueChange={(v) => setCiForm((f) => ({ ...f, ship_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select ship..." /></SelectTrigger>
                  <SelectContent>
                    {shipList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
              <Input value={ciForm.location} onChange={(e) => setCiForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Port of Amsterdam" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input value={ciForm.notes} onChange={(e) => setCiForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckin}>{ciForm.check_type === "check_in" ? "Check In" : "Check Out"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Preview Dialog */}
      <Dialog open={sigPreviewOpen} onOpenChange={setSigPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <PenLine className="h-4 w-4 text-success" />
              </div>
              Signature Details
            </DialogTitle>
            <DialogDescription>
              Viewing electronic signature for this document.
            </DialogDescription>
          </DialogHeader>
          {sigPreviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sigPreviewData ? (
            <div className="flex flex-col gap-4">
              {/* Document info */}
              <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sigPreviewData.docName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Signed on {sigPreviewData.signedAt ? new Date(sigPreviewData.signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Signature display */}
              <div className="rounded-lg border-2 border-dashed border-primary/15 bg-card p-6">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-center mb-3">
                  {sigPreviewData.type === "drawn" ? "Drawn Signature" : "Typed Signature"}
                </p>
                {sigPreviewData.type === "drawn" && sigPreviewData.image ? (
                  <div className="flex justify-center">
                    <img src={sigPreviewData.image} alt="Drawn signature" className="max-w-full max-h-32 object-contain" />
                  </div>
                ) : (
                  <p className="text-3xl font-serif italic text-foreground text-center leading-relaxed">{sigPreviewData.name}</p>
                )}
                <div className="mt-4 mx-8 border-t border-muted-foreground/20" />
                <p className="text-xs text-center text-muted-foreground mt-2 font-medium">{sigPreviewData.name}</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/20 p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Signature Type</p>
                  <p className="text-sm font-medium capitalize">{sigPreviewData.type}</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Legal Name</p>
                  <p className="text-sm font-medium">{sigPreviewData.name}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No signature data found for this document.</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
