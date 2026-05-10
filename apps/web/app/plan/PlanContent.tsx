"use client"
// app/plan/PlanContent.tsx
// Passes real encoded polyline to RouteMap so it draws the actual road.
// Map + stops stay in sync via shared Zustand store.

import { useState, useCallback } from "react"
import { useSearchParams }       from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, MapPin, Navigation, Map as MapIcon, List } from "lucide-react"
import Link      from "next/link"
import { StopsList } from "@/components/stops/StopsList"
import { RouteMap  } from "@/components/map/RouteMap"
import { useRoute  } from "@/hooks/useRoute"
import { useRouteStore } from "@/stores/useRouteStore"
import styles from "./plan.module.css"

export function PlanContent() {
  const params = useSearchParams()
  const from   = params.get("from") || ""
  const to     = params.get("to")   || ""

  // Real route data from backend
  const { stops, route, isLoading } = useRoute(from, to)

  // Radius from store — used to filter stops shown on map
  const radiusKm = useRouteStore((s) => s.radiusKm)

  // Filter stops for map by current radius
  const mapStops = stops.filter((s) => s.detourKm <= radiusKm)

  // Mobile map toggle
  const [mapVisible, setMapVisible] = useState(true)
  const toggleMap = useCallback(() => setMapVisible((v) => !v), [])

  // Fallback coords while route loads
  const sourceLat = route?.sourceLat ?? 17.3850
  const sourceLng = route?.sourceLng ?? 78.4867
  const destLat   = route?.destLat   ?? 12.9716
  const destLng   = route?.destLng   ?? 77.5946

  return (
    <main className={styles.page}>

      {/* ── Header ── */}
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
                ? "AI is scanning your route corridor..."
                : "Select stops to add to your journey"
              }
            </p>
          </div>
        </div>

        {/* Route pill */}
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

        {/* Mobile toggle */}
        <div className={styles.mapToggleRow}>
          <button className={styles.mapToggleBtn} onClick={toggleMap}>
            {mapVisible
              ? <><List size={13} /> Show stops</>
              : <><MapIcon size={13} /> Show map</>
            }
          </button>
        </div>
      </motion.header>

      {/* ── Body ── */}
      <div className={styles.body}>

        {/* Map panel — shows real road polyline */}
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
                stops={mapStops}
                encodedPolyline={route?.polyline}
                sourceLat={sourceLat}
                sourceLng={sourceLng}
                destLat={destLat}
                destLng={destLng}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stops panel */}
        <div className={styles.stopsPanel}>
          <StopsList from={from} to={to} />
        </div>

      </div>
    </main>
  )
}