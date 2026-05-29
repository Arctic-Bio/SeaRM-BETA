import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { AuthProvider } from "@/components/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "SeaRM",
    template: "%s | SeaRM",
  },
  description: "Crew management and operations platform for SeaRM maritime volunteer organization. Manage crew members, deployments, vessels, and campaigns.",
  keywords: ["crew management", "maritime operations", "volunteer management", "ship management", "SeaRM"],
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1f35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">
        <AuthProvider>
          <DashboardShell>{children}</DashboardShell>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            className: "font-sans",
            duration: 4000,
          }}
        />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
