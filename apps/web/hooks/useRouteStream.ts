// hooks/useRouteStream.ts
// Connects to the SSE streaming endpoint and progressively adds stops
// to the UI as they arrive from the server.
//
// Events received:
//   route  → polyline + distance, draw map immediately
//   status → "Scanning places..." progress messages
//   stop   → individual stop, add to list + map pin animates in
//   done   → all stops received
//   error  → something failed

import { useState, useEffect, useRef, useCallback } from "react"
import { Stop }      from "@/types"
import { RouteData } from "@/types"

interface StreamState {
  route:     RouteData | null
  stops:     Stop[]
  status:    string
  isLoading: boolean
  isDone:    boolean
  error:     string | null
  fromCache: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export function useRouteStream(from: string, to: string) {
  const [state, setState] = useState<StreamState>({
    route:     null,
    stops:     [],
    status:    "",
    isLoading: false,
    isDone:    false,
    error:     null,
    fromCache: false,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const fromRef        = useRef(from)
  const toRef          = useRef(to)

  // Start streaming
  const startStream = useCallback(() => {
    if (!from.trim() || !to.trim()) return

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Reset state
    setState({
      route:     null,
      stops:     [],
      status:    "Connecting...",
      isLoading: true,
      isDone:    false,
      error:     null,
      fromCache: false,
    })

    const url = `${API_URL}/api/plan-route/stream?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    const es  = new EventSource(url)
    eventSourceRef.current = es

    // Route received — draw map immediately
    es.addEventListener("route", (e) => {
      const route = JSON.parse(e.data)
      setState((prev) => ({ ...prev, route, status: "Route found! Loading stops..." }))
    })

    // Status update — show progress message
    es.addEventListener("status", (e) => {
      const { message } = JSON.parse(e.data)
      setState((prev) => ({ ...prev, status: message }))
    })

    // Individual stop — animate it in
    es.addEventListener("stop", (e) => {
      const { stop } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        // Add new stop to list — it appears immediately on map and list
        stops: [...prev.stops, stop],
        status: `Found ${prev.stops.length + 1} stops...`,
      }))
    })

    // All done
    es.addEventListener("done", (e) => {
      const { total, fromCache, meta } = JSON.parse(e.data)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isDone:    true,
        fromCache: fromCache || false,
        status:    fromCache
          ? `${total} stops loaded from cache`
          : `${total} stops found`,
      }))
      es.close()
    })

    // Error
    es.addEventListener("error", (e: any) => {
      let message = "Connection failed. Make sure backend is running."
      try {
        const data = JSON.parse(e.data)
        message = data.message || message
      } catch { /* use default */ }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isDone:    true,
        error:     message,
        status:    "",
      }))
      es.close()
    })

    // Connection error (server unreachable)
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:     "Cannot connect to server. Is it running on localhost:3001?",
        status:    "",
      }))
      es.close()
    }

  }, [from, to])

  // Auto-start when from/to change
  useEffect(() => {
    if (!from.trim() || !to.trim()) return
    if (from === fromRef.current && to === toRef.current && state.isDone) return

    fromRef.current = from
    toRef.current   = to
    startStream()

    // Cleanup on unmount or route change
    return () => {
      eventSourceRef.current?.close()
    }
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    route:     state.route,
    stops:     state.stops,
    status:    state.status,
    isLoading: state.isLoading,
    isDone:    state.isDone,
    error:     state.error,
    fromCache: state.fromCache,
    refetch:   startStream,
  }
}