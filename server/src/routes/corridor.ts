// server/src/routes/corridor.ts
// POST /api/plan-route — core endpoint.
// Flow: validate → cache check → directions → corridor → AI rank → cache → respond.

import { Router, Request, Response } from "express"
import { z }                          from "zod"
import crypto                         from "crypto"
import { getRoute }                   from "../services/directions"
import { fetchCorridorStops }         from "../services/corridor"
import { rankStopsWithAI }            from "../services/aiRanker"
import { cacheGet, cacheSet }         from "../lib/cache"

export const corridorRouter = Router()

// ── Input validation ──────────────────────────────────────────────
const PlanRouteSchema = z.object({
  from:        z.string().min(2).max(100).trim(),
  to:          z.string().min(2).max(100).trim(),
  categories:  z.array(z.string()).optional(),
  maxDetourKm: z.number().min(1).max(50).optional().default(20),
  minRating:   z.number().min(1).max(5).optional().default(3.5),
})

// ── POST /api/plan-route ──────────────────────────────────────────
corridorRouter.post("/plan-route", async (req: Request, res: Response) => {

  // 1 — Validate body
  const parsed = PlanRouteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error:   "Invalid request body",
      details: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const { from, to, categories, maxDetourKm, minRating } = parsed.data

  // 2 — Build cache key
  const cacheKey = `route:v1:${crypto
    .createHash("md5")
    .update(`${from.toLowerCase()}|${to.toLowerCase()}|${maxDetourKm}`)
    .digest("hex")}`

  try {
    // 3 — Cache hit → instant response
    const cached = await cacheGet(cacheKey)
    if (cached) {
      console.log(`✅ [CACHE HIT] ${from} → ${to}`)
      res.json({ ...(cached as object), fromCache: true })
      return
    }

    console.log(`🔍 [FETCHING] ${from} → ${to}`)

    // 4 — Get route from Google Directions API
    const route = await getRoute(from, to)
    if (!route) {
      res.status(422).json({
        error: `Could not find a route between "${from}" and "${to}". Please check city names and try again.`,
      })
      return
    }

    console.log(`🗺  Route: ${route.distanceKm}km, ${route.durationMinutes}min`)

    // 5 — Fetch stops along the corridor
    const rawStops = await fetchCorridorStops({
      polyline:    route.polyline,
      maxDetourKm: maxDetourKm ?? 20,
      minRating:   minRating   ?? 3.5,
      categories,
    })

    if (rawStops.length === 0) {
      res.json({
        route,
        stops:     [],
        fromCache: false,
        message:   "No stops found along this route. Try a longer route or lower the minimum rating.",
      })
      return
    }

    console.log(`🤖 [AI RANKING] ${rawStops.length} stops → Claude scoring...`)

    // 6 — AI ranking with Claude
    const rankedStops = await rankStopsWithAI(rawStops, { from, to })

    // 7 — Build final response
    const response = {
      route,
      stops:     rankedStops.slice(0, 12),
      fromCache: false,
      meta: {
        totalFound: rawStops.length,
        returned:   Math.min(rankedStops.length, 12),
        routeKm:    route.distanceKm,
        routeMin:   route.durationMinutes,
      },
    }

    // 8 — Cache for 24 hours
    const ttl = parseInt(process.env.CACHE_TTL_SECONDS || "86400")
    await cacheSet(cacheKey, response, ttl)

    console.log(`✅ [DONE] Returning ${response.stops.length} stops for ${from} → ${to}`)
    res.json(response)

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error(`❌ [PLAN-ROUTE ERROR] ${from} → ${to}:`, msg)
    res.status(500).json({
      error: "Failed to plan route. Please try again.",
      ...(process.env.NODE_ENV === "development" && { debug: msg }),
    })
  }
})