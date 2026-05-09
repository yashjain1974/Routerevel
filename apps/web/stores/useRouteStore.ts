// stores/useRouteStore.ts
// Global state manager using Zustand.
// Avoids prop-drilling across plan page, stop list, and map components.
// All route/trip state lives here — components just subscribe to slices they need.

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { Route, Stop, UserPreferences } from "@/types"

interface RouteState {
  // ── Current planned route ─────────────────────────────────────
  route: Route | null
  setRoute: (route: Route | null) => void

  // ── Selected stop (opens detail sheet) ───────────────────────
  selectedStop: Stop | null
  setSelectedStop: (stop: Stop | null) => void

  // ── Loading / error state ─────────────────────────────────────
  isLoading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (msg: string | null) => void

  // ── User preferences (affects AI ranking weights) ─────────────
  preferences: UserPreferences
  setPreferences: (prefs: Partial<UserPreferences>) => void

  // ── Sort key for stops list ───────────────────────────────────
  sortBy: "score" | "detour" | "rating"
  setSortBy: (key: "score" | "detour" | "rating") => void

  // ── Reset everything (called when user starts a new route) ────
  reset: () => void
}

const DEFAULT_PREFS: UserPreferences = {
  categories: ["temple", "nature", "monument", "viewpoint", "museum", "dam", "food", "other"],
  maxDetourKm: 20,
  minRating: 3.5,
}

export const useRouteStore = create<RouteState>()(
  // devtools middleware gives you Redux DevTools in the browser — remove in prod if desired
  devtools(
    (set) => ({
      route:        null,
      selectedStop: null,
      isLoading:    false,
      error:        null,
      preferences:  DEFAULT_PREFS,
      sortBy:       "score",

      setRoute:       (route)   => set({ route }, false, "setRoute"),
      setSelectedStop:(stop)    => set({ selectedStop: stop }, false, "setSelectedStop"),
      setLoading:     (v)       => set({ isLoading: v }, false, "setLoading"),
      setError:       (msg)     => set({ error: msg }, false, "setError"),
      setSortBy:      (key)     => set({ sortBy: key }, false, "setSortBy"),

      setPreferences: (prefs) =>
        set((s) => ({ preferences: { ...s.preferences, ...prefs } }), false, "setPreferences"),

      reset: () =>
        set({ route: null, selectedStop: null, isLoading: false, error: null, sortBy: "score" }, false, "reset"),
    }),
    { name: "RouteRevel" } // name shown in Redux DevTools
  )
)