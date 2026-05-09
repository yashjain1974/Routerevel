"use client"
// components/stops/StopsList.tsx
// Optimizations applied:
// 1. useMemo for sorted list — only re-sorts when stops or sortBy changes
// 2. useCallback for onClick handler — stable reference prevents StopCard re-renders
// 3. Zustand store for selectedStop — avoids prop drilling
// 4. AnimatePresence on StopDetail — smooth enter/exit without conditional rendering hacks

import { useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, SlidersHorizontal, SearchX } from "lucide-react"
import { StopCard } from "./StopCard"
import { StopDetail } from "./StopDetail"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useRouteStore } from "@/stores/useRouteStore"
import { Stop, StopCategory } from "@/types"
import styles from "./StopsList.module.css"

// ── Mock data ─────────────────────────────────────────────────────
// Replace this array with a real API call in useRoute.ts once backend is ready.
// Shape matches the Stop interface in types/index.ts exactly.
const MOCK_STOPS: Stop[] = [
  {
    id: "1",
    name: "Lepakshi Temple",
    description: "Ancient Vijayanagara-era temple famous for the hanging pillar and giant Nandi statue.",
    lat: 13.8030, lng: 77.6090,
    rating: 4.6, totalRatings: 8420,
    detourKm: 1.2, detourMinutes: 4,
    visitDurationMinutes: 60,
    category: "temple" as StopCategory,
    openNow: true,
    openingHours: ["Monday: 6:00 AM – 6:00 PM", "Tuesday: 6:00 AM – 6:00 PM", "Wednesday: 6:00 AM – 6:00 PM"],
    photos: [],
    aiScore: 92,
    aiSummary: "One of the finest examples of Vijayanagara architecture. The hanging pillar defies gravity — a must-see marvel. Visit early morning to avoid crowds.",
    placeId: "lepakshi_001",
  },
  {
    id: "2",
    name: "Kolar Gold Fields Viewpoint",
    description: "Historic gold mining region with stunning views over the Mysore Plateau.",
    lat: 13.0689, lng: 78.2647,
    rating: 4.2, totalRatings: 1840,
    detourKm: 4.5, detourMinutes: 12,
    visitDurationMinutes: 30,
    category: "viewpoint" as StopCategory,
    openNow: true,
    openingHours: ["Open 24 hours"],
    photos: [],
    aiScore: 74,
    aiSummary: "Fascinating industrial heritage site. The deep shafts and old machinery tell the story of India's gold rush era. Great for photography.",
    placeId: "kgf_001",
  },
  {
    id: "3",
    name: "Skandagiri Hills",
    description: "A popular trekking destination offering panoramic views of the surrounding landscape.",
    lat: 13.5850, lng: 77.6730,
    rating: 4.4, totalRatings: 12300,
    detourKm: 8.2, detourMinutes: 18,
    visitDurationMinutes: 120,
    category: "nature" as StopCategory,
    openNow: true,
    openingHours: ["Monday: 5:00 AM – 5:00 PM", "Tuesday: 5:00 AM – 5:00 PM"],
    photos: [],
    aiScore: 81,
    aiSummary: "Stunning sunrise trek popular with Bengaluru locals. A brief detour to the base camp offers beautiful valley views even without trekking.",
    placeId: "skandagiri_001",
  },
  {
    id: "4",
    name: "Pavagada Fort",
    description: "16th century fort perched on a rocky hill with sweeping views.",
    lat: 14.1000, lng: 77.2700,
    rating: 3.9, totalRatings: 620,
    detourKm: 12.4, detourMinutes: 22,
    visitDurationMinutes: 45,
    category: "monument" as StopCategory,
    openNow: false,
    openingHours: ["Monday: 9:00 AM – 5:00 PM", "Tuesday: 9:00 AM – 5:00 PM"],
    photos: [],
    aiScore: 61,
    aiSummary: "Off-the-beaten-path fort with interesting history. Currently closed for renovation but the exterior and views are worth the short stop.",
    placeId: "pavagada_001",
  },
  {
    id: "5",
    name: "Madhugiri Betta",
    description: "Asia's second largest monolith — a massive granite dome rising from the plains.",
    lat: 13.6624, lng: 77.2046,
    rating: 4.5, totalRatings: 5670,
    detourKm: 18.3, detourMinutes: 28,
    visitDurationMinutes: 90,
    category: "nature" as StopCategory,
    openNow: true,
    openingHours: ["Monday: 6:00 AM – 6:00 PM", "Tuesday: 6:00 AM – 6:00 PM"],
    photos: [],
    aiScore: 88,
    aiSummary: "Asia's second largest monolith. The climb rewards you with 360° views of the Deccan Plateau. Worth the detour if you have 2+ hours.",
    placeId: "madhugiri_001",
  },
]

