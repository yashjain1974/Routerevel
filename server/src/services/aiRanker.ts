// server/src/services/aiRanker.ts
// Updated AI prompt:
// - Explicitly filters out non-tourist places
// - Ranks by Google reviews + cultural significance
// - Rejects personal/private/commercial places
// - Focus on places any tourist would want to visit

import { GoogleGenAI } from "@google/genai"
import Groq            from "groq-sdk"
import { RawStop }     from "./corridor"

let geminiClient: GoogleGenAI | null = null
let groqClient:   Groq | null = null

function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set")
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
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
  isHiddenGem:          boolean
}

interface RankingContext { from: string; to: string }

// ── Build strict tourist-focused prompt ───────────────────────────
function buildPrompt(stops: RawStop[], ctx: RankingContext): string {
  const list = stops.map((s, i) => `
${i + 1}. placeId: ${s.placeId}
   Name: ${s.name}
   Google Rating: ${s.rating}/5 (${s.totalRatings} reviews)
   Types: ${s.types.slice(0, 5).join(", ")}
   Open now: ${s.openNow}
   Description: ${s.editorialSummary || "No description"}
   Location: ${s.vicinity}`.trim()).join("\n\n")

  return `You are a strict Indian tourism expert filtering and ranking tourist destinations.

A traveller is driving from ${ctx.from} to ${ctx.to}.

YOUR JOB — two tasks:

TASK 1 — FILTER (very important):
REJECT any place that is:
- A private residence, apartment, or gated community
- A commercial business (shop, mall, hotel, restaurant, petrol station)
- A school, college, hospital, government office
- A generic area name (like a city, district, or neighbourhood)
- A place with fewer than 100 genuine tourist reviews
- Anything that is NOT a publicly accessible tourist destination

ONLY KEEP places that are:
✅ Publicly accessible temples, mosques, churches, gurudwaras
✅ Historical monuments, forts, palaces, ruins
✅ Natural attractions (waterfalls, hills, lakes, forests, viewpoints)
✅ Museums, art galleries, heritage sites
✅ Famous gardens, parks, zoos, sanctuaries
✅ Archaeological sites

TASK 2 — RANK AND SCORE:
For each KEPT place, return a JSON object with:
{
  "placeId": "exact placeId from input",
  "include": true,
  "score": 0-100,
  "category": "temple|nature|monument|viewpoint|museum|dam|other",
  "summary": "2 sentences max. ONE specific unique feature. Why a tourist should stop here.",
  "visitDurationMinutes": 30|45|60|90|120|180,
  "detourKm": estimated km off the highway,
  "detourMinutes": estimated detour driving minutes,
  "isHiddenGem": true if under 500 reviews but genuinely unique
}

For REJECTED places, still include them but with "include": false and score: 0.

SCORING GUIDE (weight Google reviews heavily):
- 90-100: Iconic, must-visit. Famous nationally. 4.5+ stars, 1000+ reviews.
- 75-89:  Excellent tourist spot. 4.0+ stars, 500+ reviews. Worth a detour.
- 60-74:  Good spot. 3.8+ stars, 100+ reviews. Nice if on the way.
- Below 60: Skip.

Return ONLY a valid JSON array. No markdown. No explanation.

PLACES TO EVALUATE:
${list}`
}

// ── Parse response ────────────────────────────────────────────────
function parseAIResponse(text: string): any[] {
  const clean = text.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim()
  try {
    return JSON.parse(clean)
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    throw new Error("Cannot parse AI response")
  }
}

// ── Merge AI results with original data ───────────────────────────
function mergeResults(aiResults: any[], originals: RawStop[]): RankedStop[] {
  return aiResults
    .filter((r) => r.include !== false && r.score > 40) // filter rejected places
    .map((r: any) => {
      const orig = originals.find((s) => s.placeId === r.placeId)
      if (!orig) return null
      return {
        placeId:              orig.placeId,
        name:                 orig.name,
        lat:                  orig.lat,
        lng:                  orig.lng,
        rating:               orig.rating,
        totalRatings:         orig.totalRatings,
        category:             (r.category || "other") as StopCategory,
        openNow:              orig.openNow,
        openingHours:         orig.openingHours,
        photos:               orig.photos,
        aiScore:              Math.min(100, Math.max(0, parseInt(r.score) || 50)),
        aiSummary:            r.summary || orig.editorialSummary || "",
        detourKm:             parseFloat(r.detourKm)             || 0,
        detourMinutes:        parseInt(r.detourMinutes)           || 0,
        visitDurationMinutes: parseInt(r.visitDurationMinutes)    || 60,
        description:          orig.editorialSummary               || "",
        isHiddenGem:          r.isHiddenGem === true && orig.totalRatings < 500,
      } as RankedStop
    })
    .filter(Boolean) as RankedStop[]
}

