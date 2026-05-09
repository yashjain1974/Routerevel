"use client"
// components/home/RouteInput.tsx
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MapPin, Navigation, ArrowUpDown, Loader2 } from "lucide-react"

export function RouteInput() {
  const router = useRouter()
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isValid = source.trim().length > 2 && destination.trim().length > 2

  async function handleSubmit() {
    if (!isValid) {
      setError("Please enter both source and destination")
      return
    }
    setError("")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    const params = new URLSearchParams({
      from: source.trim(),
      to: destination.trim(),
    })
    router.push(`/plan?${params.toString()}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && isValid) handleSubmit()
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    height: "56px",
    padding: "0 1rem 0 3rem",
    borderRadius: "14px",
    border: "1.5px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.09)",
    color: "#ffffff",
    fontSize: "1rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s ease",
    backdropFilter: "blur(8px)",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 90 }}
      style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}
    >
      <div style={{
        borderRadius: "24px",
        padding: "1.75rem",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>

        {/* Source field */}
        <div style={{ position: "relative", marginBottom: "10px" }}>
          <div style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
          }}>
            <div style={{
              width: "11px",
              height: "11px",
              borderRadius: "50%",
              background: "#2DCE89",
              boxShadow: "0 0 0 3px rgba(45,206,137,0.25)",
            }} />
          </div>
          <input
            value={source}
            onChange={(e) => { setSource(e.target.value); setError("") }}
            onKeyDown={handleKeyDown}
            placeholder="Starting point — e.g. Hyderabad"
            style={inputBase}
            onFocus={(e) => {
              e.target.style.border = "1.5px solid rgba(255,255,255,0.4)"
              e.target.style.background = "rgba(255,255,255,0.13)"
            }}
            onBlur={(e) => {
              e.target.style.border = "1.5px solid rgba(255,255,255,0.18)"
              e.target.style.background = "rgba(255,255,255,0.09)"
            }}
          />
          <style>{`input::placeholder { color: rgba(255,255,255,0.38); }`}</style>
        </div>

        {/* Swap row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "4px 0",
          padding: "0 4px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: 180 }}
            transition={{ duration: 0.2 }}
            onClick={() => { const t = source; setSource(destination); setDestination(t) }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              transition: "all 0.2s",
            }}
            title="Swap source and destination"
          >
            <ArrowUpDown size={14} />
          </motion.button>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Destination field */}
        <div style={{ position: "relative", marginTop: "10px" }}>
          <div style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}>
            <MapPin size={17} style={{ color: "#F39C12" }} />
          </div>
          <input
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setError("") }}
            onKeyDown={handleKeyDown}
            placeholder="Destination — e.g. Bangalore"
            style={inputBase}
            onFocus={(e) => {
              e.target.style.border = "1.5px solid rgba(255,255,255,0.4)"
              e.target.style.background = "rgba(255,255,255,0.13)"
            }}
            onBlur={(e) => {
              e.target.style.border = "1.5px solid rgba(255,255,255,0.18)"
              e.target.style.background = "rgba(255,255,255,0.09)"
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: "8px",
              fontSize: "0.8rem",
              color: "#ff8080",
              textAlign: "center",
            }}
          >
            {error}
          </motion.p>
        )}

        {/* Submit button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!isValid || loading}
          style={{
            marginTop: "16px",
            width: "100%",
            height: "54px",
            borderRadius: "14px",
            border: "none",
            background: isValid
              ? "linear-gradient(135deg, #F39C12, #E67E22)"
              : "rgba(243,156,18,0.35)",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: isValid ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.2s ease",
            boxShadow: isValid ? "0 4px 20px rgba(243,156,18,0.4)" : "none",
            letterSpacing: "0.01em",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Finding stops...
            </>
          ) : (
            <>
              <Navigation size={18} />
              Discover stops
            </>
          )}
        </motion.button>

        {/* Hint */}
        <p style={{
          marginTop: "12px",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.28)",
          letterSpacing: "0.02em",
        }}>
          Works for car routes and train journeys
        </p>
      </div>
    </motion.div>
  )
}