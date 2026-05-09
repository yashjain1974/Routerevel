// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "RouteRevel — Discover places between your journey",
    template: "%s | RouteRevel",
  },
  description:
    "AI-powered travel companion that discovers amazing stops along your route. Every road has a story. We tell it.",
  keywords: ["travel", "road trip", "India travel", "route planner", "stops"],
  authors: [{ name: "RouteRevel" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon.png",
  },
  openGraph: {
    title: "RouteRevel",
    description: "Discover amazing places between your journey",
    type: "website",
    locale: "en_IN",
  },
}

export const viewport: Viewport = {
  themeColor: "#1B4F72",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
            },
          }}
        />
      </body>
    </html>
  )
}