// ── Rating-based fallback ─────────────────────────────────────────
function ratingFallback(stops: RawStop[]): RankedStop[] {
  console.warn("[AI] Both providers failed — using Google rating fallback")
  return stops
    .filter((s) => s.totalRatings >= 100 && s.rating >= 3.8)
    .map((s) => ({
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
      aiScore:              Math.round(Math.min(100,
        s.rating * 15 + Math.log10(s.totalRatings + 1) * 10
      )),
      aiSummary:            s.editorialSummary || `${s.name} — rated ${s.rating}★ by ${s.totalRatings} visitors`,
      detourKm:             0,
      detourMinutes:        0,
      visitDurationMinutes: 60,
      description:          s.editorialSummary || "",
      isHiddenGem:          s.totalRatings < 300 && s.rating >= 4.2,
    }))
    .sort((a, b) => b.aiScore - a.aiScore)
}

// ── Gemini ranker ─────────────────────────────────────────────────
async function rankWithGemini(stops: RawStop[], ctx: RankingContext): Promise<RankedStop[]> {
  const ai       = getGemini()
  const response = await ai.models.generateContent({
    model:    "gemini-2.5-flash",
    contents: buildPrompt(stops, ctx),
    config: {
      temperature:      0.1,    // very low — we want strict, consistent filtering
      responseMimeType: "application/json",
    },
  })

  const text   = response.text ?? ""
  if (!text) throw new Error("Gemini returned empty response")

  const parsed = parseAIResponse(text)
  const ranked = mergeResults(parsed, stops)
  console.log(`✅ [GEMINI] ${ranked.length} tourist stops after filtering`)
  return ranked.sort((a, b) => b.aiScore - a.aiScore)
}

// ── Groq fallback ─────────────────────────────────────────────────
async function rankWithGroq(stops: RawStop[], ctx: RankingContext): Promise<RankedStop[]> {
  const groq       = getGroq()
  const completion = await groq.chat.completions.create({
    model:       "llama-3.3-70b-versatile",
    temperature: 0.1,
    messages:    [{ role: "user", content: buildPrompt(stops, ctx) }],
    response_format: { type: "json_object" },
  })

  const text = completion.choices[0]?.message?.content || "[]"
  let parsed: any[]
  try {
    const obj = JSON.parse(text)
    parsed = Array.isArray(obj) ? obj : (obj.stops || obj.places || Object.values(obj)[0] || [])
  } catch {
    parsed = parseAIResponse(text)
  }

  const ranked = mergeResults(parsed, stops)
  console.log(`✅ [GROQ] ${ranked.length} tourist stops after filtering`)
  return ranked.sort((a, b) => b.aiScore - a.aiScore)
}

// ── Main export ───────────────────────────────────────────────────
export async function rankStopsWithAI(
  stops:   RawStop[],
  context: RankingContext
): Promise<RankedStop[]> {
  if (stops.length === 0) return []

  // Pre-filter before sending to AI:
  // Only send places with decent Google reviews to avoid wasting AI tokens
  const quality = stops
    .filter((s) => s.totalRatings >= 50 && s.rating >= 3.8)
    .sort((a, b) => {
      // Weighted score: rating × log(reviews)
      const scoreA = a.rating * Math.log10(a.totalRatings + 1)
      const scoreB = b.rating * Math.log10(b.totalRatings + 1)
      return scoreB - scoreA
    })
    .slice(0, 25) // send top 25 to AI

  console.log(`🤖 Sending ${quality.length} quality places to AI for ranking...`)

  // Try Gemini first
  if (process.env.GEMINI_API_KEY) {
    try {
      return await rankWithGemini(quality, context)
    } catch (err) {
      console.warn("[GEMINI] Failed:", err instanceof Error ? err.message : err)
    }
  }

  // Groq fallback
  if (process.env.GROQ_API_KEY) {
    try {
      return await rankWithGroq(quality, context)
    } catch (err) {
      console.warn("[GROQ] Failed:", err instanceof Error ? err.message : err)
    }
  }

  // Last resort
  return ratingFallback(quality)
}