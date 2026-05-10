// server/src/services/aiRanker.ts
// AI ranking service using FREE APIs:
// PRIMARY:  Google Gemini (1,500 req/day free — https://aistudio.google.com)
// FALLBACK: Groq with Llama 3.3 70B (30 req/min free — https://console.groq.com)
//
// Both are completely free with no credit card required.
// Gemini is tried first. If it fails (rate limit/error), Groq is used automatically.

import { GoogleGenerativeAI } from "@google/generative-ai"
import Groq                   from "groq-sdk"
import { RawStop }            from "./corridor"

// ── Client initialization ─────────────────────────────────────────
// Initialized lazily — only created when first needed
let geminiClient: GoogleGenerativeAI | null = null
let groqClient:   Groq | null = null

function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set")
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return geminiClient
}

function getGroq(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set")
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

// ── Types ─────────────────────────────────────────────────────────
export type StopCategory =
  | "temple" | "nature" | "monument" | "food"
  | "viewpoint" | "museum" | "dam" | "other"

export interface RankedStop {
  placeId:              string
  name:                 string
  lat:                  number
  lng:                  number
  rating:               number
  totalRatings:         number
  category:             StopCategory
  openNow:              boolean
  openingHours:         string[]
  photos:               string[]
  aiScore:              number
  aiSummary:            string
  detourKm:             number
  detourMinutes:        number
  visitDurationMinutes: number
  description:          string
}

interface RankingContext {
  from: string
  to:   string
}

// ── Prompt builder ────────────────────────────────────────────────
function buildPrompt(stops: RawStop[], ctx: RankingContext): string {
  const list = stops
    .map((s, i) => `
${i + 1}. placeId: ${s.placeId}
   Name: ${s.name}
   Rating: ${s.rating} (${s.totalRatings} reviews)
   Types: ${s.types.slice(0, 4).join(", ")}
   Open now: ${s.openNow}
   Description: ${s.editorialSummary || "N/A"}
   Area: ${s.vicinity}`.trim())
    .join("\n\n")

  return `You are an expert Indian travel guide.
A traveller is driving from ${ctx.from} to ${ctx.to}.
These places were found along their route. Rank and score them.

Return ONLY a valid JSON array — no markdown, no explanation.
Each object must have exactly these fields:
{
  "placeId": "exact placeId from input",
  "score": 0-100 integer,
  "category": "temple|nature|monument|food|viewpoint|museum|dam|other",
  "summary": "1-2 sentences. Mention ONE unique feature. Be specific.",
  "visitDurationMinutes": 30|45|60|90|120,
  "detourKm": number,
  "detourMinutes": number
}

Scoring:
85-100 = Must visit (unique, culturally significant, highly rated)
70-84  = Worth a stop
55-69  = Nice if passing by
<55    = Skip

PLACES:
${list}`
}

// ── Parse AI response safely ──────────────────────────────────────
function parseAIResponse(text: string): any[] {
  // Remove markdown code blocks if present
  const clean = text
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/gi, "")
    .trim()

  // Try direct parse first
  try {
    return JSON.parse(clean)
  } catch {
    // Try extracting JSON array from response
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    throw new Error("Could not parse AI response as JSON")
  }
}

// ── Merge AI scores with original stop data ───────────────────────
function mergeResults(
  aiResults: any[],
  originalStops: RawStop[]
): RankedStop[] {
  return aiResults
    .map((r: any) => {
      const original = originalStops.find((s) => s.placeId === r.placeId)
      if (!original) return null

      return {
        placeId:              original.placeId,
        name:                 original.name,
        lat:                  original.lat,
        lng:                  original.lng,
        rating:               original.rating,
        totalRatings:         original.totalRatings,
        category:             (r.category || "other") as StopCategory,
        openNow:              original.openNow,
        openingHours:         original.openingHours,
        photos:               original.photos,
        aiScore:              Math.min(100, Math.max(0, parseInt(r.score) || 50)),
        aiSummary:            r.summary || original.editorialSummary || "",
        detourKm:             parseFloat(r.detourKm)             || 0,
        detourMinutes:        parseInt(r.detourMinutes)           || 0,
        visitDurationMinutes: parseInt(r.visitDurationMinutes)    || 60,
        description:          original.editorialSummary           || "",
      } as RankedStop
    })
    .filter(Boolean) as RankedStop[]
}

