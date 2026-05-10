// server/src/index.ts
// Express app entry point.
// Route mounting fix:
// - healthRouter mounted at "/api" (router handles "/health" internally)
// - corridorRouter mounted at "/api" (router handles "/plan-route" internally)

import "dotenv/config"
import express        from "express"
import cors           from "cors"
import helmet         from "helmet"
import compression    from "compression"
import morgan         from "morgan"
import rateLimit      from "express-rate-limit"
import { corridorRouter } from "./routes/corridor"
import { healthRouter   } from "./routes/health"

const app  = express()
const PORT = process.env.PORT || 3001

// ── Security middleware ───────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}))

// ── Performance middleware ────────────────────────────────────────
app.use(compression())
app.use(express.json({ limit: "10kb" }))
app.use(morgan("dev"))

// ── Rate limiting (protects Google Maps API budget) ───────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max:      30,         // max 30 requests per IP per minute
  message:  { error: "Too many requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use("/api/plan-route", limiter)

// ── Routes ────────────────────────────────────────────────────────
// Both routers mounted at /api — each defines their own sub-paths
app.use("/api", healthRouter)    // → GET  /api/health
app.use("/api", corridorRouter)  // → POST /api/plan-route

// ── Root check ────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name:    "RouteRevel API",
    version: "1.0.0",
    status:  "running",
    endpoints: {
      health:    "GET  /api/health",
      planRoute: "POST /api/plan-route",
    },
  })
})

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" })
})

// ── Global error handler ──────────────────────────────────────────
app.use((
  err:  Error,
  _req: express.Request,
  res:  express.Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: express.NextFunction
) => {
  console.error("[ERROR]", err.message)
  res.status(500).json({
    error:   "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// ── Start server ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 RouteRevel API running`)
  console.log(`   Local:   http://localhost:${PORT}`)
  console.log(`   Health:  http://localhost:${PORT}/api/health`)
  console.log(`   Env:     ${process.env.NODE_ENV || "development"}`)
  console.log(`   CORS:    ${process.env.CLIENT_URL || "http://localhost:3000"}\n`)
})

export default app