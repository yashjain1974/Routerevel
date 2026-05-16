// server/src/routes/corridor.ts
// Two endpoints:
// 1. POST /api/plan-route         — original (cached results)
// 2. GET  /api/plan-route/stream  — SSE streaming (progressive results)
//
// SSE flow:
// event: route    → sends polyline + distance immediately (1-2s)
// event: stop     → sends each stop as it's scored (every 3-5s)
// event: done     → signals completion
// event: error    → signals failure

import { Router, Request, Response } from "express"
import { z }                          from "zod"
import crypto                         from "crypto"
import { getRoute }                   from "../services/directions"
import { fetchCorridorStops }         from "../services/corridor"
import { rankStopsWithAIStream }      from "../services/aiRankerStream"
import { rankStopsWithAI }            from "../services/aiRanker"
import { cacheGet, cacheSet }         from "../lib/cache"

export const corridorRouter = Router()

const PlanRouteSchema = z.object({
  from:        z.string().min(2).max(100).trim(),
  to:          z.string().min(2).max(100).trim(),
  categories:  z.array(z.string()).optional(),
  maxDetourKm: z.number().min(1).max(50).optional().default(20),
  minRating:   z.number().min(1).max(5).optional().default(3.5),
})

// ── POST /api/plan-route — original cached endpoint ───────────────
corridorRouter.post("/plan-route", async (req: Request, res: Response) => {
  const parsed = PlanRouteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors })
    return
  }

  const { from, to, maxDetourKm, minRating } = parsed.data

  const cacheKey = `route:v2:${crypto
    .createHash("md5")
    .update(`${from.toLowerCase()}|${to.toLowerCase()}|${maxDetourKm}`)
    .digest("hex")}`

  try {
    const cached = await cacheGet(cacheKey)
    if (cached) {
      console.log(`✅ [CACHE HIT] ${from} → ${to}`)
      res.json({ ...(cached as object), fromCache: true })
      return
    }

    const route = await getRoute(from, to)
    if (!route) {
      res.status(422).json({ error: `Could not find route between "${from}" and "${to}"` })
      return
    }

    const rawStops    = await fetchCorridorStops({ polyline: route.polyline, maxDetourKm: maxDetourKm ?? 20, minRating: minRating ?? 3.5 })
    const rankedStops = await rankStopsWithAI(rawStops, { from, to })

    const response = {
      route,
      stops:     rankedStops.slice(0, 12),
      fromCache: false,
      meta: { totalFound: rawStops.length, returned: Math.min(rankedStops.length, 12), routeKm: route.distanceKm, routeMin: route.durationMinutes },
    }

    await cacheSet(cacheKey, response, parseInt(process.env.CACHE_TTL_SECONDS || "86400"))
    res.json(response)

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error(`❌ [ERROR] ${from} → ${to}:`, msg)
    res.status(500).json({ error: "Failed to plan route", ...(process.env.NODE_ENV === "development" && { debug: msg }) })
  }
})

// ── GET /api/plan-route/stream — SSE streaming endpoint ───────────
// Sends results progressively as they are found
corridorRouter.get("/plan-route/stream", async (req: Request, res: Response) => {
  const from        = (req.query.from as string || "").trim()
  const to          = (req.query.to   as string || "").trim()
  const maxDetourKm = parseInt(req.query.maxDetourKm as string || "20")
  const minRating   = parseFloat(req.query.minRating  as string || "3.5")

  if (!from || !to) {
    res.status(400).json({ error: "from and to are required" })
    return
  }

  // ── Set up SSE headers ──────────────────────────────────────────
  res.setHeader("Content-Type",  "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection",    "keep-alive")
  res.setHeader("X-Accel-Buffering", "no") // disable nginx buffering
  res.flushHeaders()

  // Helper: send SSE event
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    // Force flush — important for streaming to work
    if (typeof (res as any).flush === "function") (res as any).flush()
  }

  // Check cache first — if cached, stream from cache instantly
  const cacheKey = `route:v2:${crypto
    .createHash("md5")
    .update(`${from.toLowerCase()}|${to.toLowerCase()}|${maxDetourKm}`)
    .digest("hex")}`

  try {
    const cached = await cacheGet<any>(cacheKey)
    if (cached) {
      console.log(`✅ [CACHE HIT STREAM] ${from} → ${to}`)
      // Send route immediately
      send("route", cached.route)
      // Stream each stop with small delay for visual effect
      for (let i = 0; i < cached.stops.length; i++) {
        await new Promise((r) => setTimeout(r, 120))
        send("stop", { stop: cached.stops[i], rank: i + 1 })
      }
      send("done", { total: cached.stops.length, fromCache: true, meta: cached.meta })
      res.end()
      return
    }

    // Step 1: Get route polyline — send immediately
    send("status", { message: `Finding route from ${from} to ${to}...`, step: 1 })

    const route = await getRoute(from, to)
    if (!route) {
      send("error", { message: `Could not find route between "${from}" and "${to}"` })
      res.end()
      return
    }

    // Send route polyline immediately — map draws the road right away
    send("route", route)
    send("status", { message: "Scanning places along your route...", step: 2 })

    // Step 2: Fetch corridor stops
    const rawStops = await fetchCorridorStops({
      polyline: route.polyline,
      maxDetourKm,
      minRating,
    })

    if (rawStops.length === 0) {
      send("done", { total: 0, message: "No tourist stops found along this route" })
      res.end()
      return
    }

    send("status", { message: `Found ${rawStops.length} places. AI ranking now...`, step: 3 })

    // Step 3: Stream stops as AI scores them one by one
    let rank = 0
    const allRanked: any[] = []

    await rankStopsWithAIStream(
      rawStops,
      { from, to },
      (stop) => {
        // Called for each stop as AI scores it
        rank++
        allRanked.push(stop)
        send("stop", { stop, rank })
      }
    )

    // Step 4: Done — cache the full result
    const finalResponse = {
      route,
      stops: allRanked,
      fromCache: false,
      meta: {
        totalFound: rawStops.length,
        returned:   allRanked.length,
        routeKm:    route.distanceKm,
        routeMin:   route.durationMinutes,
      },
    }

    await cacheSet(cacheKey, finalResponse, parseInt(process.env.CACHE_TTL_SECONDS || "86400"))
    send("done", { total: allRanked.length, fromCache: false, meta: finalResponse.meta })
    res.end()

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error(`❌ [STREAM ERROR] ${from} → ${to}:`, msg)
    send("error", { message: "Something went wrong. Please try again." })
    res.end()
  }
})