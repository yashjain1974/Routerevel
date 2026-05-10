// server/src/index.ts
import "dotenv/config"
import express        from "express"
import cors           from "cors"
import helmet         from "helmet"
import compression    from "compression"
import morgan         from "morgan"
import rateLimit      from "express-rate-limit"

// Wrap everything in try/catch so errors are visible
async function startServer() {
  try {
    const { corridorRouter } = await import("./routes/corridor")
    const { healthRouter   } = await import("./routes/health")

    const app  = express()
    const PORT = process.env.PORT || 3001

    app.use(helmet())
    app.use(cors({
      origin:      process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    }))
    app.use(compression())
    app.use(express.json({ limit: "10kb" }))
    app.use(morgan("dev"))

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max:      30,
      message:  { error: "Too many requests. Please wait." },
      standardHeaders: true,
      legacyHeaders:   false,
    })
    app.use("/api/plan-route", limiter)

    app.use("/api", healthRouter)
    app.use("/api", corridorRouter)

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

    app.use((_req, res) => {
      res.status(404).json({ error: "Endpoint not found" })
    })

    app.use((
      err:   Error,
      _req:  express.Request,
      res:   express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[ERROR]", err.message)
      res.status(500).json({
        error:   "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
      })
    })

    app.listen(PORT, () => {
      console.log(`\n🚀 RouteRevel API running`)
      console.log(`   Local:   http://localhost:${PORT}`)
      console.log(`   Health:  http://localhost:${PORT}/api/health`)
      console.log(`   Env:     ${process.env.NODE_ENV || "development"}`)
      console.log(`   CORS:    ${process.env.CLIENT_URL || "http://localhost:3000"}\n`)
    })

  } catch (err) {
    console.error("❌ Failed to start server:", err)
    process.exit(1)
  }
}

startServer()