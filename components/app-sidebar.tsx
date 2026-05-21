"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Upload, Users, ChevronLeft, ChevronRight,
  Ship, Navigation, CheckSquare, Kanban, Briefcase, Map, Download,
  AlertTriangle, ClipboardList, Calendar, Shield, LogOut, Settings,
  Wrench, BookOpen, Mail, Puzzle, Plug,
} from "lucide-react"
import { useState, useCallback } from "react"
import useSWR from "swr"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, settingsKey: "page_dashboard" },
      { href: "/pipeline", label: "Pipeline", icon: Kanban, settingsKey: "page_pipeline" },
    ],
  },
  {
    label: "Crew",
    items: [
      { href: "/crew", label: "Applications", icon: Users, settingsKey: "page_crew" },
      { href: "/positions", label: "Positions", icon: Briefcase, settingsKey: "page_crew" },
      { href: "/upload", label: "Upload CSV", icon: Upload, settingsKey: "page_crew" },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, settingsKey: "page_tasks" },
    ],
  },
  {
    label: "Fleet & Campaigns",
    items: [
      { href: "/ships", label: "Ships", icon: Ship, settingsKey: "page_ships" },
      { href: "/voyages", label: "Campaigns", icon: Map, settingsKey: "page_voyages" },
      { href: "/availability", label: "Crew Calendar", icon: Calendar, settingsKey: "page_availability" },
    ],
  },
    {
    label: "Operations",
    items: [
      { href: "/onboarding", label: "Onboarding", icon: ClipboardList, settingsKey: "page_onboarding" },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle, settingsKey: "page_incidents" },
      { href: "/tools", label: "Custom Tools", icon: Wrench, settingsKey: "page_tools" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/users", label: "Users & Roles", icon: Shield, settingsKey: "page_users", sysadminOnly: true },
      { href: "/email", label: "Email Automation", icon: Mail, settingsKey: null, sysadminOnly: true },
      { href: "/integrations", label: "Widget Builder", icon: Plug, settingsKey: null, sysadminOnly: true },
      { href: "/extensions", label: "Extensions", icon: Puzzle, settingsKey: null, sysadminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings, settingsKey: null, sysadminOnly: true },
      { href: "/export", label: "Export Data", icon: Download, settingsKey: "page_export" },
      { href: "/how-to", label: "How to Use", icon: BookOpen, settingsKey: null },
    ],
  },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const sfetcher = (url: string) => fetch(url).then((r) => r.json())
  const { data: siteSettings } = useSWR("/api/settings", sfetcher, { revalidateOnFocus: false })

  const isPageEnabled = (key: string | null) => {
    if (!key) return true // null key = always visible (e.g. Settings)
    if (user?.role === "sysadmin") return true // sysadmin sees everything
    if (!siteSettings) return true // loading, show all
    return siteSettings[key] !== "false"
  }

  const handleLogout = useCallback(async () => {
    await logout()
    router.push("/login")
  }, [logout, router])

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 select-none",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex items-center border-b border-sidebar-border px-4 h-14 shrink-0">
          <div className="h-12 w-12 rounded-lg bg-sidebar-primary/15 flex items-center justify-center shrink-0">
            <img src="/logo-sidebar.png" alt="SeaRM" className="h-8.75 w-8.75 opacity-90" />
          </div>
          {!collapsed && (
            <div className="ml-3 flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground leading-tight">
                {"SeaRM"}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-widest text-sidebar-foreground/35">
                Crew Management
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3 gap-1">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if ("sysadminOnly" in item && item.sysadminOnly && user?.role !== "sysadmin") return false
              return isPageEnabled("settingsKey" in item ? item.settingsKey as string | null : null)
            })
            if (visibleItems.length === 0) return null
            return (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/30">
                  {section.label}
                </p>
              )}
              {collapsed && <div className="mx-3 mb-1.5 h-px bg-sidebar-border/50" />}
              <ul className="flex flex-col gap-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href))
                  const Icon = item.icon

                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary shadow-sm shadow-sidebar-primary/5"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                      {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
                    </Link>
                  )

                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8} className="font-medium">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : linkContent}
                    </li>
                  )
                })}
              </ul>
            </div>
            )
          })}
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-sidebar-border p-2 flex flex-col gap-1 shrink-0">
          {user && !collapsed && (
            <div className="px-2 py-2 flex items-center justify-between rounded-lg hover:bg-sidebar-accent/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-sidebar-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-sidebar-primary">
                    {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-sidebar-foreground truncate leading-tight">{user.name}</span>
                  <span className="text-[10px] text-sidebar-foreground/40 capitalize leading-tight">{user.role === "sysadmin" ? "Administrator" : user.role}</span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          )}
          {user && collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sign Out ({user.name})</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className="w-full justify-center text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>{collapsed ? "Expand" : "Collapse"} sidebar</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
