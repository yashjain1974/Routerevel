// stores/useRouteStore.ts
// Global state for RouteRevel.
// Added: radiusKm (corridor filter), selectedStopIds (user-picked stops)

import { create }    from "zustand"
import { devtools }  from "zustand/middleware"
import { Stop, UserPreferences } from "@/types"

interface RouteState {
  // ── Selected stop (opens detail sheet) ───────────────────────
  selectedStop:    Stop | null
  setSelectedStop: (stop: Stop | null) => void

  // ── User-picked stops for itinerary ──────────────────────────
  // Stored as Set of placeIds for O(1) lookup
  pickedStopIds:   Set<string>
  togglePickedStop:(placeId: string) => void
  clearPickedStops:() => void

  // ── Radius filter (km from route) ─────────────────────────────
  radiusKm:    number
  setRadiusKm: (r: number) => void

  // ── Sort key ──────────────────────────────────────────────────
  sortBy:    "travel" | "score" | "rating"
  setSortBy: (k: "travel" | "score" | "rating") => void

  // ── Loading / error ───────────────────────────────────────────
  isLoading: boolean
  setLoading:(v: boolean) => void
  error:     string | null
  setError:  (msg: string | null) => void

  // ── User preferences ──────────────────────────────────────────
  preferences:    UserPreferences
  setPreferences: (p: Partial<UserPreferences>) => void

  // ── Reset ─────────────────────────────────────────────────────
  reset: () => void
}

const DEFAULT_PREFS: UserPreferences = {
  categories:  ["temple", "nature", "monument", "viewpoint", "museum", "dam", "food", "other"],
  maxDetourKm: 20,
  minRating:   3.5,
}

export const useRouteStore = create<RouteState>()(
  devtools(
    (set) => ({
      selectedStop:    null,
      pickedStopIds:   new Set(),
      radiusKm:        20,
      sortBy:          "travel",
      isLoading:       false,
      error:           null,
      preferences:     DEFAULT_PREFS,

      setSelectedStop: (stop) =>
        set({ selectedStop: stop }, false, "setSelectedStop"),

      // Toggle a stop in/out of the picked itinerary
      togglePickedStop: (placeId) =>
        set((s) => {
          const next = new Set(s.pickedStopIds)
          next.has(placeId) ? next.delete(placeId) : next.add(placeId)
          return { pickedStopIds: next }
        }, false, "togglePickedStop"),

      clearPickedStops: () =>
        set({ pickedStopIds: new Set() }, false, "clearPickedStops"),

      setRadiusKm: (r) =>
        set({ radiusKm: r }, false, "setRadiusKm"),

      setSortBy: (k) =>
        set({ sortBy: k }, false, "setSortBy"),

      setLoading: (v)   => set({ isLoading: v },   false, "setLoading"),
      setError:   (msg) => set({ error: msg },      false, "setError"),

      setPreferences: (p) =>
        set((s) => ({ preferences: { ...s.preferences, ...p } }), false, "setPreferences"),

      reset: () =>
        set({
          selectedStop:  null,
          pickedStopIds: new Set(),
          isLoading:     false,
          error:         null,
          sortBy:        "travel",
          radiusKm:      20,
        }, false, "reset"),
    }),
    { name: "RouteRevel" }
  )
)