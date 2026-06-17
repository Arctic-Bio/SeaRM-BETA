import { NextRequest, NextResponse } from "next/server"

// Returns the canonical, publicly-reachable base URL of THIS deployment, derived
// from the incoming request headers. This makes generated webhook URLs correct
// for any org/domain/proxy the app is deployed under — never hardcoded to the
// v0 preview or this test VM.
//
// Resolution order:
//   1. NEXT_PUBLIC_APP_URL / APP_URL env override (explicit, wins if set)
//   2. x-forwarded-host + x-forwarded-proto (set by Vercel/most proxies)
//   3. host header
export async function GET(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envUrl) {
    return NextResponse.json({ baseUrl: envUrl.replace(/\/+$/, ""), source: "env" })
  }

  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = forwardedHost || req.headers.get("host") || ""
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https")

  if (!host) {
    return NextResponse.json({ baseUrl: "", source: "unknown" }, { status: 200 })
  }

  return NextResponse.json({ baseUrl: `${proto}://${host}`, source: forwardedHost ? "forwarded" : "host" })
}
