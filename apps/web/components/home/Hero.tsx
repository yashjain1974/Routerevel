"use client"
// components/home/Hero.tsx
import { motion } from "framer-motion"
import { MapPin, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <div className="text-center max-w-2xl mx-auto px-4 relative">

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center mb-6"
      >
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 18px",
          borderRadius: "9999px",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#ffffff",
          background: "rgba(255,255,255,0.13)",
          border: "1px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(12px)",
        }}>
          <Sparkles size={14} style={{ color: "#F7CE58" }} />
          AI-powered route discovery
        </div>
      </motion.div>

      {/* Main heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          fontSize: "clamp(3.5rem, 9vw, 6rem)",
          fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.25rem",
        }}
      >
        Route<span style={{ color: "#F39C12" }}>Revel</span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          fontSize: "clamp(1.05rem, 2.5vw, 1.2rem)",
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.7,
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        Discover amazing temples, waterfalls, and hidden gems
        between your source and destination — automatically.
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: "2.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "3rem",
        }}
      >
        {[
          { value: "20km", label: "Route corridor" },
          { value: "AI", label: "Ranked stops" },
          { value: "Live", label: "Push alerts" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}
          >
            <span style={{
              fontSize: "1.9rem",
              fontWeight: 700,
              color: "#F39C12",
              lineHeight: 1,
            }}>
              {stat.value}
            </span>
            <span style={{
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}>
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Floating pins — desktop only */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{ position: "absolute", top: "10px", left: "-70px" }}
        className="hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <MapPin size={28} style={{ color: "rgba(243,156,18,0.5)" }} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ position: "absolute", top: "50px", right: "-55px" }}
        className="hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <MapPin size={20} style={{ color: "rgba(255,255,255,0.22)" }} />
        </motion.div>
      </motion.div>
    </div>
  )
}