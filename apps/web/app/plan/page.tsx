// app/plan/page.tsx
// Server component wrapper — keeps metadata on server side for better SEO.
// PlanContent is the client component that uses useSearchParams().

import { Suspense } from "react"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PlanContent } from "./PlanContent"

export const metadata = {
  title: "Route Stops | RouteRevel",
  description: "AI-ranked stops along your travel route",
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Planning your route..." />}>
      <PlanContent />
    </Suspense>
  )
}