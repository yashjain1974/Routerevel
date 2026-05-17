"use client"
// components/itinerary/ItineraryPDF.tsx
// Component-based PDF using @react-pdf/renderer.
// Every element is a proper PDF primitive — Text, View, Image.
// No HTML → PDF conversion. Pixel-perfect, professional output.
//
// Design: Navy + Amber brand, timeline layout,
// Google photos, significance, visit tips, fixed header/footer.

import { useCallback, useState } from "react"
import {
    Document, Page, Text, View, Image,
    StyleSheet, Font, pdf,
} from "@react-pdf/renderer"
import { Download, Loader2 } from "lucide-react"
import { ItineraryData } from "@/hooks/useItinerary"
import { categoryMeta } from "@/lib/utils"
import { StopCategory } from "@/types"

// ── Brand colors ──────────────────────────────────────────────────
const C = {
    navy: "#1B4F72",
    navyDark: "#0D2137",
    navyLight: "#2980B9",
    amber: "#F39C12",
    amberLight: "#F7CE58",
    teal: "#117A65",
    green: "#2DCE89",
    red: "#EF4444",
    white: "#FFFFFF",
    gray100: "#F8F9FF",
    gray200: "#E8E8F0",
    gray400: "#9CA3AF",
    gray600: "#4B5563",
    gray900: "#1A1A2E",
    warning: "#FFFBEB",
    warningBorder: "#F39C12",
}

// Category display
const CAT_LABELS: Record<string, string> = {
    temple: "Temple", nature: "Nature", monument: "Monument",
    viewpoint: "Viewpoint", museum: "Museum", dam: "Dam",
    food: "Food", other: "Place",
}

