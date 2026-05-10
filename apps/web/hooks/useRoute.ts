// hooks/useRoute.ts
// Custom hook that fetches AI-ranked stops from the backend.
// Uses SWR for automatic caching, revalidation, and error handling.
// SWR caches results in memory — same route won't re-fetch within the session.

import useSWR from "swr"
import axios  from "axios"
import { Stop, Route } from "@/types"

// ── Types matching backend response ──────────────────────────────
export interface PlanRouteResponse {
  route: {
    polyline:        string
    distanceKm:      number
    durationMinutes: number
    sourceLat:       number
    sourceLng:       number
    destLat:         number
    destLng:         number
    sourceAddress:   string
    destAddress:     string
  }
  stops:     Stop[]
  fromCache: boolean
  meta?: {
    totalFound: number
    returned:   number
    routeKm:    number
    routeMin:   number
  }
  message?: string  // shown when no stops found
}

// ── API fetcher ───────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

async function planRoute(from: string, to: string): Promise<PlanRouteResponse> {
  const res = await axios.post(`${API_URL}/api/plan-route`, {
    from,
    to,
    maxDetourKm: 20,
    minRating:   3.5,
  }, {
    timeout: 90000, // 90s — first call is slow (Places API + AI scoring)
  })
  return res.data
}

// ── Hook ──────────────────────────────────────────────────────────
// Returns stops, route data, loading state, and error.
// Key includes from+to so different routes are cached separately.
export function useRoute(from: string, to: string) {
  // Only fetch when both from and to are provided and non-empty
  const shouldFetch = from.trim().length > 1 && to.trim().length > 1

  const { data, error, isLoading, mutate } = useSWR<PlanRouteResponse>(
    shouldFetch ? `plan-route:${from.toLowerCase()}:${to.toLowerCase()}` : null,
    () => planRoute(from, to),
    {
      revalidateOnFocus:      false, // don't refetch when tab regains focus
      revalidateOnReconnect:  false, // don't refetch on network reconnect
      shouldRetryOnError:     false, // don't retry — show error to user
      dedupingInterval:       60000, // dedupe same key within 1 minute
    }
  )

  return {
    stops:      data?.stops     ?? [],
    route:      data?.route     ?? null,
    fromCache:  data?.fromCache ?? false,
    meta:       data?.meta      ?? null,
    message:    data?.message   ?? null,
    isLoading,
    error:      error?.response?.data?.error || error?.message || null,
    refetch:    mutate,
  }
}