"use client"
// app/plan/PlanContent.tsx
// Uses useRouteStream so map draws route polyline immediately,
// then pins appear one by one as AI scores each stop.

import { useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MapPin, Navigation, Map as MapIcon, List } from "lucide-react"
import Link from "next/link"
import { StopsList } from "@/components/stops/StopsList"
import { RouteMap } from "@/components/map/RouteMap"
import { useRouteStream } from "@/hooks/useRouteStream"
import { useRouteStore } from "@/stores/useRouteStore"
import styles from "./plan.module.css"

export function PlanContent() {
  const params = useSearchParams()
  const from = params.get("from") || ""
  const to = params.get("to") || ""

  // Stream hook — map gets route + stops as they arrive
  const { stops, route } = useRouteStream(from, to)

  const radiusKm = useRouteStore((s) => s.radiusKm)
  const sortBy = useRouteStore((s) => s.sortBy)

  // Build rank map matching the list order in StopsList
  const sortedStops = useMemo(() => {
    const filtered = stops.filter((s) => s.detourKm <= radiusKm)
    return [...filtered].sort((a, b) => {
      if (sortBy === "score") return b.aiScore - a.aiScore
      if (sortBy === "rating") return b.rating - a.rating
      return a.detourKm - b.detourKm
    })
  }, [stops, radiusKm, sortBy])

  const rankMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedStops.forEach((stop, i) => map.set(stop.placeId, i + 1))
    return map
  }, [sortedStops])

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
              Tap a pin or card to add to your journey
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
                stops={sortedStops}
                rankMap={rankMap}
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