"use client"
// components/map/RouteMap.tsx
// Key fixes:
// 1. Draws REAL road polyline from Google Directions encoded polyline
// 2. No more straight lines between stop pins
// 3. fitBounds uses actual polyline coordinates
// 4. Selected stops highlighted in amber, unselected in navy
// 5. Popup has "Add to trip" / "Remove from trip" button

import { useState, useCallback, useEffect, memo } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps"
import { motion, AnimatePresence } from "framer-motion"
import { X, Navigation, Clock, Star, MapPin, Plus, Minus } from "lucide-react"
import { Stop } from "@/types"
import { formatDistance, formatDuration, scoreLabel, directionsUrl } from "@/lib/utils"
import { useRouteStore } from "@/stores/useRouteStore"
import styles from "./RouteMap.module.css"

// ── Polyline decoder ──────────────────────────────────────────────
// Decodes Google's encoded polyline format into lat/lng array
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number
    do {
      byte    = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift  += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = result = 0
    do {
      byte    = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift  += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

// ── Road polyline component ───────────────────────────────────────
// Draws the actual road route — replaces the old straight-line approach
interface RoadPolylineProps {
  encodedPolyline: string
}

function RoadPolyline({ encodedPolyline }: RoadPolylineProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !encodedPolyline) return
    const g = (window as any).google?.maps
    if (!g) return

    // Decode real road path from Google Directions API
    const path = decodePolyline(encodedPolyline)

    // Draw the road as a solid amber line
    const polyline = new g.Polyline({
      path,
      strokeColor:   "#F39C12",
      strokeWeight:  4,
      strokeOpacity: 0.85,
      map,
    })

    // Auto-fit map to show the full route with comfortable padding
    const bounds = new g.LatLngBounds()
    path.forEach((p: google.maps.LatLngLiteral) => bounds.extend(p))

    setTimeout(() => {
      map.fitBounds(bounds, {
        top:    80,
        bottom: 100,
        left:   60,
        right:  60,
      })
    }, 150)

    return () => polyline.setMap(null)
  }, [map, encodedPolyline])

  return null
}

// ── Stop pin component ────────────────────────────────────────────
// Amber = selected in itinerary, Navy = not selected
function StopPin({
  rank,
  isPicked,
  isFirst,
}: {
  rank:    number
  isPicked: boolean
  isFirst: boolean
}) {
  return (
    <div style={{
      width:           "34px",
      height:          "34px",
      borderRadius:    "50% 50% 50% 0",
      transform:       "rotate(-45deg)",
      background:      isPicked
        ? "linear-gradient(135deg, #F39C12, #E67E22)"
        : isFirst
        ? "linear-gradient(135deg, #2DCE89, #1aad72)"
        : "linear-gradient(135deg, #1B4F72, #164260)",
      border:          `2px solid ${isPicked ? "#F7CE58" : "rgba(255,255,255,0.4)"}`,
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      cursor:          "pointer",
      boxShadow:       isPicked
        ? "0 3px 14px rgba(243,156,18,0.55)"
        : "0 2px 8px rgba(0,0,0,0.4)",
      transition:      "all 0.2s ease",
    }}>
      <span style={{
        transform:  "rotate(45deg)",
        color:      "#ffffff",
        fontSize:   "0.72rem",
        fontWeight: 800,
        lineHeight: 1,
      }}>
        {rank}
      </span>
    </div>
  )
}

// ── Source / destination endpoint pins ────────────────────────────
function EndpointPin({ type }: { type: "source" | "dest" }) {
  const isSource = type === "source"
  return (
    <div style={{
      width:        "16px",
      height:       "16px",
      borderRadius: "50%",
      background:   isSource ? "#2DCE89" : "#EF4444",
      border:       `3px solid ${isSource ? "#fff" : "#fff"}`,
      boxShadow:    `0 0 0 3px ${isSource
        ? "rgba(45,206,137,0.3)"
        : "rgba(239,68,68,0.3)"}`,
    }} />
  )
}

// ── Main RouteMap ─────────────────────────────────────────────────
interface RouteMapProps {
  stops:            Stop[]
  encodedPolyline?: string
  sourceLat:        number
  sourceLng:        number
  destLat:          number
  destLng:          number
}