// Format duration
function fmtDur(min: number): string {
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── PDF StyleSheet ────────────────────────────────────────────────
const S = StyleSheet.create({
    page: {
        backgroundColor: C.white,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: C.gray900,
    },

    // ── Fixed header on every page ─────────────────────────────────
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        backgroundColor: C.navyDark,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 30,
        paddingVertical: 8,
    },
    headerLogo: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: C.white,
    },
    headerLogoAccent: {
        color: C.amber,
    },
    headerTagline: {
        fontSize: 7,
        color: "rgba(255,255,255,0.45)",
        marginTop: 2,
    },
    headerDate: {
        fontSize: 8,
        color: "rgba(255,255,255,0.5)",
        textAlign: "right",
    },

    // ── Fixed footer on every page ─────────────────────────────────
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        backgroundColor: C.navyDark,
        borderTopWidth: 2,
        borderTopColor: C.amber,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 30,
    },
    footerLeft: {
        fontSize: 8,
        color: "rgba(255,255,255,0.4)",
    },
    footerRight: {
        fontSize: 8,
        color: C.amber,
        fontFamily: "Helvetica-Bold",
    },
    pageNumber: {
        position: "absolute",
        bottom: 8,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 7,
        color: "rgba(255,255,255,0.3)",
    },

    // ── Content area (between header and footer) ───────────────────
    content: {
        marginTop: 46,
        marginBottom: 38,
        paddingHorizontal: 30,
    },

    // ── Cover section ──────────────────────────────────────────────
    coverBanner: {
        backgroundColor: C.navy,
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
    coverEndpoint: {
        flex: 1,
    },
    coverLabel: {
        fontSize: 7,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    coverCity: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: C.white,
    },
    coverArrow: {
        fontSize: 20,
        color: "rgba(255,255,255,0.3)",
        paddingHorizontal: 8,
    },
    coverDepartBox: {
        backgroundColor: "rgba(243,156,18,0.15)",
        borderWidth: 1,
        borderColor: "rgba(243,156,18,0.4)",
        borderRadius: 8,
        padding: 10,
        alignItems: "center",
        minWidth: 70,
    },
    coverDepartLabel: {
        fontSize: 7,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
    },
    coverDepartTime: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: C.amber,
        marginTop: 2,
    },

    // ── Stats grid ─────────────────────────────────────────────────
    statsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: C.gray100,
        borderRadius: 8,
        padding: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.gray200,
    },
    statValue: {
        fontSize: 15,
        fontFamily: "Helvetica-Bold",
        color: C.navy,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 7,
        color: C.gray400,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    // ── Feasibility note ───────────────────────────────────────────
    feasNote: {
        padding: 8,
        borderRadius: 6,
        marginBottom: 16,
        borderLeftWidth: 3,
        fontSize: 9,
        fontStyle: "italic",
    },
    feasOk: {
        backgroundColor: "#F0FDF4",
        borderLeftColor: C.green,
        color: "#166534",
    },
    feasWarn: {
        backgroundColor: "#FFF5F5",
        borderLeftColor: C.red,
        color: "#991B1B",
    },

    // ── Section title ──────────────────────────────────────────────
    sectionTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: C.navy,
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingBottom: 6,
        marginBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: C.amber,
    },

    // ── Drive connector ────────────────────────────────────────────
    driveRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginVertical: 8,
    },
    driveLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.gray200,
    },
    driveText: {
        fontSize: 8,
        color: C.gray400,
        fontStyle: "italic",
    },

    // ── Stop card ──────────────────────────────────────────────────
    stopCard: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.gray200,
        overflow: "hidden",
        marginBottom: 6,
    },

    // Card header — navy gradient effect
    stopCardHeader: {
        backgroundColor: C.navy,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    orderCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.amber,
        alignItems: "center",
        justifyContent: "center",
    },
    orderText: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: C.white,
    },
    stopHeaderInfo: {
        flex: 1,
    },
    stopName: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: C.white,
        marginBottom: 3,
    },
    stopMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    stopCatBadge: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 9999,
        paddingVertical: 2,
        paddingHorizontal: 7,
        fontSize: 8,
        color: "rgba(255,255,255,0.75)",
    },
    stopRating: {
        fontSize: 8,
        color: "rgba(255,255,255,0.6)",
    },
    stopOpenBadge: {
        fontSize: 8,
    },

    // Time block in card header
    timeBlock: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 6,
        padding: 8,
        alignItems: "center",
        minWidth: 65,
    },
    timeBlockLabel: {
        fontSize: 7,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
    },
    timeBlockValue: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: C.amber,
        marginTop: 1,
    },
    timeBlockSub: {
        fontSize: 7,
        color: "rgba(255,255,255,0.4)",
        marginTop: 1,
    },

    // Photo strip
    photoStrip: {
        flexDirection: "row",
        height: 130,
        gap: 2,
    },
    photoMain: {
        flex: 2,
        objectFit: "cover",
    },
    photoSide: {
        flex: 1,
        gap: 2,
    },
    photoThumb: {
        flex: 1,
        objectFit: "cover",
    },
    noPhoto: {
        height: 80,
        backgroundColor: C.gray100,
        alignItems: "center",
        justifyContent: "center",
    },
    noPhotoText: {
        fontSize: 8,
        color: C.gray400,
    },

    // Card body
    cardBody: {
        padding: 12,
        backgroundColor: C.gray100,
    },

    // Why visit
    whyLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: C.navy,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    whyText: {
        fontSize: 10,
        color: C.gray600,
        lineHeight: 1.6,
        marginBottom: 10,
    },

    // Tip box
    tipBox: {
        backgroundColor: C.warning,
        borderLeftWidth: 3,
        borderLeftColor: C.amber,
        borderRadius: 5,
        padding: 9,
        marginBottom: 9,
    },
    tipLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#B45309",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    tipText: {
        fontSize: 9,
        color: "#78350F",
        lineHeight: 1.55,
    },

    // Best time
    bestTimeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    bestTimeText: {
        fontSize: 9,
        color: C.gray600,
    },
    bestTimeBold: {
        fontFamily: "Helvetica-Bold",
        color: C.gray900,
    },

    // Destination endpoint
    destBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        backgroundColor: "#FFF5F5",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderLeftWidth: 4,
        borderLeftColor: C.red,
        borderRadius: 8,
        marginTop: 4,
    },
    destDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: C.red,
    },
    destLabel: {
        fontSize: 8,
        color: C.gray400,
    },
    destCity: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: C.gray900,
    },
    destTime: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: C.red,
        marginLeft: "auto",
    },
})

