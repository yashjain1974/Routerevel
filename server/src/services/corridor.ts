// server/src/services/corridor.ts
// Core corridor engine — fetches all places of interest along a route.
//
// Strategy:
// 1. Decode the polyline into lat/lng points
// 2. Sample a point every 20km
// 3. Call Google Places Nearby Search at each point (15km radius)
// 4. Deduplicate by place_id
// 5. Fetch full Place Details for the top 30 candidates
// 6. Return enriched stop objects ready for AI ranking

import axios        from "axios"
import { decodePolyline, samplePolyline } from "./directions"

const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
const PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"
const API_KEY            = process.env.GOOGLE_MAPS_API_KEY!

// Types that map to our Stop interface on the frontend
export interface RawStop {
  placeId:             string
  name:                string
  lat:                 number
  lng:                 number
  rating:              number
  totalRatings:        number
  types:               string[]
  openNow:             boolean
  openingHours:        string[]
  photos:              string[]
  editorialSummary:    string
  vicinity:            string
}

// Place types we want to find along the route
const PLACE_TYPES = [
  "tourist_attraction",
  "place_of_worship",
  "museum",
  "natural_feature",
  "park",
  "hindu_temple",
  "church",
  "mosque",
  "art_gallery",
  "zoo",
]

interface CorridorOptions {
  polyline:    string
  maxDetourKm: number
  minRating:   number
  categories?: string[]
}

// ── Step 1: Nearby search at a single point ───────────────────────
async function searchNearbyPlaces(
  lat:    number,
  lng:    number,
  radius: number = 15000  // 15km in metres
): Promise<any[]> {
  const results: any[] = []

  try {
    // Fetch up to 60 results (3 pages × 20)
    let url         = PLACES_NEARBY_URL
    let pageToken   = ""
    let pageCount   = 0

    do {
      const params: any = {
        location: `${lat},${lng}`,
        radius,
        type:     PLACE_TYPES.join("|"),
        language: "en",
        key:      API_KEY,
      }
      if (pageToken) params.pagetoken = pageToken

      const res  = await axios.get(url, { params, timeout: 6000 })
      const data = res.data

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") break

      results.push(...(data.results || []))

      pageToken = data.next_page_token || ""
      pageCount++

      // Google requires a small delay before using next_page_token
      if (pageToken) await new Promise((r) => setTimeout(r, 2000))

    } while (pageToken && pageCount < 3)

  } catch (err) {
    console.warn("[NEARBY SEARCH ERROR]", err instanceof Error ? err.message : err)
  }

  return results
}

// ── Step 2: Get full place details ────────────────────────────────
async function getPlaceDetails(placeId: string): Promise<Partial<RawStop>> {
  try {
    const res = await axios.get(PLACES_DETAIL_URL, {
      params: {
        place_id: placeId,
        fields: [
          "place_id",
          "name",
          "geometry",
          "rating",
          "user_ratings_total",
          "types",
          "opening_hours",
          "photos",
          "editorial_summary",
          "vicinity",
          "formatted_address",
        ].join(","),
        language: "en",
        key:      API_KEY,
      },
      timeout: 6000,
    })

    const p = res.data.result
    if (!p) return {}

    // Extract photo references (max 3)
    const photos = (p.photos || [])
      .slice(0, 3)
      .map((ph: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ph.photo_reference}&key=${API_KEY}`
      )

    return {
      placeId:          p.place_id,
      name:             p.name,
      lat:              p.geometry?.location?.lat,
      lng:              p.geometry?.location?.lng,
      rating:           p.rating || 0,
      totalRatings:     p.user_ratings_total || 0,
      types:            p.types || [],
      openNow:          p.opening_hours?.open_now ?? true,
      openingHours:     p.opening_hours?.weekday_text || [],
      photos,
      editorialSummary: p.editorial_summary?.overview || "",
      vicinity:         p.vicinity || p.formatted_address || "",
    }
  } catch (err) {
    console.warn("[PLACE DETAILS ERROR]", placeId, err instanceof Error ? err.message : err)
    return {}
  }
}

// ── Main corridor fetch function ──────────────────────────────────
export async function fetchCorridorStops(opts: CorridorOptions): Promise<RawStop[]> {
  const { polyline, minRating } = opts

  // Decode polyline → sample every 20km
  const points  = decodePolyline(polyline)
  const samples = samplePolyline(points, 20)

  console.log(`[CORRIDOR] ${samples.length} sample points along route`)

  // Fetch nearby places at each sample point (parallel, max 5 at a time)
  const seenIds  = new Set<string>()
  const allPlaces: any[] = []

  // Batch requests to avoid hitting rate limits
  const batchSize = 5
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch   = samples.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((pt) => searchNearbyPlaces(pt.lat, pt.lng))
    )

    for (const places of results) {
      for (const place of places) {
        // Deduplicate by place_id
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id)
          allPlaces.push(place)
        }
      }
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < samples.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`[CORRIDOR] ${allPlaces.length} unique places found`)

  // Filter by minimum rating before fetching details (saves API calls)
  const filtered = allPlaces
    .filter((p) => (p.rating || 0) >= minRating)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 40) // top 40 by rating for detail fetch

  console.log(`[CORRIDOR] Fetching details for ${filtered.length} candidates`)

  // Fetch full details for top candidates (parallel, max 5 at a time)
  const enriched: RawStop[] = []

  for (let i = 0; i < filtered.length; i += batchSize) {
    const batch   = filtered.slice(i, i + batchSize)
    const details = await Promise.all(
      batch.map((p) => getPlaceDetails(p.place_id))
    )

    for (const detail of details) {
      if (detail.placeId && detail.lat && detail.lng) {
        enriched.push(detail as RawStop)
      }
    }
  }

  console.log(`[CORRIDOR] ${enriched.length} stops enriched and ready for AI ranking`)
  return enriched
}