"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const { login, register, user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFirstUser, setIsFirstUser] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", name: "" })

  useEffect(() => {
    fetch("/api/auth/first-check").then((r) => r.json()).then((d) => setIsFirstUser(d.isFirst)).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      router.push(user.role === "crew" ? "/portal" : "/")
      router.refresh()
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (isFirstUser) {
      if (!form.name.trim()) { setError("Name is required for initial setup"); setLoading(false); return }
      const result = await register(form.email, form.password, form.name)
      setLoading(false)
      if (result.error) { setError(result.error); return }
      router.push("/")
      return
    }

    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.user?.role === "crew") {
      router.push("/portal")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.04] via-background to-background pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Card className="border-border/60 shadow-xl shadow-primary/[0.03]">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto mb-4 h-32 w-32 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10">
              <img src="/logo.png" alt="SeaRM" className="h-21 w-21 opacity-90" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-balance">{"SeaRM"}</CardTitle>
            <CardDescription className="text-sm">
              {isFirstUser ? "Create your administrator account to get started" : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {isFirstUser && (
                <div>
                  <label htmlFor="name" className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                  <Input id="name" placeholder="Enter your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
                </div>
              )}
              <div>
                <label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block">Email Address</label>
                <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required autoComplete="email" />
              </div>
              <div>
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                <Input id="password" type="password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-2 h-10">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isFirstUser ? "Create Administrator Account" : "Sign In"}
              </Button>
            </form>
            {isFirstUser && (
              <div className="flex items-center gap-2 mt-5 p-3 rounded-lg bg-primary/[0.04] border border-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will create the system administrator account with full access to all features.
                </p>
              </div>
            )}
            {!isFirstUser && (
              <p className="text-xs text-muted-foreground text-center mt-5">
                Need an account? Contact your system administrator.
              </p>
            )}
          </CardContent>
        </Card>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-4">
          {"SeaRM Crew Management System"}
        </p>
      </div>
    </div>
  )
}
