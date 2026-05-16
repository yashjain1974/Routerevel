"use client"
// components/stops/StopDetail.tsx
// Bottom sheet — animates in with spring physics.
// Uses useCallback to avoid unnecessary re-renders of child event handlers.

import { useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Clock, Navigation, MapPin, ExternalLink } from "lucide-react"
import { Stop } from "@/types"
import { formatDistance, formatDuration, formatRating, scoreLabel, categoryMeta, directionsUrl } from "@/lib/utils"
import styles from "./StopDetail.module.css"

interface StopDetailProps {
  stop:    Stop | null
  onClose: () => void
}

// Defined outside to avoid recreation on every render
const sheetVariants = {
  hidden:  { y: "100%" },
  visible: { y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  exit:    { y: "100%", transition: { duration: 0.2 } },
}

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
}

function StopDetailComponent({ stop, onClose }: StopDetailProps) {
  // useCallback prevents the close handler from being recreated on each render
  const handleClose = useCallback(() => onClose(), [onClose])

  // Stop clicks on the sheet from bubbling to the backdrop
  const handleSheetClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  if (!stop) return null

  const score = scoreLabel(stop.aiScore)
  const cat   = categoryMeta(stop.category)

  const scoreBadgeClass = {
    green: styles.badgeGreen,
    amber: styles.badgeAmber,
    blue:  styles.badgeBlue,
    gray:  styles.badgeGray,
  }[score.color]

  return (
    <AnimatePresence>
      {/* Backdrop — click to close */}
      <motion.div
        className={styles.backdrop}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleClose}
        key="backdrop"
      />

      {/* Sheet */}
      <motion.div
        className={styles.sheet}
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleSheetClick}
        key="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${stop.name}`}
      >
        {/* Drag handle */}
        <div className={styles.handle} />

        {/* Sticky header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div>
              <h2 className={styles.title}>{stop.name}</h2>
              <div className={styles.headerBadges}>
                <span className={`${styles.badge} ${scoreBadgeClass}`}>{score.label}</span>
                <span className={`${styles.badge} ${styles.badgeCat}`} style={{ color: cat.color }}>
                  {cat.label}
                </span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close details">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className={styles.body}>

          {/* Stats grid */}
          <div className={styles.statsGrid}>
            {[
              {
                icon:  <Star size={14} style={{ color: "#F39C12", fill: "#F39C12" }} />,
                value: formatRating(stop.rating, stop.totalRatings),
                label: "Rating",
              },
              {
                icon:  <Navigation size={14} style={{ color: "#2DCE89" }} />,
                value: formatDistance(stop.detourKm),
                label: "Detour",
              },
              {
                icon:  <Clock size={14} style={{ color: "#60a5fa" }} />,
                value: formatDuration(stop.visitDurationMinutes),
                label: "Visit time",
              },
            ].map((s) => (
              <div key={s.label} className={styles.statBox}>
                {s.icon}
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          <div className={styles.aiBox}>
            <p className={styles.aiLabel}>AI Summary</p>
            <p className={styles.aiText}>{stop.aiSummary}</p>
          </div>

          {/* Opening hours */}
          {stop.openingHours.length > 0 && (
            <div className={styles.hoursSection}>
              <p className={styles.sectionLabel}>Opening hours</p>
              <div className={styles.hoursBox}>
                <div className={styles.hoursStatus}>
                  <div className={`${styles.statusDot} ${stop.openNow ? styles.statusOpen : styles.statusClosed}`} />
                  <span className={`${styles.statusText} ${stop.openNow ? styles.statusTextOpen : styles.statusTextClosed}`}>
                    {stop.openNow ? "Open now" : "Closed now"}
                  </span>
                </div>
                {stop.openingHours.slice(0, 3).map((h, i) => (
                  <p key={i} className={styles.hoursLine}>{h}</p>
                ))}
              </div>
            </div>
          )}

          {/* Get Directions CTA */}
          <a
            href={directionsUrl(stop.lat, stop.lng, stop.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.directionsBtn}
          >
            <MapPin size={18} />
            Get Directions
            <ExternalLink size={14} style={{ opacity: 0.7 }} />
          </a>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export const StopDetail = memo(StopDetailComponent)