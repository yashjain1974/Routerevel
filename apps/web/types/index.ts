// types/index.ts — all RouteRevel types

export interface Stop {
  id: string
  name: string
  description: string
  lat: number
  lng: number
  rating: number
  totalRatings: number
  detourKm: number
  detourMinutes: number
  visitDurationMinutes: number
  category: StopCategory
  openNow: boolean
  openingHours: string[]
  photos: string[]
  aiScore: number
  aiSummary: string
  placeId: string
}

export type StopCategory =
  | "temple"
  | "nature"
  | "monument"
  | "food"
  | "viewpoint"
  | "museum"
  | "dam"
  | "other"

export interface Route {
  id: string
  source: string
  sourceLat: number
  sourceLng: number
  destination: string
  destinationLat: number
  destinationLng: number
  distanceKm: number
  durationMinutes: number
  polyline: string
  stops: Stop[]
  createdAt: string
}

export interface Trip {
  id: string
  routeId: string
  route: Route
  status: TripStatus
  currentLat?: number
  currentLng?: number
  visitedStops: string[]
  startedAt: string
}

export type TripStatus = "planned" | "active" | "completed"

export interface UserPreferences {
  categories: StopCategory[]
  maxDetourKm: number
  minRating: number
}