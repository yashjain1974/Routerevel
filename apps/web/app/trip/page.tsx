"use client"
// app/trip/page.tsx
// Active trip screen — shown while user is traveling.
// Features:
// - Full-screen Google Maps with live location dot
// - Bottom sheet showing next recommended stop + upcoming list
// - Live green "Tracking" pill in header
// - End Trip button
//
// TODO: Connect real geolocation via useGeofence hook (Phase 2 — mobile)
// For now uses mock location and mock stops.

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MapPin, Navigation, Clock, Star, ExternalLink } from "lucide-react"
import Link from "next/link"
import { RouteMap } from "@/components/map/RouteMap"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { formatDistance, formatDuration, directionsUrl } from "@/lib/utils"
import { Stop, StopCategory } from "@/types"
import styles from "./trip.module.css"

// Mock stops — same as plan page
// Replace with Zustand store data once plan → trip navigation passes route data
const TRIP_STOPS: Stop[] = [
  { id: "1", name: "Lepakshi Temple", lat: 13.8030, lng: 77.6090, aiScore: 92, detourKm: 1.2, detourMinutes: 4, visitDurationMinutes: 60, rating: 4.6, totalRatings: 8420, category: "temple" as StopCategory, openNow: true, openingHours: ["Monday: 6:00 AM – 6:00 PM"], photos: [], description: "", aiSummary: "One of the finest examples of Vijayanagara architecture. Must visit.", placeId: "" },
  { id: "2", name: "Kolar Gold Fields", lat: 13.0689, lng: 78.2647, aiScore: 74, detourKm: 4.5, detourMinutes: 12, visitDurationMinutes: 30, rating: 4.2, totalRatings: 1840, category: "viewpoint" as StopCategory, openNow: true, openingHours: ["Open 24 hours"], photos: [], description: "", aiSummary: "Fascinating industrial heritage site.", placeId: "" },
  { id: "3", name: "Skandagiri Hills", lat: 13.5850, lng: 77.6730, aiScore: 81, detourKm: 8.2, detourMinutes: 18, visitDurationMinutes: 120, rating: 4.4, totalRatings: 12300, category: "nature" as StopCategory, openNow: true, openingHours: ["Monday: 5:00 AM – 5:00 PM"], photos: [], description: "", aiSummary: "Stunning sunrise trek popular with Bengaluru locals.", placeId: "" },
  { id: "4", name: "Madhugiri Betta", lat: 13.6624, lng: 77.2046, aiScore: 88, detourKm: 18.3, detourMinutes: 28, visitDurationMinutes: 90, rating: 4.5, totalRatings: 5670, category: "nature" as StopCategory, openNow: true, openingHours: ["Monday: 6:00 AM – 6:00 PM"], photos: [], description: "", aiSummary: "Asia's second largest monolith.", placeId: "" },
]

function TripContent() {
  const params = useSearchParams()
  const router = useRouter()
  const from = params.get("from") || "Hyderabad"
  const to = params.get("to") || "Bangalore"

  // Track which stops have been "passed" — in real app this uses geofencing
  const [passedIds, setPassedIds] = useState<string[]>([])
  const [sheetOpen, setSheetOpen] = useState(true)
  const [elapsed, setElapsed] = useState(0)  // seconds since trip started

  // Remaining stops (not yet passed)
  const remaining = TRIP_STOPS.filter((s) => !passedIds.includes(s.id ?? ""))
  const nextStop = remaining[0] || null

  // Mock elapsed timer — shows how long trip has been active
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  // Mark next stop as passed (simulate arriving)
  const handleSkipStop = useCallback(() => {
    if (nextStop) setPassedIds((ids) => [...ids, nextStop.placeId])
  }, [nextStop])

  const handleEndTrip = useCallback(() => {
    if (confirm("End your trip? You can plan a new route from the home screen.")) {
      router.push("/")
    }
  }, [router])

  return (
    <main className={styles.page}>

      {/* Full-screen map */}
      <div className={styles.mapFull}>
        <RouteMap
          stops={remaining}
          sourceLat={17.3850}
          sourceLng={78.4867}
          destLat={12.9716}
          destLng={77.5946}
        />
      </div>

      {/* Floating header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href={`/plan?from=${from}&to=${to}`} className={styles.backBtn} aria-label="Back to plan">
            <ArrowLeft size={16} />
          </Link>

          {/* Live status + elapsed time */}
          <div className={styles.livePill}>
            <div className={styles.liveDot} />
            <span className={styles.liveText}>Live · {formatElapsed(elapsed)}</span>
          </div>

          {/* Stops remaining */}
          <div style={{
            padding: "6px 12px",
            borderRadius: "9999px",
            background: "rgba(13,33,55,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.78rem",
          }}>
            {remaining.length} stop{remaining.length !== 1 ? "s" : ""} ahead
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <motion.div
        className={styles.bottomSheet}
        initial={{ y: "60%" }}
        animate={{ y: sheetOpen ? 0 : "60%" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {/* Handle — tap to toggle sheet */}
        <div
          className={styles.sheetHandle}
          onClick={() => setSheetOpen((v) => !v)}
        />

        <div className={styles.sheetHeader}>
          <p className={styles.sheetTitle}>Your route</p>
          <span className={styles.nearbyCount}>
            {from} → {to}
          </span>
        </div>

        {/* Next stop highlight */}
        {nextStop ? (
          <div className={styles.nextStop}>
            <p className={styles.nextStopLabel}>Next stop</p>
            <p className={styles.nextStopName}>{nextStop.name}</p>
            <div className={styles.nextStopRow}>
              <span className={styles.nextStopStat}>
                <Star size={12} style={{ color: "#F39C12", fill: "#F39C12" }} />
                {nextStop.rating.toFixed(1)}
              </span>
              <span className={styles.nextStopStat}>
                <Navigation size={11} />
                {formatDistance(nextStop.detourKm)} detour
              </span>
              <span className={styles.nextStopStat}>
                <Clock size={11} />
                {formatDuration(nextStop.visitDurationMinutes)}
              </span>
            </div>
            <a
              href={directionsUrl(nextStop.lat, nextStop.lng, nextStop.name)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.nextStopBtn}
            >
              <MapPin size={15} />
              Get Directions
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
            {/* Skip this stop */}
            <button
              onClick={handleSkipStop}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "8px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.35)",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Skip this stop →
            </button>
          </div>
        ) : (
          <div style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
            <p style={{ color: "#2dce89", fontWeight: 600, margin: 0 }}>
              🎉 All stops completed!
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginTop: "4px" }}>
              You have covered all recommended stops on this route.
            </p>
          </div>
        )}

        {/* Upcoming stops */}
        {remaining.length > 1 && (
          <div className={styles.upcomingList}>
            <p className={styles.upcomingTitle}>Upcoming</p>
            {remaining.slice(1).map((stop, i) => (
              <div key={stop.id} className={styles.upcomingItem}>
                <div className={styles.upcomingRank}>{i + 2}</div>
                <span className={styles.upcomingName}>{stop.name}</span>
                <span className={styles.upcomingDist}>
                  {formatDistance(stop.detourKm)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* End trip */}
        <button className={styles.endTripBtn} onClick={handleEndTrip}>
          End Trip
        </button>
      </motion.div>

    </main>
  )
}

export default function TripPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading trip..." />}>
      <TripContent />
    </Suspense>
  )
}