const SORT_OPTIONS = [
  { key: "score",  label: "AI Score" },
  { key: "detour", label: "Nearest"  },
  { key: "rating", label: "Rating"   },
] as const

type SortKey = typeof SORT_OPTIONS[number]["key"]

interface StopsListProps {
  from: string
  to:   string
}

export function StopsList({ from, to }: StopsListProps) {
  // Pull only the slices we need from the store — avoids re-render on unrelated state changes
  const selectedStop  = useRouteStore((s) => s.selectedStop)
  const setSelected   = useRouteStore((s) => s.setSelectedStop)
  const sortBy        = useRouteStore((s) => s.sortBy)
  const setSortBy     = useRouteStore((s) => s.setSortBy)
  const isLoading     = useRouteStore((s) => s.isLoading)

  // Memoized sort — only recalculates when stops array or sortBy key changes
  const sorted = useMemo<Stop[]>(() => {
    const stops = MOCK_STOPS // TODO: replace with route.stops from store once API connected
    return [...stops].sort((a, b) => {
      if (sortBy === "score")  return b.aiScore  - a.aiScore
      if (sortBy === "detour") return a.detourKm - b.detourKm
      if (sortBy === "rating") return b.rating   - a.rating
      return 0
    })
  }, [sortBy])

  // Stable callback reference — prevents all StopCards from re-rendering on parent state changes
  const handleCardClick = useCallback((stop: Stop) => setSelected(stop), [setSelected])

  // Stable close handler
  const handleClose = useCallback(() => setSelected(null), [setSelected])

  if (isLoading) return <LoadingSpinner message="AI is scanning your route corridor..." />

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        <SearchX size={40} style={{ opacity: 0.4 }} />
        <p className={styles.emptyTitle}>No stops found</p>
        <p className={styles.emptyDesc}>
          Try adjusting your route or increasing the detour radius in preferences.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>

      {/* Sort bar */}
      <motion.div
        className={styles.sortBar}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.count}>
          <MapPin size={14} style={{ color: "#F39C12" }} />
          {sorted.length} stops found
        </div>

        <div className={styles.sortGroup}>
          <SlidersHorizontal size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.sortBtn} ${sortBy === key ? styles.sortBtnActive : ""}`}
              onClick={() => setSortBy(key as SortKey)}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stop cards — layout prop animates reordering when sort changes */}
      <motion.div layout>
        {sorted.map((stop, i) => (
          <StopCard
            key={stop.id}   // stable key = no remount on sort
            stop={stop}
            index={i}
            onClick={handleCardClick}
          />
        ))}
      </motion.div>

      {/* Mock data notice — remove once real API is wired */}
      <motion.div
        className={styles.hint}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        Sample stops for Hyderabad → Bangalore.{" "}
        Connect the backend to get real AI-ranked stops for{" "}
        <span className={styles.hintHighlight}>{from} → {to}</span>.
      </motion.div>

      {/* Detail sheet — AnimatePresence handles mount/unmount animation */}
      <AnimatePresence>
        {selectedStop && (
          <StopDetail
            key="stop-detail"
            stop={selectedStop}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

    </div>
  )
}