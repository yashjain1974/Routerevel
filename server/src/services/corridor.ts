// server/src/services/corridor.ts
// Fixed: quality filtering happens AFTER Place Details fetch,
// not during Nearby Search (where data is incomplete).

import axios from "axios"
import { decodePolyline, samplePolyline } from "./directions"

const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
const PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"
const API_KEY           = process.env.GOOGLE_MAPS_API_KEY!

export interface RawStop {
  placeId:          string
  name:             string
  lat:              number
  lng:              number
  rating:           number
  totalRatings:     number
  types:            string[]
  openNow:          boolean
  openingHours:     string[]
  photos:           string[]
  editorialSummary: string
  vicinity:         string
}

// ── Tourist place types to search for ────────────────────────────
// Used in Nearby Search — broader list to cast a wide net first
const SEARCH_TYPES = [
  "tourist_attraction",
  "place_of_worship",
  "museum",
  "natural_feature",
  "park",
  "art_gallery",
  "amusement_park",
  "zoo",
  "aquarium",
  "campground",
  "stadium",
]

// ── Types that definitely mean NOT a tourist destination ──────────
// Applied after detail fetch for accurate filtering
const BLOCKED_TYPES = new Set([
  "locality", "political", "administrative_area_level_1",
  "administrative_area_level_2", "administrative_area_level_3",
  "administrative_area_level_4", "administrative_area_level_5",
  "country", "sublocality", "sublocality_level_1", "sublocality_level_2",
  "route", "street_address", "premise", "subpremise", "neighborhood",
  "real_estate_agency", "school", "hospital", "doctor", "dentist",
  "pharmacy", "bank", "atm", "insurance_agency", "lawyer",
  "accounting", "store", "supermarket", "grocery_or_supermarket",
  "convenience_store", "clothing_store", "shoe_store", "book_store",
  "home_goods_store", "electronics_store", "furniture_store",
  "hardware_store", "car_dealer", "car_repair", "car_wash",
  "gas_station", "parking", "moving_company", "storage",
  "beauty_salon", "hair_care", "laundry", "post_office",
  "police", "fire_station", "local_government_office", "embassy",
  "funeral_home", "gym", "physiotherapist",
])

// ── Minimum quality after detail fetch ───────────────────────────
const MIN_REVIEWS = 30     // minimum Google reviews
const MIN_RATING  = 3.5    // minimum rating

// ── Is this place a genuine tourist destination? ──────────────────
// Called AFTER Place Details fetch — data is complete at this point
function isTouristDestination(stop: Partial<RawStop>): boolean {
  const types = stop.types || []

  // Reject if any blocked type present
  if (types.some((t) => BLOCKED_TYPES.has(t))) return false

  // Must have meaningful reviews
  if ((stop.totalRatings || 0) < MIN_REVIEWS) return false
  if ((stop.rating       || 0) < MIN_RATING)  return false

  return true
}

// ── Nearby search at a single point ──────────────────────────────
async function searchNearby(
  lat:    number,
  lng:    number,
  radius: number = 15000
): Promise<any[]> {
  const seen    = new Set<string>()
  const results: any[] = []

  for (const type of SEARCH_TYPES) {
    try {
      const res = await axios.get(PLACES_NEARBY_URL, {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          language: "en",
          key:      API_KEY,
        },
        timeout: 8000,
      })

      if (res.data.status === "OK") {
        for (const place of res.data.results || []) {
          if (!seen.has(place.place_id)) {
            seen.add(place.place_id)
            results.push(place)
          }
        }
      }
    } catch {
      // Skip failed type silently
    }

    // Small delay between type calls
    await new Promise((r) => setTimeout(r, 80))
  }

  return results
}