// ── PDF Document component ────────────────────────────────────────
interface PDFDocProps {
    data: ItineraryData
    from: string
    to: string
    today: string
}

function ItineraryDocument({ data, from, to, today }: PDFDocProps) {
    return (
        <Document
            title={`RouteRevel — ${from} to ${to}`}
            author="RouteRevel"
            subject="Trip Itinerary"
            creator="RouteRevel (routerevel.netlify.app)"
        >
            <Page
                size="A4"
                style={S.page}
                wrap
            >
                {/* ── Fixed header (repeats every page) ── */}
                <View style={S.header} fixed>
                    <View>
                        <Text style={S.headerLogo}>
                            Route<Text style={S.headerLogoAccent}>Revel</Text>
                        </Text>
                    </View>
                    <Text style={S.headerDate}>Generated: {today}</Text>
                </View>

                {/* ── Main content ── */}
                <View style={S.content}>

                    {/* Route banner */}
                    <View style={S.coverBanner}>
                        <View style={S.coverEndpoint}>
                            <Text style={S.coverLabel}>From</Text>
                            <Text style={S.coverCity}>{from}</Text>
                        </View>
                        <Text style={S.coverArrow}>→</Text>
                        <View style={S.coverEndpoint}>
                            <Text style={S.coverLabel}>To</Text>
                            <Text style={S.coverCity}>{to}</Text>
                        </View>
                        <View style={S.coverDepartBox}>
                            <Text style={S.coverDepartLabel}>Depart</Text>
                            <Text style={S.coverDepartTime}>{data.departureTime}</Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={S.statsRow}>
                        {[
                            { label: "Total Stops", value: `${data.stops.length}` },
                            { label: "Sightseeing", value: fmtDur(data.summary.totalVisitMin) },
                            { label: "Added to Trip", value: `${data.summary.totalExtraHrs}h` },
                            { label: "Est. Arrival", value: data.estimatedArrival },
                        ].map((s) => (
                            <View key={s.label} style={S.statBox}>
                                <Text style={S.statValue}>{s.value}</Text>
                                <Text style={S.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Feasibility */}
                    <View style={[S.feasNote, data.summary.isFeasible ? S.feasOk : S.feasWarn]}>
                        <Text>{data.summary.isFeasible ? "✓ " : "⚠ "}{data.summary.feasibilityNote}</Text>
                    </View>

                    {/* Section title */}
                    <Text style={S.sectionTitle}>Your Itinerary</Text>

                    {/* Stops */}
                    {data.stops.map((stop, i) => {
                        const catLabel = CAT_LABELS[stop.category] || "Place"
                        const isOpen = stop.openNow

                        return (
                            <View key={stop.placeId} wrap={false}>

                                {/* Drive connector (not before first stop) */}
                                {i > 0 && (
                                    <View style={S.driveRow}>
                                        <View style={S.driveLine} />
                                        <Text style={S.driveText}>
                                            🚗 {stop.driveFromPrevMinutes} min drive
                                        </Text>
                                        <View style={S.driveLine} />
                                    </View>
                                )}

                                {/* Stop card */}
                                <View style={S.stopCard}>

                                    {/* Card header */}
                                    <View style={S.stopCardHeader}>
                                        {/* Order circle */}
                                        <View style={S.orderCircle}>
                                            <Text style={S.orderText}>{stop.order}</Text>
                                        </View>

                                        {/* Stop info */}
                                        <View style={S.stopHeaderInfo}>
                                            <Text style={S.stopName}>{stop.name}</Text>
                                            <View style={S.stopMeta}>
                                                <Text style={S.stopCatBadge}>{catLabel}</Text>
                                                <Text style={S.stopRating}>⭐ {stop.rating.toFixed(1)} ({stop.totalRatings.toLocaleString()})</Text>
                                                <Text style={[S.stopOpenBadge, { color: isOpen ? C.green : C.red }]}>
                                                    {isOpen ? "● Open" : "● Closed"}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Time block */}
                                        <View style={S.timeBlock}>
                                            <Text style={S.timeBlockLabel}>Arrive</Text>
                                            <Text style={S.timeBlockValue}>{stop.arrivalTime}</Text>
                                            <Text style={S.timeBlockSub}>Leave {stop.departureTime}</Text>
                                            <Text style={S.timeBlockSub}>{fmtDur(stop.visitDurationMinutes)}</Text>
                                        </View>
                                    </View>

                                    {/* Photo strip */}
                                    {stop.photos && stop.photos.length > 0 ? (
                                        <View style={S.photoStrip}>
                                            <Image
                                                src={stop.photos[0]}
                                                style={S.photoMain}
                                            />
                                            {stop.photos.length > 1 && (
                                                <View style={S.photoSide}>
                                                    {stop.photos.slice(1, 3).map((photo, pi) => (
                                                        <Image key={pi} src={photo} style={S.photoThumb} />
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={S.noPhoto}>
                                            <Text style={S.noPhotoText}>No photos available</Text>
                                        </View>
                                    )}

                                    {/* Card body */}
                                    <View style={S.cardBody}>

                                        {/* Why visit */}
                                        {stop.significance && (
                                            <View>
                                                <Text style={S.whyLabel}>Why Visit</Text>
                                                <Text style={S.whyText}>{stop.significance}</Text>
                                            </View>
                                        )}

                                        {/* Visit tip */}
                                        {stop.visitTip && (
                                            <View style={S.tipBox}>
                                                <Text style={S.tipLabel}>💡 Visit Tip</Text>
                                                <Text style={S.tipText}>{stop.visitTip}</Text>
                                            </View>
                                        )}

                                        {/* Best time */}
                                        {stop.bestTimeToVisit && (
                                            <View style={S.bestTimeRow}>
                                                <Text style={S.bestTimeText}>
                                                    🌅 <Text style={S.bestTimeBold}>Best time: </Text>
                                                    {stop.bestTimeToVisit}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )
                    })}

                    {/* Destination */}
                    <View style={S.driveRow}>
                        <View style={S.driveLine} />
                        <Text style={S.driveText}>🚗 ~60 min drive</Text>
                        <View style={S.driveLine} />
                    </View>

                    <View style={S.destBox}>
                        <View style={S.destDot} />
                        <View>
                            <Text style={S.destLabel}>You arrive at</Text>
                            <Text style={S.destCity}>{to}</Text>
                        </View>
                        <Text style={S.destTime}>{data.estimatedArrival}</Text>
                    </View>

                </View>

                {/* ── Fixed footer (repeats every page) ── */}
                <View style={S.footer} fixed>
                    <Text style={S.footerLeft}>
                        RouteRevel · Every road has a story. We tell it.
                    </Text>
                    <Text style={S.footerRight}>routerevel.netlify.app</Text>
                </View>

                {/* Page numbers */}
                <Text
                    style={S.pageNumber}
                    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    fixed
                />
            </Page>
        </Document>
    )
}

// ── Download button component ─────────────────────────────────────
interface ItineraryPDFProps {
    data: ItineraryData
    from: string
    to: string
    className?: string
    style?: React.CSSProperties
}

export function ItineraryPDFButton({ data, from, to, className, style }: ItineraryPDFProps) {
    const [loading, setLoading] = useState(false)

    const today = new Date().toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
    })

    const handleDownload = useCallback(async () => {
        setLoading(true)
        try {
            // Generate PDF blob
            const blob = await pdf(
                <ItineraryDocument data={data} from={from} to={to} today={today} />
            ).toBlob()

            // Download it
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `RouteRevel_${from}_to_${to}_Itinerary.pdf`
                .replace(/\s+/g, "_")
            link.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("[PDF] Error:", err)
            alert("PDF generation failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [data, from, to, today])

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className={className}
            style={style}
        >
            {loading
                ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                : <Download size={16} />
            }
            {loading ? "Generating..." : "Download PDF"}
        </button>
    )
}