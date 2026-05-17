"use client"
// app/itinerary/page.tsx
// Beautiful timeline itinerary page.
// Shows: departure time selector, photo strips, significance, visit tips,
// drive connectors, feasibility check, Google Maps export.

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ItineraryPDFButton } from "@/components/itinerary/ItineraryPDF"
import { Download } from "lucide-react"
import {
    ArrowLeft, Navigation, MapPin, Clock, Star,
    Car, Lightbulb, Sun, Share2, ExternalLink, Loader2,
    Camera, AlertTriangle, CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useItinerary } from "@/hooks/useItinerary"
import { useRouteStore } from "@/stores/useRouteStore"
import { categoryMeta } from "@/lib/utils"
import { StopCategory } from "@/types"
import styles from "./itinerary.module.css"

// ── Category emoji map ────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
    temple: "🛕", nature: "🌿", monument: "🏛️",
    viewpoint: "🔭", museum: "🏛️", dam: "💧",
    food: "🍽️", other: "📍",
}

// ── Photo strip component ─────────────────────────────────────────
function PhotoStrip({ photos, name }: { photos: string[]; name: string }) {
    const [loaded, setLoaded] = useState<boolean[]>([])

    if (!photos || photos.length === 0) {
        return (
            <div className={styles.photoPlaceholder}>
                <Camera size={32} style={{ opacity: 0.3 }} />
            </div>
        )
    }

    return (
        <div className={styles.photoStrip}>
            {/* Main large photo */}
            <img
                src={photos[0]}
                alt={name}
                className={styles.photoMain}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />

            {/* Side thumbnails — show if 2+ photos */}
            {photos.length > 1 && (
                <div className={styles.photoSide}>
                    {photos.slice(1, 3).map((photo, i) => (
                        <img
                            key={i}
                            src={photo}
                            alt={`${name} ${i + 2}`}
                            className={styles.photoThumb}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Individual stop card on timeline ─────────────────────────────
function ItineraryStopCard({ stop, index }: { stop: any; index: number }) {
    const cat = categoryMeta(stop.category as StopCategory)

    return (
        <motion.div
            className={styles.stopCard}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, type: "spring" }}
        >
            {/* Photos from Google Places */}
            <PhotoStrip photos={stop.photos} name={stop.name} />

            <div className={styles.cardBody}>

                {/* Order + name */}
                <div className={styles.cardHeader}>
                    <div className={styles.orderBadge}>{stop.order}</div>
                    <div style={{ flex: 1 }}>
                        <h3 className={styles.stopName}>{stop.name}</h3>
                        <span
                            className={styles.categoryBadge}
                            style={{ color: cat.color }}
                        >
                            {CATEGORY_EMOJI[stop.category] || "📍"} {cat.label}
                        </span>
                    </div>
                    {/* Rating */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                        <Star size={13} style={{ color: "#F39C12", fill: "#F39C12" }} />
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
                            {stop.rating.toFixed(1)}
                        </span>
                    </div>
                </div>

                {/* Visit timing row */}
                <div className={styles.visitRow}>
                    <div className={styles.visitStat}>
                        <Clock size={12} style={{ color: "#f39c12" }} />
                        <span>Arrive</span>
                        <span className={styles.visitStatValue}>{stop.arrivalTime}</span>
                    </div>
                    <div className={styles.visitStat}>
                        <Clock size={12} style={{ color: "#60a5fa" }} />
                        <span>Leave</span>
                        <span className={styles.visitStatValue}>{stop.departureTime}</span>
                    </div>
                    <div className={styles.visitStat}>
                        <Navigation size={12} style={{ color: "#2dce89" }} />
                        <span className={styles.visitStatValue}>
                            {stop.visitDurationMinutes >= 60
                                ? `${Math.floor(stop.visitDurationMinutes / 60)}h ${stop.visitDurationMinutes % 60 > 0 ? stop.visitDurationMinutes % 60 + "m" : ""}`
                                : `${stop.visitDurationMinutes}m`
                            }
                        </span>
                        <span>visit</span>
                    </div>

                    {/* Open/Closed */}
                    <div style={{
                        marginLeft: "auto",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        background: stop.openNow ? "rgba(45,206,137,0.12)" : "rgba(239,68,68,0.12)",
                        color: stop.openNow ? "#2dce89" : "#f87171",
                        border: `1px solid ${stop.openNow ? "rgba(45,206,137,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}>
                        {stop.openNow ? "● Open" : "● Closed"}
                    </div>
                </div>

                {/* Significance — the main AI content */}
                {stop.significance && (
                    <div style={{ marginBottom: "10px" }}>
                        <p className={styles.significanceLabel}>
                            Why visit
                        </p>
                        <p className={styles.significance}>{stop.significance}</p>
                    </div>
                )}

                {/* Visit tip */}
                {stop.visitTip && (
                    <div className={styles.tipBox}>
                        <p className={styles.tipLabel}>
                            <Lightbulb size={10} style={{ display: "inline", marginRight: "3px" }} />
                            Visit tip
                        </p>
                        <p className={styles.tipText}>{stop.visitTip}</p>
                    </div>
                )}

                {/* Best time to visit */}
                {stop.bestTimeToVisit && (
                    <span className={styles.bestTime}>
                        <Sun size={12} />
                        {stop.bestTimeToVisit}
                    </span>
                )}

            </div>
        </motion.div>
    )
}

// ── Drive time connector between stops ────────────────────────────
function DriveConnector({ minutes }: { minutes: number }) {
    return (
        <div className={styles.driveConnector}>
            <Car size={13} />
            <span>{minutes} min drive to next stop</span>
        </div>
    )
}

// ── Main itinerary content ────────────────────────────────────────
function ItineraryContent() {
    const params = useSearchParams()
    const router = useRouter()
    const from = params.get("from") || ""
    const to = params.get("to") || ""

    const [departureTime, setDepartureTime] = useState("08:00")

    // Get picked stops from Zustand store
    const pickedStopIds = useRouteStore((s) => s.pickedStopIds)

    // We need the actual stop data — get it from sessionStorage
    // (saved when user clicks "Build Itinerary" on plan page)
    const [pickedStops, setPickedStops] = useState<any[]>([])

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem("routerevel_picked_stops")
            if (stored) {
                setPickedStops(JSON.parse(stored))
            }
        } catch { /* ignore */ }
    }, [])

    const { data, isLoading, error, buildItinerary, reset } = useItinerary()

    // Auto-build on mount if we have stops
    useEffect(() => {
        if (pickedStops.length > 0 && !data && !isLoading) {
            buildItinerary({ from, to, departureTime, stops: pickedStops })
        }
    }, [pickedStops]) // eslint-disable-line

    // Rebuild when departure time changes
    const handleTimeChange = useCallback((newTime: string) => {
        setDepartureTime(newTime)
        if (pickedStops.length > 0) {
            reset()
            buildItinerary({ from, to, departureTime: newTime, stops: pickedStops })
        }
    }, [pickedStops, from, to, buildItinerary, reset])

    // Share itinerary
    const handleShare = useCallback(async () => {
        const text = `🗺️ My RouteRevel itinerary: ${from} → ${to}\n${data?.stops.map((s) => `• ${s.name} (${s.arrivalTime})`).join("\n")}\n\nPlan yours: https://routerevel.netlify.app`
        if (navigator.share) {
            await navigator.share({ title: "RouteRevel Itinerary", text })
        } else {
            await navigator.clipboard.writeText(text)
            alert("Itinerary copied to clipboard!")
        }
    }, [data, from, to])

    // ── No stops selected ──────────────────────────────────────────
    if (pickedStops.length === 0 && !isLoading) {
        return (
            <div className={styles.error}>
                <MapPin size={40} style={{ color: "rgba(255,255,255,0.2)", marginBottom: "8px" }} />
                <p className={styles.errorTitle}>No stops selected</p>
                <p className={styles.errorDesc}>
                    Go back to the plan page and select stops using the checkboxes.
                </p>
                <button className={styles.retryBtn} onClick={() => router.back()}>
                    ← Back to plan
                </button>
            </div>
        )
    }

    return (
        <div className={styles.page}>

            {/* ── Header ── */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className={styles.headerTop}>
                    <button
                        className={styles.backBtn}
                        onClick={() => router.back()}
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <div>
                        <h1 className={styles.headerTitle}>Your Itinerary</h1>
                        <p className={styles.headerSub}>
                            {data ? `${data.stops.length} stops · ${data.summary.totalExtraHrs}h added to trip` : "Building your trip plan..."}
                        </p>
                    </div>
                </div>

                {/* Route pill */}
                <div className={styles.routePill}>
                    <div className={styles.dotGreen} />
                    <span style={{ flex: 1 }}>{from}</span>
                    <Navigation size={13} className={styles.arrowIcon} />
                    <span style={{ flex: 1, textAlign: "right" }}>{to}</span>
                    <MapPin size={13} className={styles.pinAmber} />
                </div>
            </motion.div>

            {/* ── Loading state ── */}
            {isLoading && (
                <div className={styles.loading}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 size={40} style={{ color: "#f39c12" }} />
                    </motion.div>
                    <p className={styles.loadingTitle}>Building your itinerary...</p>
                    <div className={styles.loadingSteps}>
                        {[
                            "Fetching photos from Google Places",
                            "Calculating drive times",
                            "AI generating significance & tips",
                            "Optimising stop order",
                        ].map((step, i) => (
                            <motion.div
                                key={step}
                                className={styles.loadingStep}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.4 }}
                            >
                                <Loader2 size={12} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                                {step}
                            </motion.div>
                        ))}
                    </div>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
            )}

            {/* ── Error state ── */}
            {error && !isLoading && (
                <div className={styles.error}>
                    <AlertTriangle size={36} style={{ color: "#f87171", marginBottom: "8px" }} />
                    <p className={styles.errorTitle}>Could not build itinerary</p>
                    <p className={styles.errorDesc}>{error}</p>
                    <button
                        className={styles.retryBtn}
                        onClick={() => buildItinerary({ from, to, departureTime, stops: pickedStops })}
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* ── Itinerary content ── */}
            {data && !isLoading && (
                <>
                    {/* Departure time selector */}
                    <div className={styles.timeSelector}>
                        <Clock size={16} style={{ color: "#f39c12", flexShrink: 0 }} />
                        <span className={styles.timeSelectorLabel}>
                            Departure time from <strong style={{ color: "#fff" }}>{from}</strong>
                        </span>
                        <input
                            type="time"
                            value={departureTime}
                            onChange={(e) => handleTimeChange(e.target.value)}
                            className={styles.timeInput}
                        />
                    </div>

                    {/* Summary bar */}
                    <motion.div
                        className={styles.summaryBar}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryValue}>{data.stops.length}</span>
                                <span className={styles.summaryLabel}>Stops</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryValue}>
                                    {Math.floor(data.summary.totalVisitMin / 60)}h
                                </span>
                                <span className={styles.summaryLabel}>Sightseeing</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryValue}>
                                    {data.summary.totalExtraHrs}h
                                </span>
                                <span className={styles.summaryLabel}>Added to trip</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryValue}>{data.estimatedArrival}</span>
                                <span className={styles.summaryLabel}>Arrival</span>
                            </div>
                        </div>

                        {/* Feasibility note */}
                        <div className={`${styles.feasibilityNote} ${data.summary.isFeasible ? styles.feasible : styles.notFeasible}`}>
                            {data.summary.isFeasible
                                ? <><CheckCircle2 size={13} style={{ display: "inline", marginRight: "5px" }} />{data.summary.feasibilityNote}</>
                                : <><AlertTriangle size={13} style={{ display: "inline", marginRight: "5px" }} />{data.summary.feasibilityNote}</>
                            }
                        </div>
                    </motion.div>

                    {/* ── Timeline ── */}
                    <div className={styles.timeline}>

                        {/* Source start point */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "10px 14px", borderRadius: "12px", background: "rgba(45,206,137,0.08)", border: "1px solid rgba(45,206,137,0.2)" }}
                        >
                            <div className={styles.dotGreen} />
                            <div>
                                <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.9rem" }}>{from}</div>
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Departure: {data.departureTime}</div>
                            </div>
                        </motion.div>

                        {/* Stop cards with drive connectors */}
                        {data.stops.map((stop, i) => (
                            <div key={stop.placeId}>

                                {/* Drive connector from previous */}
                                {i === 0 ? (
                                    <DriveConnector minutes={stop.driveFromPrevMinutes} />
                                ) : (
                                    <DriveConnector minutes={stop.driveFromPrevMinutes} />
                                )}

                                {/* Timeline item */}
                                <div className={styles.timelineItem}>
                                    <div className={styles.timelineLeft}>
                                        <div className={styles.timeLabel}>
                                            {stop.arrivalTime}
                                        </div>
                                        <div className={styles.timelineDot} />
                                        {i < data.stops.length - 1 && (
                                            <div className={styles.timelineLine} />
                                        )}
                                    </div>

                                    <div className={styles.timelineRight}>
                                        <ItineraryStopCard stop={stop} index={i} />
                                    </div>
                                </div>

                            </div>
                        ))}

                        {/* Destination endpoint */}
                        <DriveConnector minutes={60} />
                        <motion.div
                            className={styles.destination}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: data.stops.length * 0.1 + 0.3 }}
                        >
                            <div className={styles.destDot} />
                            <div>
                                <div className={styles.destText}>You arrive at</div>
                                <div className={styles.destName}>{to}</div>
                            </div>
                            <div className={styles.destTime}>{data.estimatedArrival}</div>
                        </motion.div>

                    </div>

                    {/* ── Sticky CTA bar ── */}
                    <div className={styles.ctaBar}>
                        <a
                            href={data.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ctaNavigate}
                        >
                            <Navigation size={18} />
                            Navigate
                            <ExternalLink size={14} style={{ opacity: 0.7 }} />
                        </a>
                        <ItineraryPDFButton
                            data={data}
                            from={from}
                            to={to}
                            className={styles.ctaPdf}
                        />
                        <button className={styles.ctaShare} onClick={handleShare}>
                            <Share2 size={16} />
                            Share
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default function ItineraryPage() {
    return (
        <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a1929" }}>
                <Loader2 size={32} style={{ color: "#f39c12", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <ItineraryContent />
        </Suspense>
    )
}