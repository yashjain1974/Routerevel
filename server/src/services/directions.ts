// server/src/services/directions.ts
// Calls Google Directions API to get:
// - Encoded polyline of the route
// - Total distance (km) and duration (minutes)
// - Source and destination lat/lng coordinates
//
// The encoded polyline is then sampled in corridor.ts to find stops.

import axios from "axios"

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
const API_KEY        = process.env.GOOGLE_MAPS_API_KEY!

export interface RouteResult {
  polyline:        string   // Google encoded polyline
  distanceKm:      number
  durationMinutes: number
  sourceLat:       number
  sourceLng:       number
  destLat:         number
  destLng:         number
  sourceAddress:   string
  destAddress:     string
}

// Decodes a Google encoded polyline into array of lat/lng points.
// Pure function — no external deps needed for decoding.
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number

    // Decode latitude
    do {
      byte    = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift  += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = result = 0

    // Decode longitude
    do {
      byte    = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift  += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

// Samples points along the decoded polyline every `intervalKm` kilometres.
// Used to create the search centres for Google Places Nearby Search.
export function samplePolyline(
  points: Array<{ lat: number; lng: number }>,
  intervalKm: number = 20
): Array<{ lat: number; lng: number }> {
  if (points.length === 0) return []

  const sampled  = [points[0]]
  let accumulated = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    // Haversine distance between two points
    const dLat  = ((curr.lat - prev.lat) * Math.PI) / 180
    const dLng  = ((curr.lng - prev.lng) * Math.PI) / 180
    const a     = Math.sin(dLat/2)**2
                + Math.cos((prev.lat*Math.PI)/180)
                * Math.cos((curr.lat*Math.PI)/180)
                * Math.sin(dLng/2)**2
    const km    = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    accumulated += km

    if (accumulated >= intervalKm) {
      sampled.push(curr)
      accumulated = 0
    }
  }

  // Always include the last point (destination)
  const last = points[points.length - 1]
  if (sampled[sampled.length - 1] !== last) sampled.push(last)

  return sampled
}

// Main function — calls Google Directions API and returns structured result
export async function getRoute(from: string, to: string): Promise<RouteResult | null> {
  try {
    const response = await axios.get(DIRECTIONS_URL, {
      params: {
        origin:      from,
        destination: to,
        mode:        "driving",
        language:    "en",
        region:      "in",   // bias results to India
        key:         API_KEY,
      },
      timeout: 8000,
    })

    const data = response.data

    // Check API response status
    if (data.status !== "OK" || !data.routes?.length) {
      console.warn(`[DIRECTIONS] Bad status: ${data.status} for "${from}" → "${to}"`)
      return null
    }

    const route = data.routes[0]
    const leg   = route.legs[0]

    return {
      polyline:        route.overview_polyline.points,
      distanceKm:      Math.round(leg.distance.value / 1000),
      durationMinutes: Math.round(leg.duration.value / 60),
      sourceLat:       leg.start_location.lat,
      sourceLng:       leg.start_location.lng,
      destLat:         leg.end_location.lat,
      destLng:         leg.end_location.lng,
      sourceAddress:   leg.start_address,
      destAddress:     leg.end_address,
    }
  } catch (err) {
    console.error("[DIRECTIONS ERROR]", err instanceof Error ? err.message : err)
    return null
  }
}