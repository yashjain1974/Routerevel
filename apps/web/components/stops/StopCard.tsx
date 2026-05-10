"use client"
// components/stops/StopCard.tsx
// Updated with:
// - Checkbox to add/remove stop from itinerary
// - Selected (amber) visual state
// - 💎 Hidden gem badge for low-traffic unique spots
// - Travel order number (position along route)

import { memo, useCallback } from "react"
import { motion }            from "framer-motion"
import { Star, Clock, Navigation, ChevronRight, Check, Gem } from "lucide-react"
import { Stop }              from "@/types"
import { formatDistance, formatDuration, formatRating, scoreLabel, categoryMeta } from "@/lib/utils"
import { useRouteStore }     from "@/stores/useRouteStore"
import styles                from "./StopCard.module.css"

interface StopCardProps {
  stop:    Stop
  index:   number   // travel order index (0 = first stop you'll encounter)
  onClick: (stop: Stop) => void
}

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: {
      delay:     i * 0.05,
      duration:  0.3,
      type:      "spring" as const,
      stiffness: 130,
      damping:   18,
    },
  }),
}

function StopCardComponent({ stop, index, onClick }: StopCardProps) {
  const pickedStopIds    = useRouteStore((s) => s.pickedStopIds)
  const togglePickedStop = useRouteStore((s) => s.togglePickedStop)

  const isPicked  = pickedStopIds.has(stop.placeId)
  const score     = scoreLabel(stop.aiScore)
  const cat       = categoryMeta(stop.category)
  const rating    = formatRating(stop.rating, stop.totalRatings)

  // Hidden gem: unique but fewer reviews
  const isHiddenGem = stop.totalRatings < 500 && stop.aiScore >= 70

  const scoreBadgeClass = {
    green: styles.badgeGreen,
    amber: styles.badgeAmber,
    blue:  styles.badgeBlue,
    gray:  styles.badgeGray,
  }[score.color]

  // Stop checkbox toggle — prevent card click from firing
  const handleCheckbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    togglePickedStop(stop.placeId)
  }, [stop.placeId, togglePickedStop])

  return (
    <motion.div
      className={`${styles.card} ${isPicked ? styles.picked : ""}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      onClick={() => onClick(stop)}
      layout
      whileTap={{ scale: 0.99 }}
    >
      <div className={styles.body}>

        {/* ── Checkbox ── */}
        <div
          className={`${styles.checkbox} ${isPicked ? styles.checked : ""}`}
          onClick={handleCheckbox}
          role="checkbox"
          aria-checked={isPicked}
          aria-label={`Add ${stop.name} to trip`}
        >
          {isPicked && <Check size={13} color="#fff" strokeWidth={3} />}
        </div>

        {/* ── Travel order rank ── */}
        <div className={`${styles.rank} ${
          index === 0   ? styles.rankFirst  :
          isPicked      ? styles.rankPicked : ""
        }`}>
          {index + 1}
        </div>

        <div className={styles.content}>

          {/* Name + chevron */}
          <div className={styles.nameRow}>
            <h3 className={styles.name}>{stop.name}</h3>
            <ChevronRight size={17} className={styles.chevron} />
          </div>

          {/* Badges */}
          <div className={styles.badges}>
            <span className={`${styles.badge} ${scoreBadgeClass}`}>
              {score.label}
            </span>
            <span
              className={`${styles.badge} ${styles.badgeCat}`}
              style={{ color: cat.color }}
            >
              {cat.label}
            </span>
            {isHiddenGem && (
              <span className={`${styles.badge} ${styles.badgeGem}`}>
                <Gem size={10} />
                Hidden gem
              </span>
            )}
            <span className={`${styles.badge} ${stop.openNow ? styles.badgeOpen : styles.badgeClosed}`}>
              {stop.openNow ? "● Open" : "● Closed"}
            </span>
          </div>

          {/* AI Summary */}
          <p className={styles.summary}>{stop.aiSummary}</p>

          {/* Stats */}
          <div className={styles.stats}>
            <span className={styles.stat}>
              <Star size={12} style={{ color: "#F39C12", fill: "#F39C12" }} />
              <span className={styles.statVal}>{rating}</span>
            </span>
            <span className={styles.stat}>
              <Navigation size={12} style={{ color: "#2DCE89" }} />
              <span className={styles.statVal}>{formatDistance(stop.detourKm)}</span>
              &nbsp;off route
            </span>
            <span className={styles.stat}>
              <Clock size={12} style={{ color: "#60a5fa" }} />
              <span className={styles.statVal}>{formatDuration(stop.visitDurationMinutes)}</span>
            </span>
          </div>

        </div>
      </div>
    </motion.div>
  )
}

export const StopCard = memo(StopCardComponent)