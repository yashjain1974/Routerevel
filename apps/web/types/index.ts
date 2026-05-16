// types/index.ts

export type StopCategory =
  | "temple" | "nature" | "monument" | "food"
  | "viewpoint" | "museum" | "dam" | "other"

export interface Stop {
  id?:      string
  placeId:  string
  name:     string
  lat:      number
  lng:      number
  rating:       number
  totalRatings: number
  openNow:      boolean
  openingHours: string[]
  photos:       string[]
  description:  string
  vicinity?:    string
  category:     StopCategory
  aiScore:              number
  aiSummary:            string
  isHiddenGem?:         boolean   // true = under 500 reviews but uniquely good
  detourKm:             number
  detourMinutes:        number
  visitDurationMinutes: number
}

export interface RouteData {
  polyline:        string
  distanceKm:      number
  durationMinutes: number
  sourceLat:       number
  sourceLng:       number
  destLat:         number
  destLng:         number
  sourceAddress:   string
  destAddress:     string
}

export interface Route {
  id:          string
  source:      string
  destination: string
  routeData:   RouteData
  stops:       Stop[]
  createdAt:   string
}

export type TripStatus = "planned" | "active" | "completed"

export interface Trip {
  id:           string
  routeId:      string
  route:        Route
  status:       TripStatus
  currentLat?:  number
  currentLng?:  number
  visitedStops: string[]
  startedAt:    string
}

export interface UserPreferences {
  categories:  StopCategory[]
  maxDetourKm: number
  minRating:   number
}