"use client"
// app/plan/PlanContent.tsx
// Fixed layout:
// - Desktop: header (fixed) + [map 58% | stops 42%] side by side, both fill viewport
// - Mobile: header + map (320px) + scrollable stops list stacked

import { useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MapPin, Navigation, Map as MapIcon, List } from "lucide-react"
import Link from "next/link"
import { StopsList } from "@/components/stops/StopsList"
import { RouteMap } from "@/components/map/RouteMap"
import { Stop, StopCategory } from "@/types"
import styles from "./plan.module.css"

// Hyd → Blr corridor coordinates
const SOURCE = { lat: 17.3850, lng: 78.4867 }
const DEST   = { lat: 12.9716, lng: 77.5946 }

const MAP_STOPS: Stop[] = [
  { id: "1", name: "Lepakshi Temple",          lat: 13.8030, lng: 77.6090, aiScore: 92, detourKm: 1.2,  detourMinutes: 4,  visitDurationMinutes: 60,  rating: 4.6, totalRatings: 8420,  category: "temple"    as StopCategory, openNow: true,  openingHours: [], photos: [], description: "", aiSummary: "", placeId: "" },
  { id: "2", name: "Kolar Gold Fields",         lat: 13.0689, lng: 78.2647, aiScore: 74, detourKm: 4.5,  detourMinutes: 12, visitDurationMinutes: 30,  rating: 4.2, totalRatings: 1840,  category: "viewpoint" as StopCategory, openNow: true,  openingHours: [], photos: [], description: "", aiSummary: "", placeId: "" },
  { id: "3", name: "Skandagiri Hills",          lat: 13.5850, lng: 77.6730, aiScore: 81, detourKm: 8.2,  detourMinutes: 18, visitDurationMinutes: 120, rating: 4.4, totalRatings: 12300, category: "nature"    as StopCategory, openNow: true,  openingHours: [], photos: [], description: "", aiSummary: "", placeId: "" },
  { id: "4", name: "Pavagada Fort",             lat: 14.1000, lng: 77.2700, aiScore: 61, detourKm: 12.4, detourMinutes: 22, visitDurationMinutes: 45,  rating: 3.9, totalRatings: 620,   category: "monument"  as StopCategory, openNow: false, openingHours: [], photos: [], description: "", aiSummary: "", placeId: "" },
  { id: "5", name: "Madhugiri Betta",           lat: 13.6624, lng: 77.2046, aiScore: 88, detourKm: 18.3, detourMinutes: 28, visitDurationMinutes: 90,  rating: 4.5, totalRatings: 5670,  category: "nature"    as StopCategory, openNow: true,  openingHours: [], photos: [], description: "", aiSummary: "", placeId: "" },
]

export function PlanContent() {
  const params  = useSearchParams()
  const from    = params.get("from") || "Hyderabad"
  const to      = params.get("to")   || "Bangalore"

  // Mobile — toggle map visibility
  const [mapVisible, setMapVisible] = useState(true)
  const toggleMap = useCallback(() => setMapVisible((v) => !v), [])

  return (
    <main className={styles.page}>

      {/* ── Header ── */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back + title */}
        <div className={styles.titleRow}>
          <Link href="/" className={styles.backBtn} aria-label="Back to home">
            <ArrowLeft size={17} />
          </Link>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Route Stops</h1>
            <p className={styles.pageSubtitle}>AI-ranked places along your journey</p>
          </div>
        </div>

        {/* Route pill */}
        <div className={styles.routePill}>
          <div className={styles.routeEndpoint}>
            <div className={styles.dotGreen} />
            <span className={styles.routeCity}>{from}</span>
          </div>
          <Navigation size={14} className={styles.arrowIcon} />
          <div className={styles.routeEndpointRight}>
            <span className={styles.routeCity}>{to}</span>
            <MapPin size={14} className={styles.pinIcon} />
          </div>
        </div>

        {/* Mobile map toggle */}
        <div className={styles.mapToggleRow}>
          <button className={styles.mapToggleBtn} onClick={toggleMap}>
            {mapVisible
              ? <><List size={13} /> Show stops list</>
              : <><MapIcon size={13} /> Show map</>
            }
          </button>
        </div>
      </motion.header>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* Map panel */}
        <AnimatePresence initial={false}>
          {mapVisible && (
            <motion.div
              className={styles.mapPanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <RouteMap
                stops={MAP_STOPS}
                sourceLat={SOURCE.lat}
                sourceLng={SOURCE.lng}
                destLat={DEST.lat}
                destLng={DEST.lng}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stops list */}
        <div className={styles.stopsPanel}>
          <StopsList from={from} to={to} />
        </div>

      </div>
    </main>
  )
}