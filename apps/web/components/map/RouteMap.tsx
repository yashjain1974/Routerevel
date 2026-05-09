"use client"
// components/map/RouteMap.tsx
// Key fixes:
// 1. Map container is position:relative with explicit w/h 100%
// 2. fitBounds called with padding so route fills the map properly
// 3. Dark colorScheme matches app theme
// 4. Pins animate in with stagger
// 5. Popup card appears above the map on pin click

import { useState, useCallback, useEffect, memo } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps"
import { motion, AnimatePresence } from "framer-motion"
import { X, Navigation, Clock, Star, MapPin } from "lucide-react"
import { Stop } from "@/types"
import { formatDistance, formatDuration, directionsUrl } from "@/lib/utils"
import styles from "./RouteMap.module.css"

// ── Route polyline component ──────────────────────────────────────
// Draws the amber route line and fits the map bounds to show the full route.
interface PolylineProps {
  sourceLat: number
  sourceLng: number
  destLat:   number
  destLng:   number
  stops:     Stop[]
}

function RouteLine({ sourceLat, sourceLng, destLat, destLng, stops }: PolylineProps) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const g = (window as any).google?.maps
    if (!g) return

    // Draw straight line source → dest
    // Replace with encoded polyline from Directions API when backend is ready
    const path = [
      { lat: sourceLat, lng: sourceLng },
      ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      { lat: destLat,   lng: destLng   },
    ]

    const polyline = new g.Polyline({
      path,
      strokeColor:   "#F39C12",
      strokeWeight:  3,
      strokeOpacity: 0.7,
      // Dashed line style
      icons: [{
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
        offset: "0",
        repeat: "12px",
      }],
      map,
    })

    // Fit map so full route is visible with nice padding
    const bounds = new g.LatLngBounds()
    path.forEach((p) => bounds.extend(p))
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))

    // Small timeout ensures map is fully initialised before fitting
    setTimeout(() => {
      map.fitBounds(bounds, {
        top:    80,
        bottom: 80,
        left:   60,
        right:  60,
      })
    }, 100)

    return () => polyline.setMap(null)
  }, [map, sourceLat, sourceLng, destLat, destLng, stops])

  return null
}

// ── Custom stop pin SVG ───────────────────────────────────────────
function StopPin({ rank, isFirst }: { rank: number; isFirst: boolean }) {
  return (
    <div style={{
      position:        "relative",
      width:           "36px",
      height:          "36px",
      borderRadius:    "50% 50% 50% 0",
      transform:       "rotate(-45deg)",
      background:      isFirst
        ? "linear-gradient(135deg, #F39C12, #E67E22)"
        : "linear-gradient(135deg, #1B4F72, #164260)",
      border:          `2px solid ${isFirst ? "#F7CE58" : "rgba(255,255,255,0.5)"}`,
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      cursor:          "pointer",
      boxShadow:       isFirst
        ? "0 3px 12px rgba(243,156,18,0.5)"
        : "0 3px 10px rgba(0,0,0,0.4)",
    }}>
      <span style={{
        transform:  "rotate(45deg)",
        color:      "#ffffff",
        fontSize:   "0.75rem",
        fontWeight: 800,
        lineHeight: 1,
      }}>
        {rank}
      </span>
    </div>
  )
}

// ── Source / Destination pin ──────────────────────────────────────
function EndpointPin({ type }: { type: "source" | "dest" }) {
  const isSource = type === "source"
  return (
    <div style={{
      width:        "14px",
      height:       "14px",
      borderRadius: "50%",
      background:   isSource ? "#2DCE89" : "#EF4444",
      border:       `3px solid ${isSource ? "#1aad72" : "#dc2626"}`,
      boxShadow:    `0 0 0 4px ${isSource ? "rgba(45,206,137,0.2)" : "rgba(239,68,68,0.2)"}`,
    }} />
  )
}

// ── Main map component ────────────────────────────────────────────
interface RouteMapProps {
  stops:     Stop[]
  sourceLat: number
  sourceLng: number
  destLat:   number
  destLng:   number
}

function RouteMapComponent({ stops, sourceLat, sourceLng, destLat, destLng }: RouteMapProps) {
  const [activeStop, setActiveStop] = useState<Stop | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

  const handlePin  = useCallback((stop: Stop) => setActiveStop(stop), [])
  const handleClose = useCallback(() => setActiveStop(null), [])

  // Centre between source and dest as default
  const centre = {
    lat: (sourceLat + destLat) / 2,
    lng: (sourceLng + destLng) / 2,
  }

  return (
    <div className={styles.wrapper}>
      <APIProvider apiKey={apiKey} libraries={["geometry"]}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={centre}
          defaultZoom={8}
          mapId="routerevel-dark"
          colorScheme="DARK"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          scaleControl={false}
        >
          {/* Dashed route line + auto-fit bounds */}
          <RouteLine
            sourceLat={sourceLat}
            sourceLng={sourceLng}
            destLat={destLat}
            destLng={destLng}
            stops={stops}
          />

          {/* Source marker */}
          <AdvancedMarker position={{ lat: sourceLat, lng: sourceLng }} title="Start">
            <EndpointPin type="source" />
          </AdvancedMarker>

          {/* Destination marker */}
          <AdvancedMarker position={{ lat: destLat, lng: destLng }} title="End">
            <EndpointPin type="dest" />
          </AdvancedMarker>

          {/* Stop markers — stagger animation */}
          {stops.map((stop, i) => (
            <AdvancedMarker
              key={stop.id}
              position={{ lat: stop.lat, lng: stop.lng }}
              onClick={() => handlePin(stop)}
              title={stop.name}
            >
              <motion.div
                initial={{ scale: 0, y: -8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{
                  delay:     0.15 + i * 0.08,
                  type:      "spring",
                  stiffness: 220,
                  damping:   16,
                }}
              >
                <StopPin rank={i + 1} isFirst={i === 0} />
              </motion.div>
            </AdvancedMarker>
          ))}
        </Map>

        {/* Stop preview popup */}
        <AnimatePresence>
          {activeStop && (
            <div className={styles.popup} key="popup">
              <button className={styles.popupClose} onClick={handleClose} aria-label="Close">
                <X size={13} />
              </button>
              <p className={styles.popupName}>{activeStop.name}</p>
              <div className={styles.popupStats}>
                <span className={styles.popupStat}>
                  <Star size={13} style={{ color: "#F39C12", fill: "#F39C12" }} />
                  {activeStop.rating.toFixed(1)}
                </span>
                <span className={styles.popupStat}>
                  <Navigation size={12} style={{ color: "#2DCE89" }} />
                  {formatDistance(activeStop.detourKm)} detour
                </span>
                <span className={styles.popupStat}>
                  <Clock size={12} style={{ color: "#60a5fa" }} />
                  {formatDuration(activeStop.visitDurationMinutes)}
                </span>
              </div>
              <a
                href={directionsUrl(activeStop.lat, activeStop.lng, activeStop.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.popupBtn}
              >
                <MapPin size={15} />
                Get Directions
              </a>
            </div>
          )}
        </AnimatePresence>
      </APIProvider>
    </div>
  )
}

export const RouteMap = memo(RouteMapComponent)