// ── Fallback: sort by Google rating if AI fails ───────────────────
function ratingFallback(stops: RawStop[]): RankedStop[] {
  console.warn("[AI RANKER] Using rating fallback — both AI providers failed")
  return stops.map((s) => ({
    placeId:              s.placeId,
    name:                 s.name,
    lat:                  s.lat,
    lng:                  s.lng,
    rating:               s.rating,
    totalRatings:         s.totalRatings,
    category:             "other" as StopCategory,
    openNow:              s.openNow,
    openingHours:         s.openingHours,
    photos:               s.photos,
    aiScore:              Math.round(s.rating * 20), // 4.5 → 90
    aiSummary:            s.editorialSummary || `${s.name} — rated ${s.rating}★`,
    detourKm:             0,
    detourMinutes:        0,
    visitDurationMinutes: 60,
    description:          s.editorialSummary || "",
  })).sort((a, b) => b.aiScore - a.aiScore)
}

// ── PRIMARY: Google Gemini ────────────────────────────────────────
async function rankWithGemini(
  stops: RawStop[],
  ctx:   RankingContext
): Promise<RankedStop[]> {
  const gemini = getGemini()
  const model  = gemini.getGenerativeModel({
    model:          "gemini-2.0-flash",   // free tier model
    generationConfig: {
      temperature:      0.2,              // low temp for consistent JSON
      responseMimeType: "application/json",
    },
  })

  const result   = await model.generateContent(buildPrompt(stops, ctx))
  const text     = result.response.text()
  const parsed   = parseAIResponse(text)
  const ranked   = mergeResults(parsed, stops)

  console.log(`✅ [GEMINI] Scored ${ranked.length} stops`)
  return ranked.sort((a, b) => b.aiScore - a.aiScore)
}

// ── FALLBACK: Groq (Llama 3.3 70B) ───────────────────────────────
async function rankWithGroq(
  stops: RawStop[],
  ctx:   RankingContext
): Promise<RankedStop[]> {
  const groq = getGroq()

  const completion = await groq.chat.completions.create({
    model:       "llama-3.3-70b-versatile",  // free model on Groq
    temperature: 0.2,
    messages: [{
      role:    "user",
      content: buildPrompt(stops, ctx),
    }],
    response_format: { type: "json_object" },
  })

  const text   = completion.choices[0]?.message?.content || "[]"
  // Groq with json_object wraps in object — extract array
  let parsed: any[]
  try {
    const obj = JSON.parse(text)
    // Handle both {"stops": [...]} and [...] formats
    parsed = Array.isArray(obj) ? obj : (obj.stops || obj.places || Object.values(obj)[0] || [])
  } catch {
    parsed = parseAIResponse(text)
  }

  const ranked = mergeResults(parsed, stops)
  console.log(`✅ [GROQ] Scored ${ranked.length} stops`)
  return ranked.sort((a, b) => b.aiScore - a.aiScore)
}

// ── Main export: rank stops with AI ──────────────────────────────
// Tries Gemini first → falls back to Groq → falls back to rating sort
export async function rankStopsWithAI(
  stops:   RawStop[],
  context: RankingContext
): Promise<RankedStop[]> {
  if (stops.length === 0) return []

  // Limit to 25 stops to keep prompt manageable and within token limits
  const stopsToRank = stops.slice(0, 25)

  // ── Try Gemini (primary, 1500 req/day free) ────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`🤖 [AI] Trying Gemini for ${stopsToRank.length} stops...`)
      return await rankWithGemini(stopsToRank, context)
    } catch (err) {
      console.warn("[GEMINI] Failed:", err instanceof Error ? err.message : err)
      console.log("   Trying Groq fallback...")
    }
  }

  // ── Try Groq (fallback, 30 req/min free) ──────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      console.log(`🤖 [AI] Trying Groq for ${stopsToRank.length} stops...`)
      return await rankWithGroq(stopsToRank, context)
    } catch (err) {
      console.warn("[GROQ] Failed:", err instanceof Error ? err.message : err)
    }
  }

  // ── Last resort: sort by Google rating ────────────────────────
  return ratingFallback(stopsToRank)
}