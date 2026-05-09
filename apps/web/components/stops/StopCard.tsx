"use client"
// components/stops/StopCard.tsx
// Memoized stop card with bigger fonts, cleaner layout,
// left accent bar on hover, and animated chevron.

import { memo } from "react"
import { motion } from "framer-motion"
import { Star, Clock, Navigation, ChevronRight } from "lucide-react"
import { Stop } from "@/types"
import { formatDistance, formatDuration, formatRating, scoreLabel, categoryMeta } from "@/lib/utils"
import styles from "./StopCard.module.css"

interface StopCardProps {
  stop:    Stop
  index:   number
  onClick: (stop: Stop) => void
}

// Defined outside component — stable reference, no recreation on render
const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay:     i * 0.06,
      duration:  0.35,
      type:      "spring" as const,
      stiffness: 120,
      damping:   18,
    },
  }),
}

function StopCardComponent({ stop, index, onClick }: StopCardProps) {
  const score  = scoreLabel(stop.aiScore)
  const cat    = categoryMeta(stop.category)
  const rating = formatRating(stop.rating, stop.totalRatings)

  const scoreBadgeClass = {
    green: styles.badgeGreen,
    amber: styles.badgeAmber,
    blue:  styles.badgeBlue,
    gray:  styles.badgeGray,
  }[score.color]

  return (
    <motion.div
      className={styles.card}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      onClick={() => onClick(stop)}
      layout
      whileTap={{ scale: 0.99 }}
    >
      <div className={styles.body}>

        {/* Rank */}
        <div className={`${styles.rank} ${index === 0 ? styles.rankFirst : ""}`}>
          {index + 1}
        </div>

        <div className={styles.content}>

          {/* Name + chevron */}
          <div className={styles.nameRow}>
            <h3 className={styles.name}>{stop.name}</h3>
            <ChevronRight size={18} className={styles.chevron} />
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
            <span className={`${styles.badge} ${stop.openNow ? styles.badgeOpen : styles.badgeClosed}`}>
              {stop.openNow ? "● Open" : "● Closed"}
            </span>
          </div>

          {/* Summary */}
          <p className={styles.summary}>{stop.aiSummary}</p>

          {/* Stats */}
          <div className={styles.stats}>
            <span className={styles.stat}>
              <Star size={13} style={{ color: "#F39C12", fill: "#F39C12" }} />
              <span className={styles.statValue}>{rating}</span>
            </span>
            <span className={styles.stat}>
              <Navigation size={12} style={{ color: "#2DCE89" }} />
              <span className={styles.statValue}>{formatDistance(stop.detourKm)}</span>
              &nbsp;detour
            </span>
            <span className={styles.stat}>
              <Clock size={12} style={{ color: "#60a5fa" }} />
              <span className={styles.statValue}>{formatDuration(stop.visitDurationMinutes)}</span>
            </span>
          </div>

        </div>
      </div>
    </motion.div>
  )
}

export const StopCard = memo(StopCardComponent)