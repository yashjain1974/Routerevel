"use client"
// app/plan/PlanContent.tsx
// Builds rankMap from the sorted stops so map pins match list numbers.
// rankMap = Map<placeId, displayRank> — passed to RouteMap.

import { useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MapPin, Navigation, Map as MapIcon, List } from "lucide-react"
import Link from "next/link"
import { StopsList } from "@/components/stops/StopsList"
import { RouteMap } from "@/components/map/RouteMap"
import { useRoute } from "@/hooks/useRoute"
import { useRouteStore } from "@/stores/useRouteStore"
import styles from "./plan.module.css"

export function PlanContent() {
  const params = useSearchParams()
  const from = params.get("from") || ""
  const to = params.get("to") || ""

  const { stops, route, isLoading } = useRoute(from, to)

  // Get current sort + radius from store to compute same order as list
  const radiusKm = useRouteStore((s) => s.radiusKm)
  const sortBy = useRouteStore((s) => s.sortBy)

  // Build the same sorted+filtered list that StopsList shows
  // so map pin numbers always match list numbers
  const sortedStops = useMemo(() => {
    const filtered = stops.filter((s) => s.detourKm <= radiusKm)
    return [...filtered].sort((a, b) => {
      if (sortBy === "score") return b.aiScore - a.aiScore
      if (sortBy === "rating") return b.rating - a.rating
      return a.detourKm - b.detourKm  // travel order
    })
  }, [stops, radiusKm, sortBy])

  // rankMap: placeId → 1-based display number
  // This is what both the map pins AND list cards use
  const rankMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedStops.forEach((stop, i) => map.set(stop.placeId, i + 1))
    return map
  }, [sortedStops])

  // Mobile map toggle
  const [mapVisible, setMapVisible] = useState(true)
  const toggleMap = useCallback(() => setMapVisible((v) => !v), [])

  const sourceLat = route?.sourceLat ?? 17.3850
  const sourceLng = route?.sourceLng ?? 78.4867
  const destLat = route?.destLat ?? 12.9716
  const destLng = route?.destLng ?? 77.5946

  return (
    <main className={styles.page}>

      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.titleRow}>
          <Link href="/" className={styles.backBtn} aria-label="Back">
            <ArrowLeft size={17} />
          </Link>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Route Stops</h1>
            <p className={styles.pageSubtitle}>
              {isLoading
                ? "AI scanning your route corridor..."
                : "Tap a pin or card to add to your journey"
              }
            </p>
          </div>
        </div>

        <div className={styles.routePill}>
          <div className={styles.routeEndpoint}>
            <div className={styles.dotGreen} />
            <span className={styles.routeCity}>{from || "Source"}</span>
          </div>
          <Navigation size={14} className={styles.arrowIcon} />
          <div className={styles.routeEndpointRight}>
            <span className={styles.routeCity}>{to || "Destination"}</span>
            <MapPin size={14} className={styles.pinIcon} />
          </div>
        </div>

        <div className={styles.mapToggleRow}>
          <button className={styles.mapToggleBtn} onClick={toggleMap}>
            {mapVisible
              ? <><List size={13} /> Show stops</>
              : <><MapIcon size={13} /> Show map</>
            }
          </button>
        </div>
      </motion.header>

      <div className={styles.body}>

        <AnimatePresence initial={false}>
          {mapVisible && (
            <motion.div
              className={styles.mapPanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <RouteMap
                stops={sortedStops}       // same order as list
                rankMap={rankMap}          // pin numbers = list numbers
                encodedPolyline={route?.polyline}
                sourceLat={sourceLat}
                sourceLng={sourceLng}
                destLat={destLat}
                destLng={destLng}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.stopsPanel}>
          <StopsList from={from} to={to} />
        </div>

      </div>
    </main>
  )
}