function RouteMapComponent({
  stops,
  encodedPolyline,
  sourceLat,
  sourceLng,
  destLat,
  destLng,
}: RouteMapProps) {
  const [activeStop, setActiveStop] = useState<Stop | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""

  // Pull picked stops from global store
  const pickedStopIds   = useRouteStore((s) => s.pickedStopIds)
  const togglePickedStop = useRouteStore((s) => s.togglePickedStop)

  const handlePin   = useCallback((stop: Stop) => setActiveStop(stop), [])
  const handleClose = useCallback(() => setActiveStop(null), [])

  const handleTogglePick = useCallback(() => {
    if (!activeStop) return
    togglePickedStop(activeStop.placeId)
  }, [activeStop, togglePickedStop])

  // Default centre between source and dest while loading
  const centre = {
    lat: (sourceLat + destLat) / 2,
    lng: (sourceLng + destLng) / 2,
  }

  const score = activeStop ? scoreLabel(activeStop.aiScore) : null

  const scoreBg: Record<string, string> = {
    green: "#dcfce7", amber: "#fef9c3", blue: "#dbeafe", gray: "#f1f5f9",
  }
  const scoreText: Record<string, string> = {
    green: "#166534", amber: "#854d0e", blue: "#1e40af", gray: "#64748b",
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
          {/* ── Real road polyline ── */}
          {encodedPolyline && (
            <RoadPolyline encodedPolyline={encodedPolyline} />
          )}

          {/* ── Source pin ── */}
          <AdvancedMarker
            position={{ lat: sourceLat, lng: sourceLng }}
            title="Start"
            zIndex={100}
          >
            <EndpointPin type="source" />
          </AdvancedMarker>

          {/* ── Destination pin ── */}
          <AdvancedMarker
            position={{ lat: destLat, lng: destLng }}
            title="Destination"
            zIndex={100}
          >
            <EndpointPin type="dest" />
          </AdvancedMarker>

          {/* ── Stop pins — animate in with stagger ── */}
          {stops.map((stop, i) => {
            const isPicked = pickedStopIds.has(stop.placeId)
            return (
              <AdvancedMarker
                key={stop.placeId}
                position={{ lat: stop.lat, lng: stop.lng }}
                onClick={() => handlePin(stop)}
                title={stop.name}
                zIndex={isPicked ? 50 : 10}
              >
                <motion.div
                  initial={{ scale: 0, y: -8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{
                    delay:     0.1 + i * 0.05,
                    type:      "spring",
                    stiffness: 240,
                    damping:   18,
                  }}
                >
                  <StopPin
                    rank={i + 1}
                    isPicked={isPicked}
                    isFirst={i === 0}
                  />
                </motion.div>
              </AdvancedMarker>
            )
          })}
        </Map>

        {/* ── Stop popup ── */}
        <AnimatePresence>
          {activeStop && score && (
            <motion.div
              className={styles.popup}
              key={activeStop.placeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <button className={styles.popupClose} onClick={handleClose}>
                <X size={13} />
              </button>

              <p className={styles.popupName}>{activeStop.name}</p>

              <span
                className={styles.popupBadge}
                style={{
                  background: scoreBg[score.color],
                  color:      scoreText[score.color],
                }}
              >
                {score.label}
              </span>

              <div className={styles.popupStats}>
                <span className={styles.popupStat}>
                  <Star size={13} style={{ color: "#F39C12", fill: "#F39C12" }} />
                  {activeStop.rating.toFixed(1)}
                </span>
                <span className={styles.popupStat}>
                  <Navigation size={12} style={{ color: "#2DCE89" }} />
                  {formatDistance(activeStop.detourKm)} off route
                </span>
                <span className={styles.popupStat}>
                  <Clock size={12} style={{ color: "#60a5fa" }} />
                  {formatDuration(activeStop.visitDurationMinutes)}
                </span>
              </div>

              {/* Add / Remove from trip */}
              <button
                className={`${styles.popupAddBtn} ${pickedStopIds.has(activeStop.placeId) ? "remove" : "add"}`}
                onClick={handleTogglePick}
              >
                {pickedStopIds.has(activeStop.placeId)
                  ? <><Minus size={15} /> Remove from trip</>
                  : <><Plus size={15} /> Add to trip</>
                }
              </button>

              {/* Directions link */}
              <a
                href={directionsUrl(activeStop.lat, activeStop.lng, activeStop.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.popupDirBtn}
              >
                <MapPin size={13} />
                Open in Google Maps
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </APIProvider>
    </div>
  )
}

export const RouteMap = memo(RouteMapComponent)