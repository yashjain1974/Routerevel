"use client"
// components/stops/StopsList.tsx
// Now uses useRouteStream for progressive loading.
// Stops appear one by one as AI scores them — no more waiting.

import { useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin, SlidersHorizontal, SearchX, RefreshCw,
  Wifi, Navigation, ExternalLink, Loader2
} from "lucide-react"
import { StopCard } from "./StopCard"
import { StopDetail } from "./StopDetail"
import { useRouteStore } from "@/stores/useRouteStore"
import { useRouteStream } from "@/hooks/useRouteStream"
import { Stop } from "@/types"
import styles from "./StopsList.module.css"

const RADIUS_OPTIONS = [5, 10, 20, 30] as const
type RadiusKm = typeof RADIUS_OPTIONS[number]

const SORT_OPTIONS = [
  { key: "score", label: "AI Score" },
  { key: "travel", label: "Nearest" },
  { key: "rating", label: "Rating" },
] as const
type SortKey = typeof SORT_OPTIONS[number]["key"]

interface StopsListProps {
  from: string
  to: string
}

export function StopsList({ from, to }: StopsListProps) {

  // ── Store ──────────────────────────────────────────────────────
  const selectedStop = useRouteStore((s) => s.selectedStop)
  const setSelected = useRouteStore((s) => s.setSelectedStop)
  const sortBy = useRouteStore((s) => s.sortBy)
  const setSortBy = useRouteStore((s) => s.setSortBy)
  const radiusKm = useRouteStore((s) => s.radiusKm)
  const setRadiusKm = useRouteStore((s) => s.setRadiusKm)
  const pickedStopIds = useRouteStore((s) => s.pickedStopIds)
  const clearPickedStops = useRouteStore((s) => s.clearPickedStops)

  // ── Progressive stream ─────────────────────────────────────────
  const { stops, isLoading, isDone, error, status, fromCache, refetch, route } =
    useRouteStream(from, to)

  // ── Filter by radius ───────────────────────────────────────────
  const filtered = useMemo<Stop[]>(
    () => stops.filter((s) => s.detourKm <= radiusKm),
    [stops, radiusKm]
  )

  // ── Sort ───────────────────────────────────────────────────────
  const sorted = useMemo<Stop[]>(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "score") return b.aiScore - a.aiScore
      if (sortBy === "rating") return b.rating - a.rating
      return a.detourKm - b.detourKm
    })
  }, [filtered, sortBy])

  // ── Selection ──────────────────────────────────────────────────
  const pickedStops = useMemo(
    () => sorted.filter((s) => pickedStopIds.has(s.placeId)),
    [sorted, pickedStopIds]
  )

  const totalAddedMin = useMemo(
    () => pickedStops.reduce((sum, s) => sum + s.visitDurationMinutes + s.detourMinutes * 2, 0),
    [pickedStops]
  )

  const googleMapsUrl = useMemo(() => {
    if (!pickedStops.length) return ""
    const origin = encodeURIComponent(from)
    const destination = encodeURIComponent(to)
    const waypoints = pickedStops.map((s) => `${s.lat},${s.lng}`).join("|")
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
  }, [pickedStops, from, to])

  const handleCardClick = useCallback((stop: Stop) => setSelected(stop), [setSelected])
  const handleClose = useCallback(() => setSelected(null), [setSelected])

  // ── Error state ────────────────────────────────────────────────
  if (error && stops.length === 0) return (
    <div className={styles.errorBox}>
      <Wifi size={36} style={{ color: "rgba(248,113,113,0.5)", marginBottom: "12px" }} />
      <p className={styles.errorTitle}>Could not load stops</p>
      <p className={styles.errorDesc}>{error}</p>
      <button className={styles.retryBtn} onClick={refetch}>
        <RefreshCw size={14} /> Try again
      </button>
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

      {/* ── Status bar — shows loading progress ── */}
      {(isLoading || status) && (
        <motion.div
          className={styles.statusBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {isLoading && (
            <Loader2
              size={13}
              style={{ flexShrink: 0, animation: "spin 1s linear infinite" }}
            />
          )}
          <span>{status}</span>
          {stops.length > 0 && isLoading && (
            <span className={styles.statusCount}>
              {stops.length} found so far
            </span>
          )}
        </motion.div>
      )}

      {/* ── Sort + count bar — shown as stops arrive ── */}
      {stops.length > 0 && (
        <motion.div
          className={styles.sortBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={styles.count}>
            <MapPin size={13} style={{ color: "#f39c12" }} />
            <span className={styles.countNum}>{sorted.length}</span>
            <span className={styles.countLabel}>
              stops
              {!isDone && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: "4px" }}>• loading more...</span>}
              {fromCache && <span style={{ color: "rgba(45,206,137,0.6)", marginLeft: "5px", fontSize: "0.68rem" }}>⚡ cached</span>}
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
      )}

      {/* ── Route meta ── */}
      {route && (
        <motion.div
          className={styles.metaBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span>{from} → {to}</span>
          <span>·</span>
          <span>{route.distanceKm} km</span>
          <span>·</span>
          <span>~{Math.floor(route.durationMinutes / 60)}h {route.durationMinutes % 60}m</span>
        </motion.div>
      )}

      {/* ── Empty after filter ── */}
      {sorted.length === 0 && isDone && (
        <div className={styles.empty}>
          <SearchX size={32} style={{ color: "rgba(255,255,255,0.18)", marginBottom: "8px" }} />
          <p className={styles.emptyTitle}>No stops within {radiusKm} km</p>
          <p className={styles.emptyDesc}>Try a larger radius above.</p>
        </div>
      )}

      {/* ── Stop cards — appear one by one as stream delivers them ── */}
      <motion.div layout className={styles.list}>
        <AnimatePresence>
          {sorted.map((stop, i) => (
            <StopCard
              key={stop.placeId}
              stop={stop}
              index={i}
              onClick={handleCardClick}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Sticky trip bar ── */}
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
                +<span>{Math.floor(totalAddedMin / 60)}h {totalAddedMin % 60}m</span>
                &nbsp;added to your trip
              </p>
            </div>
            <button
              onClick={clearPickedStops}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.45)", borderRadius: "9px",
                padding: "8px 12px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit",
              }}
            >
              Clear
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tripBarBtn}
            >
              Navigate <ExternalLink size={13} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail sheet ── */}
      <AnimatePresence>
        {selectedStop && (
          <StopDetail key="detail" stop={selectedStop} onClose={handleClose} />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}