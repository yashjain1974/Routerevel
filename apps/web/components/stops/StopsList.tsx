"use client"
// components/stops/StopsList.tsx
// Major update:
// 1. Radius selector — 5/10/20/30km filters stops by detour distance
// 2. Travel order sort — stops sorted by position along route (source → dest)
// 3. Stop selection — user picks stops, sticky "Start trip" bar appears
// 4. Hidden gem detection — low-review but high-score stops flagged

import { useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, SlidersHorizontal, SearchX, RefreshCw, Wifi,
         Navigation, ExternalLink } from "lucide-react"
import { StopCard }       from "./StopCard"
import { StopDetail }     from "./StopDetail"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useRouteStore }  from "@/stores/useRouteStore"
import { useRoute }       from "@/hooks/useRoute"
import { Stop }           from "@/types"
import styles             from "./StopsList.module.css"

// Radius options the user can pick
const RADIUS_OPTIONS = [5, 10, 20, 30] as const
type RadiusKm = typeof RADIUS_OPTIONS[number]

const SORT_OPTIONS = [
  { key: "travel", label: "Route order" },
  { key: "score",  label: "AI Score"    },
  { key: "rating", label: "Rating"      },
] as const
type SortKey = typeof SORT_OPTIONS[number]["key"]

interface StopsListProps {
  from: string
  to:   string
}