// ── Fetch full place details ──────────────────────────────────────
async function getPlaceDetails(placeId: string): Promise<Partial<RawStop> | null> {
  try {
    const res = await axios.get(PLACES_DETAIL_URL, {
      params: {
        place_id: placeId,
        fields: [
          "place_id", "name", "geometry",
          "rating", "user_ratings_total",
          "types", "opening_hours",
          "photos", "editorial_summary",
          "vicinity", "reviews",
        ].join(","),
        language: "en",
        key:      API_KEY,
      },
      timeout: 8000,
    })

    const p = res.data.result
    if (!p) return null

    // Build photo URLs
    const photos = (p.photos || [])
      .slice(0, 3)
      .map((ph: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ph.photo_reference}&key=${API_KEY}`
      )

    // Best available summary
    const topReview = (p.reviews || [])
      .filter((r: any) => r.rating >= 4 && r.text?.length > 30)
      .slice(0, 1)
      .map((r: any) => r.text?.slice(0, 200))
      .join("")

    const summary = p.editorial_summary?.overview || topReview || ""

    return {
      placeId:          p.place_id,
      name:             p.name,
      lat:              p.geometry?.location?.lat,
      lng:              p.geometry?.location?.lng,
      rating:           p.rating             || 0,
      totalRatings:     p.user_ratings_total  || 0,
      types:            p.types               || [],
      openNow:          p.opening_hours?.open_now ?? true,
      openingHours:     p.opening_hours?.weekday_text || [],
      photos,
      editorialSummary: summary,
      vicinity:         p.vicinity || "",
    }
  } catch (err) {
    console.warn("[DETAILS ERROR]", placeId, err instanceof Error ? err.message : err)
    return null
  }
}

// ── Main corridor fetch ───────────────────────────────────────────
interface CorridorOptions {
  polyline:    string
  maxDetourKm: number
  minRating:   number
  categories?: string[]
}

export async function fetchCorridorStops(opts: CorridorOptions): Promise<RawStop[]> {
  const { polyline } = opts

  // Decode + sample polyline every 20km
  const points  = decodePolyline(polyline)
  const samples = samplePolyline(points, 20)

  console.log(`[CORRIDOR] ${samples.length} sample points along route`)

  // Collect nearby places from all sample points
  const seenIds = new Set<string>()
  const allPlaces: any[] = []

  const batchSize = 4
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch   = samples.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((pt) => searchNearby(pt.lat, pt.lng))
    )

    for (const places of results) {
      for (const place of places) {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id)
          allPlaces.push(place)
        }
      }
    }

    if (i + batchSize < samples.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`[CORRIDOR] ${allPlaces.length} unique places found in corridor`)

  if (allPlaces.length === 0) {
    console.warn("[CORRIDOR] No places found — check API key and enabled APIs")
    return []
  }

  // Sort by rating before detail fetch to prioritise quality
  const sorted = allPlaces
    .filter((p) => (p.rating || 0) >= 3.5)  // basic pre-filter
    .sort((a, b) => {
      const scoreA = (a.rating || 0) * Math.log10((a.user_ratings_total || 1) + 1)
      const scoreB = (b.rating || 0) * Math.log10((b.user_ratings_total || 1) + 1)
      return scoreB - scoreA
    })
    .slice(0, 40) // fetch details for top 40

  console.log(`[CORRIDOR] Fetching details for top ${sorted.length} places`)

  // Fetch full details in small parallel batches
  const enriched: RawStop[] = []
  const detailBatch = 5

  for (let i = 0; i < sorted.length; i += detailBatch) {
    const batch   = sorted.slice(i, i + detailBatch)
    const details = await Promise.all(
      batch.map((p) => getPlaceDetails(p.place_id))
    )

    for (const d of details) {
      if (!d || !d.placeId || !d.lat || !d.lng) continue

      // Apply tourist filter AFTER detail fetch — data is complete now
      if (isTouristDestination(d)) {
        enriched.push(d as RawStop)
      } else {
        console.log(`  ⛔ Filtered: ${d.name} (${d.types?.slice(0,3).join(", ")}) — ${d.totalRatings} reviews`)
      }
    }

    if (i + detailBatch < sorted.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`[CORRIDOR] ✅ ${enriched.length} verified tourist stops ready for AI`)
  return enriched
}