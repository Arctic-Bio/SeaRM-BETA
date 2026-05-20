"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import useSWR from "swr"

export type UserRole = "sysadmin" | "captain" | "hr" | "crew"
export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  crew_id: string | null
}

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string; user?: AuthUser }>
  register: (email: string, password: string, name: string) => Promise<{ error?: string; user?: AuthUser }>
  logout: () => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: async () => ({}), register: async () => ({}), logout: async () => {}, refresh: () => {},
})

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR("/api/auth/session", fetcher, {
    revalidateOnFocus: false, shouldRetryOnError: false,
  })
  const user = data?.user ?? null

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error }
    mutate({ user: json.user })
    return { user: json.user }
  }, [mutate])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error }
    mutate({ user: json.user })
    return { user: json.user }
  }, [mutate])

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    mutate({ user: null })
  }, [mutate])

  return (
    <AuthContext.Provider value={{ user, loading: isLoading, login, register, logout, refresh: () => mutate() }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
