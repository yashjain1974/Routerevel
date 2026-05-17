// hooks/useItinerary.ts
// Calls the itinerary API and manages state.

import { useState, useCallback } from "react"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export interface ItineraryStop {
  order:                number
  placeId:              string
  name:                 string
  lat:                  number
  lng:                  number
  category:             string
  rating:               number
  totalRatings:         number
  photos:               string[]
  openingHours:         string[]
  openNow:              boolean
  arrivalTime:          string
  departureTime:        string
  visitDurationMinutes: number
  driveFromPrevMinutes: number
  significance:         string
  visitTip:             string
  bestTimeToVisit:      string
  detourKm:             number
  aiSummary:            string
}

export interface ItineraryData {
  from:             string
  to:               string
  departureTime:    string
  estimatedArrival: string
  stops:            ItineraryStop[]
  summary: {
    totalStops:      number
    totalVisitMin:   number
    totalDriveMin:   number
    totalExtraHrs:   number
    isFeasible:      boolean
    feasibilityNote: string
  }
  googleMapsUrl: string
}

export function useItinerary() {
  const [data,      setData]      = useState<ItineraryData | null>(null)
  const [isLoading, setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const buildItinerary = useCallback(async (payload: {
    from:          string
    to:            string
    departureTime: string
    stops:         any[]
  }) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await axios.post(`${API_URL}/api/itinerary`, payload, {
        timeout: 60000,
      })
      setData(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to build itinerary")
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, isLoading, error, buildItinerary, reset }
}