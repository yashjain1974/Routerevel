"use client"
// components/shared/LoadingSpinner.tsx
// Reusable loading state used on the plan page, API calls, and lazy-loaded components.
// Framer Motion handles the entrance animation.
// memo prevents re-render if parent updates without changing the message prop.

import { memo } from "react"
import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import styles from "./LoadingSpinner.module.css"

interface LoadingSpinnerProps {
  message?: string
}

// Dot animation variants — defined outside to avoid recreation
const dotVariants = {
  animate: (i: number) => ({
    scale:   [1, 1.5, 1],
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 1.2,
      repeat:   Infinity,
      delay:    i * 0.2,
    },
  }),
}

function LoadingSpinnerComponent({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className={styles.wrapper}>

      {/* Spinning map pins */}
      <div className={styles.ring}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              style={{ position: "absolute", top: i * 6, left: i * 6 }}
            >
              <MapPin
                size={16 - i * 3}
                style={{
                  color: i === 0 ? "#F39C12" : i === 1 ? "#2DCE89" : "rgba(255,255,255,0.3)",
                }}
              />
            </motion.div>
          </motion.div>
        ))}

        {/* Center dot */}
        <div className={styles.dot}>
          <motion.div
            className={styles.dotInner}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Text */}
      <div className={styles.textArea}>
        <motion.p
          className={styles.message}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
        <p className={styles.subtext}>Scanning 20km route corridor</p>
      </div>

      {/* Bouncing dots */}
      <div className={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={styles.dotBounce}
            variants={dotVariants}
            animate="animate"
            custom={i}
          />
        ))}
      </div>

    </div>
  )
}

export const LoadingSpinner = memo(LoadingSpinnerComponent)