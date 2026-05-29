"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  CREW_STATUSES, STATUS_LABELS, SKILL_FIELDS, SKILL_LEVELS, DEPARTMENTS,
  type CrewMember, type CrewStatus,
} from "@/lib/db"
import { StatusBadge } from "@/components/status-badge"
import { StarRating } from "@/components/star-rating"
import {
  Search, Filter, ChevronDown, ChevronUp, X, Tag, Loader2, Trash2,
  ArrowUpDown, Users, Plus, Eye,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CrewRow extends CrewMember {
  tags: string[]
}

interface Filters {
  search: string
  status: string
  country: string
  department: string
  gender: string
  ratingMin: string
  ratingMax: string
  criminalRecord: string
  maritimeQuals: string
  skills: string[]
  availFrom: string
  availTo: string
  tags: string[]
}

const defaultFilters: Filters = {
  search: "", status: "", country: "", department: "", gender: "",
  ratingMin: "", ratingMax: "", criminalRecord: "", maritimeQuals: "",
  skills: [], availFrom: "", availTo: "", tags: [],
}

function buildQueryString(filters: Filters, page: number, sortBy: string, sortOrder: string) {
  const p = new URLSearchParams()
  if (filters.search) p.set("search", filters.search)
  if (filters.status) p.set("status", filters.status)
  if (filters.country) p.set("country", filters.country)
  if (filters.department) p.set("department", filters.department)
  if (filters.gender) p.set("gender", filters.gender)
  if (filters.ratingMin) p.set("ratingMin", filters.ratingMin)
  if (filters.ratingMax) p.set("ratingMax", filters.ratingMax)
  if (filters.criminalRecord) p.set("criminalRecord", filters.criminalRecord)
  if (filters.maritimeQuals) p.set("maritimeQuals", filters.maritimeQuals)
  if (filters.skills.length) p.set("skills", filters.skills.join(","))
  if (filters.availFrom) p.set("availFrom", filters.availFrom)
  if (filters.availTo) p.set("availTo", filters.availTo)
  if (filters.tags.length) p.set("tags", filters.tags.join(","))
  p.set("page", String(page))
  p.set("limit", "25")
  p.set("sortBy", sortBy)
  p.set("sortOrder", sortOrder)
  return `/api/crew?${p.toString()}`
}

export function CrewTable() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState("")
  const [tagCrewId, setTagCrewId] = useState<string | null>(null)
  const [skillFilterKey, setSkillFilterKey] = useState("")
  const [skillFilterLevel, setSkillFilterLevel] = useState("")

  const url = buildQueryString(filters, page, sortBy, sortOrder)
  const { data, isLoading, mutate } = useSWR(url, fetcher, { keepPreviousData: true })
  const { data: allTags } = useSWR("/api/tags", fetcher)

  const rows: CrewRow[] = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 }

  const activeFilterCount = [
    filters.status, filters.country, filters.department, filters.gender,
    filters.ratingMin, filters.ratingMax, filters.criminalRecord, filters.maritimeQuals,
    filters.availFrom, filters.availTo,
  ].filter(Boolean).length + filters.skills.length + filters.tags.length

  const setFilter = useCallback((key: keyof Filters, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }))
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    setPage(1)
  }, [])

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    else { setSortBy(col); setSortOrder("asc") }
    setPage(1)
  }

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown className={cn("h-3 w-3", sortBy === col ? "text-foreground" : "text-muted-foreground/40")} />
  )

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/crew/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    setSelected((s) => { const n = new Set(s); n.delete(deleteId); return n })
    toast.success("Crew member deleted")
    mutate()
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/crew/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    mutate()
  }

  const handleRatingChange = async (id: string, rating: number) => {
    await fetch(`/api/crew/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    })
    mutate()
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!selected.size) return
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/crew/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      )
    )
    toast.success(`Updated ${selected.size} crew members`)
    setSelected(new Set())
    mutate()
  }

  const addSkillFilter = () => {
    if (!skillFilterKey) return
    const pair = skillFilterLevel && skillFilterLevel !== "any_level"
      ? `${skillFilterKey}:${skillFilterLevel}` : skillFilterKey
    if (!filters.skills.includes(pair)) {
      setFilters((prev) => ({ ...prev, skills: [...prev.skills, pair] }))
      setPage(1)
    }
    setSkillFilterKey("")
    setSkillFilterLevel("")
  }

  const removeSkillFilter = (skill: string) => {
    setFilters((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))
    setPage(1)
  }

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
    setPage(1)
  }

  const addTag = async (crewId: string, tag: string) => {
    if (!tag.trim()) return
    await fetch(`/api/crew/${crewId}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tag.trim() }),
    })
    setTagInput("")
    setTagCrewId(null)
    mutate()
    globalMutate("/api/tags")
  }

  const removeTag = async (crewId: string, tag: string) => {
    await fetch(`/api/crew/${crewId}/tags`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    })
    mutate()
    globalMutate("/api/tags")
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, city, occupation..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-10"
          />
          {filters.search && (
            <button onClick={() => setFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setFiltersOpen((o) => !o)}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground text-xs gap-1">
            <X className="h-3 w-3" /> Clear all
          </Button>
        )}
      </div>

      {/* Advanced filters panel */}
      {filtersOpen && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-4">
            {/* Row 1: Status, Country, Department, Gender */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any status</SelectItem>
                    {CREW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
                <Input placeholder="e.g. Australia" value={filters.country} onChange={(e) => setFilter("country", e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                <Select value={filters.department || "all"} onValueChange={(v) => setFilter("department", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any dept" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any department</SelectItem>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
                <Select value={filters.gender || "all"} onValueChange={(v) => setFilter("gender", v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Rating, Maritime, Criminal, Availability */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min rating</label>
                <Select value={filters.ratingMin || "any"} onValueChange={(v) => setFilter("ratingMin", v === "any" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+ stars</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Maritime quals</label>
                <Select value={filters.maritimeQuals || "any"} onValueChange={(v) => setFilter("maritimeQuals", v === "any" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="yes">Has qualifications</SelectItem>
                    <SelectItem value="no">No qualifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Available from</label>
                <Input type="date" value={filters.availFrom} onChange={(e) => setFilter("availFrom", e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Available to</label>
                <Input type="date" value={filters.availTo} onChange={(e) => setFilter("availTo", e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Row 3: Multi-Skill Filter Builder */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Skills filter (AND logic -- must have ALL selected skills)</label>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={skillFilterKey} onValueChange={setSkillFilterKey}>
                  <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Select skill..." /></SelectTrigger>
                  <SelectContent>
                    {SKILL_FIELDS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={skillFilterLevel} onValueChange={setSkillFilterLevel}>
                  <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Any level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any_level">Any level</SelectItem>
                    {SKILL_LEVELS.filter(Boolean).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addSkillFilter} disabled={!skillFilterKey} className="h-9 gap-1">
                  <Plus className="h-3 w-3" /> Add skill
                </Button>
              </div>
              {filters.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filters.skills.map((s) => {
                    const [key, level] = s.split(":")
                    const label = SKILL_FIELDS.find((f) => f.key === key)?.label ?? key
                    return (
                      <Badge key={s} variant="secondary" className="gap-1 text-xs">
                        {label}{level ? `: ${level}` : " (any)"}
                        <button onClick={() => removeSkillFilter(s)}><X className="h-3 w-3" /></button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Row 4: Tags */}
            {allTags && allTags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (AND logic -- must have ALL selected tags)</label>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((t: { tag: string; count: string }) => (
                    <Badge
                      key={t.tag}
                      variant={filters.tags.includes(t.tag) ? "default" : "outline"}
                      className="cursor-pointer text-xs gap-1"
                      onClick={() => toggleTag(t.tag)}
                    >
                      <Tag className="h-3 w-3" />{t.tag} ({t.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-2 flex items-center gap-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select onValueChange={(v) => handleBulkStatusChange(v)}>
              <SelectTrigger className="h-8 w-52"><SelectValue placeholder="Bulk change status..." /></SelectTrigger>
              <SelectContent>
                {CREW_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="gap-1">
              <X className="h-3 w-3" /> Deselect all
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {pagination.total} crew member{pagination.total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No crew members found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeFilterCount > 0 || filters.search ? "Try adjusting your filters" : "Upload a CSV to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(c) => {
                        if (c) setSelected(new Set(rows.map((r) => r.id)))
                        else setSelected(new Set())
                      }}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("first_name")}>
                    <span className="flex items-center gap-1 text-xs">Name <SortIcon col="first_name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("email")}>
                    <span className="flex items-center gap-1 text-xs">Email <SortIcon col="email" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <span className="flex items-center gap-1 text-xs">Status <SortIcon col="status" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("rating")}>
                    <span className="flex items-center gap-1 text-xs">Rating <SortIcon col="rating" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("country")}>
                    <span className="flex items-center gap-1 text-xs">Country <SortIcon col="country" /></span>
                  </TableHead>
                  <TableHead className="text-xs">Tags</TableHead>
                  <TableHead className="text-xs">Skills</TableHead>
                  <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleSort("availability_start_date")}>
                    <span className="flex items-center gap-1">Avail. <SortIcon col="availability_start_date" /></span>
                  </TableHead>
                  <TableHead className="w-20 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((crew) => {
                  const skillCount = SKILL_FIELDS.filter((s) => crew[s.key as keyof typeof crew]).length
                  return (
                    <TableRow key={crew.id} className={cn("group", selected.has(crew.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(crew.id)}
                          onCheckedChange={(c) => {
                            setSelected((s) => {
                              const n = new Set(s)
                              c ? n.add(crew.id) : n.delete(crew.id)
                              return n
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/crew/${crew.id}`} className="font-medium text-sm hover:underline">
                          {crew.first_name} {crew.last_name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{crew.department_preference || "No dept"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{crew.email}</TableCell>
                      <TableCell>
                        <Select value={crew.status} onValueChange={(v) => handleStatusChange(crew.id, v)}>
                          <SelectTrigger className="h-7 w-auto border-none bg-transparent p-0 shadow-none">
                            <StatusBadge status={crew.status as CrewStatus} />
                          </SelectTrigger>
                          <SelectContent>
                            {CREW_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StarRating rating={crew.rating} onChange={(r) => handleRatingChange(crew.id, r)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{crew.country || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-36">
                          {(crew.tags ?? []).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                              {t}
                              <button onClick={() => removeTag(crew.id, t)}><X className="h-2.5 w-2.5" /></button>
                            </Badge>
                          ))}
                          {tagCrewId === crew.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); addTag(crew.id, tagInput) }} className="flex gap-1">
                              <Input
                                autoFocus
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onBlur={() => { if (!tagInput) setTagCrewId(null) }}
                                className="h-5 w-16 text-[10px] px-1"
                                placeholder="tag..."
                              />
                            </form>
                          ) : (
                            <button onClick={() => { setTagCrewId(crew.id); setTagInput("") }} className="opacity-0 group-hover:opacity-100">
                              <Plus className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{skillCount} skill{skillCount !== 1 ? "s" : ""}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{crew.availability_start_date || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                            <Link href={`/crew/${crew.id}`}><Eye className="h-3.5 w-3.5" /><span className="sr-only">View</span></Link>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(crew.id)}>
                            <Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="h-7">First</Button>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7">Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="h-7">Next</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)} className="h-7">Last</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Crew Member</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this crew member and all related data. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
