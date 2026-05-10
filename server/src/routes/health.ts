// server/src/routes/health.ts
// GET /api/health — server and service status check.

import { Router } from "express"

export const healthRouter = Router()

healthRouter.get("/health", async (_req, res) => {

  // ── Redis check with timeout ──────────────────────────────────
  let redisStatus = "ok ✅"
  try {
    const { redis } = await import("../lib/cache")
    // Race ping against 3s timeout to avoid slow health response
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ping timeout")), 3000)
      ),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // If URL has rediss:// but still failing, give specific hint
    const url = process.env.REDIS_URL || ""
    if (url.startsWith("redis://") && url.includes("upstash")) {
      redisStatus = "⚠ Change redis:// to rediss:// in REDIS_URL for Upstash TLS"
    } else {
      redisStatus = `⚠ ${msg}`
    }
  }

  // ── AI keys check ─────────────────────────────────────────────
  const hasGemini = !!process.env.GEMINI_API_KEY
  const hasGroq   = !!process.env.GROQ_API_KEY

  const aiStatus = hasGemini && hasGroq
    ? "gemini (primary) + groq (fallback) ✅"
    : hasGemini
    ? "gemini only — add GROQ_API_KEY for fallback"
    : hasGroq
    ? "groq only — add GEMINI_API_KEY for primary"
    : "⚠ missing — add GEMINI_API_KEY and GROQ_API_KEY to .env"

  const allOk = redisStatus.includes("✅") || redisStatus === "ok ✅"

  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
    services: {
      redis:      redisStatus,
      googleMaps: process.env.GOOGLE_MAPS_API_KEY ? "configured ✅" : "⚠ missing",
      ai:         aiStatus,
      database:   process.env.DATABASE_URL        ? "configured ✅" : "⚠ missing",
    },
    ready:    allOk,
    nextStep: allOk
      ? "🚀 All systems ready! Try: POST /api/plan-route"
      : "Fix Redis: change redis:// to rediss:// in REDIS_URL for Upstash",
  })
})

healthRouter.delete("/cache/flush", async (_req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Only available in development" })
  }
  const { redis } = await import("../lib/cache")
  await redis.flushall()
  res.json({ message: "Cache flushed successfully" })
})