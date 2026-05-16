// lib/utils.ts
// Shared utility functions used across the entire app.
// Keep this file pure — no React imports, no side effects.

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StopCategory } from "@/types"

// Merges Tailwind classes safely, resolving conflicts.
// Usage: cn("px-4", isActive && "bg-blue-500")
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 400m | 1.8km | 12.5km
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

// 25 min | 1h | 1h 30m
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// 4.3 (1.2k) — used on stop cards and detail sheets
export function formatRating(rating: number, total: number): string {
  const count = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : `${total}`
  return `${rating.toFixed(1)} (${count})`
}

// Maps AI score (0-100) to a human-readable label + color token
export function scoreLabel(score: number): { label: string; color: "green" | "amber" | "blue" | "gray" } {
  if (!score && score !== 0) return { label: "Unranked", color: "gray" }
  if (score >= 85) return { label: "Must visit",      color: "green" }
  if (score >= 70) return { label: "Worth a stop",    color: "amber" }
  if (score >= 55) return { label: "If you have time", color: "blue"  }
  return             { label: "Optional",             color: "gray"  }
}

// Maps stop category to display name and color token for icons/badges
export function categoryMeta(cat: StopCategory): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    temple:    { label: "Temple",    color: "#d97706" },
    nature:    { label: "Nature",    color: "#16a34a" },
    monument:  { label: "Monument",  color: "#2563eb" },
    food:      { label: "Food",      color: "#ea580c" },
    viewpoint: { label: "Viewpoint", color: "#7c3aed" },
    museum:    { label: "Museum",    color: "#4338ca" },
    dam:       { label: "Dam",       color: "#0891b2" },
    other:     { label: "Other",     color: "#64748b" },
  }
  // Fallback to "other" if category is unknown or undefined
  return map[cat] ?? map["other"]
}

// Builds a Google Maps directions deep-link for the "Get Directions" button
export function directionsUrl(lat: number, lng: number, name: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`
}

// Truncates long strings for card previews
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}...`
}

// Simple debounce — used on search inputs to prevent excessive API calls
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}