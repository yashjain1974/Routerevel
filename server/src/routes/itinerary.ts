// server/src/routes/itinerary.ts
// POST /api/itinerary
// Takes selected stops + departure time + route info
// Returns: optimized order, arrival times, significance, visit tips, photos

import { Router, Request, Response } from "express"
import { z } from "zod"
import axios from "axios"
import { GoogleGenAI } from "@google/genai"
import Groq from "groq-sdk"

export const itineraryRouter = Router()

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!

// ── Input schema ──────────────────────────────────────────────────
const ItinerarySchema = z.object({
    from: z.string().min(2).max(100),
    to: z.string().min(2).max(100),
    departureTime: z.string().default("08:00"), // HH:MM format
    stops: z.array(z.object({
        placeId: z.string(),
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
        rating: z.number(),
        totalRatings: z.number(),
        category: z.string(),
        detourKm: z.number(),
        detourMinutes: z.number(),
        visitDurationMinutes: z.number(),
        aiSummary: z.string(),
        openingHours: z.array(z.string()),
        openNow: z.boolean(),
        photos: z.array(z.string()).optional(),
    }))
})

// ── Fetch high quality photos from Google Places ──────────────────
async function fetchPlacePhotos(placeId: string): Promise<string[]> {
    try {
        const res = await axios.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            {
                params: {
                    place_id: placeId,
                    fields: "photos",
                    key: API_KEY,
                },
                timeout: 6000,
            }
        )

        const photos = res.data.result?.photos || []
        // Get top 4 photos at higher resolution for itinerary
        return photos.slice(0, 4).map((ph: any) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ph.photo_reference}&key=${API_KEY}`
        )
    } catch {
        return []
    }
}

// ── Get drive time between two points ─────────────────────────────
async function getDriveMinutes(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number
): Promise<number> {
    try {
        const res = await axios.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            {
                params: {
                    origin: `${fromLat},${fromLng}`,
                    destination: `${toLat},${toLng}`,
                    mode: "driving",
                    key: API_KEY,
                },
                timeout: 5000,
            }
        )
        const duration = res.data.routes?.[0]?.legs?.[0]?.duration?.value || 0
        return Math.round(duration / 60)
    } catch {
        // Fallback: estimate from distance
        const distKm = Math.sqrt(
            Math.pow((toLat - fromLat) * 111, 2) +
            Math.pow((toLng - fromLng) * 111, 2)
        )
        return Math.round(distKm * 1.5) // ~40 km/h average
    }
}

// ── Add minutes to HH:MM time string ─────────────────────────────
function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(":").map(Number)
    const total = h * 60 + m + minutes
    const hours = Math.floor(total / 60) % 24
    const mins = total % 60
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

// Format to 12hr time for display
function formatTime(time: string): string {
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
}

// ── AI — generate significance + visit tips ───────────────────────
async function generateSignificance(
    stops: any[],
    ctx: { from: string; to: string }
): Promise<Record<string, { significance: string; visitTip: string; bestTimeToVisit: string }>> {

    const prompt = `You are an expert Indian travel guide with deep knowledge of history, culture, and tourism.

For a trip from ${ctx.from} to ${ctx.to}, the traveller is visiting these places:

${stops.map((s, i) => `
${i + 1}. ${s.name}
   Category: ${s.category}
   Rating: ${s.rating}/5 (${s.totalRatings} reviews)
   About: ${s.aiSummary}
   Opening hours: ${s.openingHours.slice(0, 2).join(", ") || "Not available"}
`).join("")}

For each place return a JSON object with placeId as key:
{
  "PLACE_ID": {
    "significance": "2-3 sentences about WHY this place is historically/culturally/naturally significant. Be specific and compelling. Mention unique facts a tourist would love to know.",
    "visitTip": "1-2 practical sentences: what to see first, what NOT to miss, any hidden spot inside, best photo spot, entry fee if known.",
    "bestTimeToVisit": "Short phrase like 'Early morning (6-8 AM)' or 'Weekday afternoons' or 'Sunrise' with reason in 1 sentence."
  }
}

Return ONLY valid JSON. No markdown. No explanation.`

    try {
        // Try Groq first (faster for this use case)
        if (process.env.GROQ_API_KEY) {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
            const res = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            })
            const text = res.choices[0]?.message?.content || "{}"
            const obj = JSON.parse(text)
            // Handle both direct format and wrapped format
            return obj.places || obj.stops || obj
        }
    } catch (err) {
        console.warn("[ITINERARY AI] Groq failed:", err instanceof Error ? err.message : err)
    }

    try {
        // Gemini fallback
        if (process.env.GEMINI_API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
            const res = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { temperature: 0.3, responseMimeType: "application/json" },
            })
            const text = res.text ?? "{}"
            return JSON.parse(text)
        }
    } catch (err) {
        console.warn("[ITINERARY AI] Gemini failed:", err instanceof Error ? err.message : err)
    }

    // Fallback — use existing summaries
    const fallback: Record<string, any> = {}
    stops.forEach((s) => {
        fallback[s.placeId] = {
            significance: s.aiSummary || `${s.name} is a significant tourist destination rated ${s.rating}★ by ${s.totalRatings} visitors.`,
            visitTip: "Visit during opening hours. Check for entry tickets in advance.",
            bestTimeToVisit: "Early morning to avoid crowds.",
        }
    })
    return fallback
}
// ── POST /api/itinerary ───────────────────────────────────────────
itineraryRouter.post("/itinerary", async (req: Request, res: Response) => {
    const parsed = ItinerarySchema.safeParse(req.body)
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() })
        return
    }

    const { from, to, departureTime, stops } = parsed.data

    if (stops.length === 0) {
        res.status(400).json({ error: "No stops provided" })
        return
    }

    try {
        console.log(`[ITINERARY] Building for ${from} → ${to} with ${stops.length} stops`)

        // Step 1: Fetch photos for all stops in parallel
        console.log("[ITINERARY] Fetching photos...")
        const photosMap: Record<string, string[]> = {}
        await Promise.all(
            stops.map(async (stop) => {
                const photos = await fetchPlacePhotos(stop.placeId)
                photosMap[stop.placeId] = photos.length > 0 ? photos : (stop.photos || [])
            })
        )

        // Step 2: Calculate drive times between consecutive stops
        // Order: from source → stop1 → stop2 → ... → destination
        // Use detourMinutes as approximation, fetch real times for accuracy
        console.log("[ITINERARY] Calculating drive times...")

        // Sort stops by detour distance (approximates travel order)
        const orderedStops = [...stops].sort((a, b) => a.detourKm - b.detourKm)

        // Calculate arrival times
        let currentTime = departureTime
        const stopTimings: Record<string, { arrivalTime: string; departureTime: string; driveFromPrev: number }> = {}

        for (let i = 0; i < orderedStops.length; i++) {
            const stop = orderedStops[i]
            const driveMinutes = stop.detourMinutes * 2 + (i === 0 ? 60 : 30) // approx

            const arrivalTime = addMinutes(currentTime, driveMinutes)
            const departTime = addMinutes(arrivalTime, stop.visitDurationMinutes)

            stopTimings[stop.placeId] = {
                arrivalTime,
                departureTime: departTime,
                driveFromPrev: driveMinutes,
            }

            currentTime = departTime
        }

        const estimatedArrival = addMinutes(currentTime, 60)

        // Step 3: AI generates significance + tips
        console.log("[ITINERARY] Generating AI insights...")
        const aiInsights = await generateSignificance(orderedStops, { from, to })

        // Step 4: Build final itinerary response
        const itineraryStops = orderedStops.map((stop, i) => {
            const timing = stopTimings[stop.placeId]
            const insight = aiInsights[stop.placeId] || {}

            return {
                order: i + 1,
                placeId: stop.placeId,
                name: stop.name,
                lat: stop.lat,
                lng: stop.lng,
                category: stop.category,
                rating: stop.rating,
                totalRatings: stop.totalRatings,
                photos: photosMap[stop.placeId] || [],
                openingHours: stop.openingHours,
                openNow: stop.openNow,

                // Timing
                arrivalTime: formatTime(timing.arrivalTime),
                arrivalTime24: timing.arrivalTime,
                departureTime: formatTime(timing.departureTime),
                departureTime24: timing.departureTime,
                visitDurationMinutes: stop.visitDurationMinutes,
                driveFromPrevMinutes: timing.driveFromPrev,

                // AI content
                significance: insight.significance || stop.aiSummary || "",
                visitTip: insight.visitTip || "",
                bestTimeToVisit: insight.bestTimeToVisit || "Early morning",

                // Original data
                detourKm: stop.detourKm,
                aiSummary: stop.aiSummary,
            }
        })

        // Total trip stats
        const totalVisitMin = orderedStops.reduce((s, stop) => s + stop.visitDurationMinutes, 0)
        const totalDriveMin = orderedStops.reduce((s, stop) => s + stop.detourMinutes * 2, 0)
        const totalExtraHrs = Math.round((totalVisitMin + totalDriveMin) / 60 * 10) / 10
        const isFeasible = totalExtraHrs <= 6

        // Google Maps waypoints URL
        const waypointsStr = orderedStops.map((s) => `${s.lat},${s.lng}`).join("|")
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&waypoints=${waypointsStr}&travelmode=driving`

        res.json({
            from,
            to,
            departureTime: formatTime(departureTime),
            estimatedArrival: formatTime(estimatedArrival),
            stops: itineraryStops,
            summary: {
                totalStops: orderedStops.length,
                totalVisitMin,
                totalDriveMin,
                totalExtraHrs,
                isFeasible,
                feasibilityNote: isFeasible
                    ? `This itinerary adds ~${totalExtraHrs}h to your trip. Very doable in one day!`
                    : `This adds ~${totalExtraHrs}h to your trip. Consider removing ${Math.ceil(totalExtraHrs - 5)} stop(s) or planning an overnight halt.`,
            },
            googleMapsUrl,
        })

    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        console.error("[ITINERARY ERROR]", msg)
        res.status(500).json({ error: "Failed to build itinerary", debug: msg })
    }
})