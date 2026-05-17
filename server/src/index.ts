// server/src/index.ts
import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import morgan from "morgan"
import rateLimit from "express-rate-limit"

async function startServer() {
  try {
    const { corridorRouter } = await import("./routes/corridor")
    const { healthRouter } = await import("./routes/health")
    const { itineraryRouter } = await import("./routes/itinerary")

    const app = express()
    const PORT = process.env.PORT || 3001

    // Trust Railway/Netlify proxy
    app.set("trust proxy", 1)

    app.use(helmet())
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        const allowed = [
          "http://localhost:3000",
          "https://routerevel.netlify.app",
          "https://routerevel.vercel.app",
          process.env.CLIENT_URL,
        ].filter(Boolean)
        if (allowed.includes(origin)) {
          callback(null, true)
        } else {
          console.log(`[CORS] Origin: ${origin}`)
          callback(null, true) // allow all in dev
        }
      },
      credentials: true,
    }))

    app.use(compression())
    app.use(express.json({ limit: "50kb" })) // increased for itinerary payload
    app.use(morgan("dev"))

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: { error: "Too many requests. Please wait." },
      standardHeaders: true,
      legacyHeaders: false,
    })
    app.use("/api/plan-route", limiter)

    // Routes
    app.use("/api", healthRouter)
    app.use("/api", corridorRouter)
    app.use("/api", itineraryRouter)

    app.get("/", (_req, res) => {
      res.json({
        name: "RouteRevel API",
        version: "1.0.0",
        endpoints: {
          health: "GET  /api/health",
          planRoute: "POST /api/plan-route",
          stream: "GET  /api/plan-route/stream",
          itinerary: "POST /api/itinerary",
        },
      })
    })

    app.use((_req, res) => res.status(404).json({ error: "Not found" }))

    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[ERROR]", err.message)
      res.status(500).json({ error: "Internal server error" })
    })

    app.listen(PORT, () => {
      console.log(`\n🚀 RouteRevel API running`)
      console.log(`   Local:   http://localhost:${PORT}`)
      console.log(`   Health:  http://localhost:${PORT}/api/health`)
      console.log(`   Env:     ${process.env.NODE_ENV || "development"}`)
      console.log(`   CORS:    ${process.env.CLIENT_URL || "http://localhost:3000"}\n`)
    })

  } catch (err) {
    console.error("❌ Failed to start:", err)
    process.exit(1)
  }
}

startServer()