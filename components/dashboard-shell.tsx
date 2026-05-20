"use client"

import { useAuth } from "@/components/auth-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { useRouter, usePathname } from "next/navigation"
import { Anchor, Loader2 } from "lucide-react"
import { useEffect, type ReactNode } from "react"

const PUBLIC_PATHS = ["/login"]
const CREW_PATHS = ["/portal"]

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      router.push("/login")
    }
    if (user && pathname === "/login") {
      router.push(user.role === "crew" ? "/portal" : "/")
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Anchor className="h-6 w-6 text-primary" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">{"SeaRM"}</p>
          <p className="text-xs text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  // Public pages (login) -- no sidebar
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>
  }

  // Crew portal -- different layout
  if (CREW_PATHS.some((p) => pathname.startsWith(p))) {
    if (!user) return null
    return <>{children}</>
  }

  // Admin / coordinator area -- sidebar layout
  if (!user || (user.role === "crew")) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