export function StopsList({ from, to }: StopsListProps) {

  // ── Store ──────────────────────────────────────────────────────
  const selectedStop    = useRouteStore((s) => s.selectedStop)
  const setSelected     = useRouteStore((s) => s.setSelectedStop)
  const sortBy          = useRouteStore((s) => s.sortBy)
  const setSortBy       = useRouteStore((s) => s.setSortBy)
  const radiusKm        = useRouteStore((s) => s.radiusKm)
  const setRadiusKm     = useRouteStore((s) => s.setRadiusKm)
  const pickedStopIds   = useRouteStore((s) => s.pickedStopIds)
  const clearPickedStops = useRouteStore((s) => s.clearPickedStops)

  // ── Fetch ──────────────────────────────────────────────────────
  const { stops, isLoading, error, fromCache, meta, message, refetch, route } =
    useRoute(from, to)

  // ── Radius filter ──────────────────────────────────────────────
  // Only show stops within the selected radius (detourKm)
  const filtered = useMemo<Stop[]>(() => {
    return stops.filter((s) => s.detourKm <= radiusKm)
  }, [stops, radiusKm])

  // ── Sort ───────────────────────────────────────────────────────
  // "travel" = order along route (by detourKm as proxy for position)
  // This approximates travel order — backend will provide exact position later
  const sorted = useMemo<Stop[]>(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "score")  return b.aiScore  - a.aiScore
      if (sortBy === "rating") return b.rating   - a.rating
      // travel order: sort by lat distance from source (proxy for route position)
      // Real implementation: sort by distance along polyline
      return a.detourKm - b.detourKm
    })
  }, [filtered, sortBy])

  // ── Selection ──────────────────────────────────────────────────
  const pickedStops = useMemo(
    () => sorted.filter((s) => pickedStopIds.has(s.placeId)),
    [sorted, pickedStopIds]
  )

  // Total added time for picked stops
  const totalAddedMin = useMemo(
    () => pickedStops.reduce((sum, s) => sum + s.visitDurationMinutes + s.detourMinutes * 2, 0),
    [pickedStops]
  )
  const totalAddedKm = useMemo(
    () => pickedStops.reduce((sum, s) => sum + s.detourKm * 2, 0),
    [pickedStops]
  )

  // Build Google Maps URL with all picked stops as waypoints
  const googleMapsUrl = useMemo(() => {
    if (pickedStops.length === 0) return ""
    const origin      = encodeURIComponent(from)
    const destination = encodeURIComponent(to)
    const waypoints   = pickedStops
      .map((s) => `${s.lat},${s.lng}`)
      .join("|")
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
  }, [pickedStops, from, to])

  // ── Callbacks ──────────────────────────────────────────────────
  const handleCardClick = useCallback((stop: Stop) => setSelected(stop), [setSelected])
  const handleClose     = useCallback(() => setSelected(null), [setSelected])

  // ── States ─────────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner message={`Scanning stops between ${from} and ${to}...`} />

  if (error) return (
    <div className={styles.errorBox}>
      <Wifi size={36} style={{ color: "rgba(248,113,113,0.5)", marginBottom: "12px" }} />
      <p className={styles.errorTitle}>Could not fetch stops</p>
      <p className={styles.errorDesc}>{error}</p>
      <button className={styles.retryBtn} onClick={() => refetch()}>
        <RefreshCw size={14} /> Try again
      </button>
      <p className={styles.errorHint}>
        Backend must be running on <code style={{ color: "#f39c12" }}>localhost:3001</code>
      </p>
    </div>
  )

  if (stops.length === 0) return (
    <div className={styles.empty}>
      <SearchX size={38} style={{ color: "rgba(255,255,255,0.18)", marginBottom: "8px" }} />
      <p className={styles.emptyTitle}>{message || "No stops found"}</p>
      <p className={styles.emptyDesc}>Try a longer route or different city names.</p>
    </div>
  )

  return (
    <div className={styles.container}>

      {/* ── Radius selector ── */}
      <motion.div
        className={styles.radiusBar}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className={styles.radiusLabel}>
          <Navigation size={12} />
          Show stops within&nbsp;
          <span className={styles.radiusBold}>{radiusKm} km</span>
          &nbsp;of your route
        </div>
        <div className={styles.radiusBtns}>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              className={`${styles.radiusBtn} ${radiusKm === r ? styles.radiusBtnActive : ""}`}
              onClick={() => setRadiusKm(r)}
            >
              {r} km
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Sort + count bar ── */}
      <motion.div
        className={styles.sortBar}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.count}>
          <MapPin size={13} style={{ color: "#f39c12" }} />
          <span className={styles.countNum}>{sorted.length}</span>
          <span className={styles.countLabel}>
            stops
            {fromCache && (
              <span style={{ color: "rgba(45,206,137,0.6)", marginLeft: "5px", fontSize: "0.68rem" }}>
                ⚡ cached
              </span>
            )}
          </span>
        </div>
        <div className={styles.sortGroup}>
          <SlidersHorizontal size={12} style={{ color: "rgba(255,255,255,0.28)" }} />
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

      {/* ── Route meta ── */}
      {meta && (
        <motion.div
          className={styles.metaBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
        >
          <span>{from} → {to}</span>
          <span>·</span>
          <span>{meta.routeKm} km</span>
          <span>·</span>
          <span>~{Math.floor(meta.routeMin / 60)}h {meta.routeMin % 60}m</span>
          <span>·</span>
          <span>{meta.totalFound} places scanned</span>
        </motion.div>
      )}

      {/* ── Empty after radius filter ── */}
      {sorted.length === 0 && (
        <div className={styles.empty}>
          <SearchX size={32} style={{ color: "rgba(255,255,255,0.18)", marginBottom: "8px" }} />
          <p className={styles.emptyTitle}>No stops within {radiusKm} km</p>
          <p className={styles.emptyDesc}>Try a larger radius above.</p>
        </div>
      )}

      {/* ── Stop cards ── */}
      <motion.div layout className={styles.list}>
        {sorted.map((stop, i) => (
          <StopCard
            key={stop.placeId}
            stop={stop}
            index={i}
            onClick={handleCardClick}
          />
        ))}
      </motion.div>

      {/* ── Sticky trip bar — appears when stops are selected ── */}
      <AnimatePresence>
        {pickedStops.length > 0 && (
          <motion.div
            className={styles.tripBar}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            <div className={styles.tripBarLeft}>
              <p className={styles.tripBarTitle}>
                {pickedStops.length} stop{pickedStops.length > 1 ? "s" : ""} selected
              </p>
              <p className={styles.tripBarMeta}>
                +<span>{Math.round(totalAddedMin / 60)}h {totalAddedMin % 60}m</span>
                &nbsp;·&nbsp;
                +<span>{totalAddedKm.toFixed(0)} km</span>
                &nbsp;added to trip
              </p>
            </div>

            {/* Clear button */}
            <button
              onClick={clearPickedStops}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.45)",
                borderRadius: "9px",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontFamily: "inherit",
              }}
            >
              Clear
            </button>

            {/* Open Google Maps with waypoints */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tripBarBtn}
            >
              Navigate
              <ExternalLink size={13} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail sheet ── */}
      <AnimatePresence>
        {selectedStop && (
          <StopDetail
            key="detail"
            stop={selectedStop}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>

    </div>
  )
}