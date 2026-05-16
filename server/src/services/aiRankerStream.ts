// server/src/services/aiRankerStream.ts
// Streaming version of AI ranker.
// Instead of waiting for all stops to be scored,
// calls onStop() callback for each stop as soon as it's scored.
//
// Strategy: send stops to AI in small batches of 4-5,
// stream each batch result immediately, then process next batch.
// User sees first stop within ~5 seconds.

import { GoogleGenAI } from "@google/genai"
import Groq            from "groq-sdk"
import { RawStop }     from "./corridor"
import { RankedStop, StopCategory } from "./aiRanker"

let geminiClient: GoogleGenAI | null = null
let groqClient:   Groq | null = null

function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }
  return geminiClient
}

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  }
  return groqClient
}

// Callback type — called for each stop as soon as it's scored
type OnStopCallback = (stop: RankedStop) => void

// ── Build prompt for a small batch ───────────────────────────────
function buildBatchPrompt(
  stops: RawStop[],
  ctx:   { from: string; to: string },
  globalRank: number  // starting rank for this batch
): string {
  const list = stops.map((s, i) => `
${globalRank + i}. placeId: ${s.placeId}
   Name: ${s.name}
   Rating: ${s.rating}/5 (${s.totalRatings} reviews)
   Types: ${s.types.slice(0, 4).join(", ")}
   Open: ${s.openNow}
   About: ${s.editorialSummary || "No description"}
   Area: ${s.vicinity}`.trim()).join("\n\n")

  return `You are an Indian tourism expert. Route: ${ctx.from} → ${ctx.to}.

Evaluate these tourist places. Return ONLY a JSON array.

Each object must have:
{
  "placeId": "exact placeId",
  "include": true/false,
  "score": 0-100,
  "category": "temple|nature|monument|viewpoint|museum|dam|other",
  "summary": "1-2 sentences. ONE specific unique feature.",
  "visitDurationMinutes": 30|45|60|90|120,
  "detourKm": number,
  "detourMinutes": number,
  "isHiddenGem": true/false
}

REJECT (include: false) if: private property, shop, school, hospital, generic area name, under 50 reviews.
KEEP only: temples, monuments, natural attractions, museums, parks, heritage sites.

Score guide: 90+=must visit, 75+=worth stop, 60+=nice if passing, <60=skip.

PLACES:
${list}`
}

// ── Parse batch response ──────────────────────────────────────────
function parseBatch(text: string): any[] {
  const clean = text.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim()
  try {
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    const match = clean.match(/\[[\s\S]*?\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return [] }
    }
    return []
  }
}

// ── Convert AI result + original → RankedStop ────────────────────
function buildRankedStop(r: any, orig: RawStop): RankedStop | null {
  if (!r || r.include === false || (r.score || 0) < 40) return null
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
    aiSummary:            r.summary || orig.editorialSummary || `${orig.name} — ${orig.rating}★`,
    detourKm:             parseFloat(r.detourKm)             || 0,
    detourMinutes:        parseInt(r.detourMinutes)           || 0,
    visitDurationMinutes: parseInt(r.visitDurationMinutes)    || 60,
    description:          orig.editorialSummary               || "",
    isHiddenGem:          r.isHiddenGem === true && orig.totalRatings < 500,
  }
}

// ── Score a batch with Gemini ─────────────────────────────────────
async function scoreBatchGemini(
  batch: RawStop[],
  ctx:   { from: string; to: string },
  rank:  number
): Promise<any[]> {
  const ai       = getGemini()
  const response = await ai.models.generateContent({
    model:    "gemini-2.5-flash",
    contents: buildBatchPrompt(batch, ctx, rank),
    config: { temperature: 0.1, responseMimeType: "application/json" },
  })
  const text = response.text ?? ""
  return parseBatch(text)
}

// ── Score a batch with Groq ───────────────────────────────────────
async function scoreBatchGroq(
  batch: RawStop[],
  ctx:   { from: string; to: string },
  rank:  number
): Promise<any[]> {
  const groq = getGroq()
  const res  = await groq.chat.completions.create({
    model:           "llama-3.3-70b-versatile",
    temperature:     0.1,
    messages:        [{ role: "user", content: buildBatchPrompt(batch, ctx, rank) }],
    response_format: { type: "json_object" },
  })
  const text = res.choices[0]?.message?.content || "[]"
  try {
    const obj = JSON.parse(text)
    return Array.isArray(obj) ? obj : (obj.stops || obj.places || Object.values(obj)[0] || [])
  } catch {
    return parseBatch(text)
  }
}

// ── Main streaming ranker ─────────────────────────────────────────
// Processes stops in batches of 4, streams each result via onStop callback
export async function rankStopsWithAIStream(
  stops:   RawStop[],
  context: { from: string; to: string },
  onStop:  OnStopCallback
): Promise<void> {
  if (stops.length === 0) return

  // Pre-sort by Google quality score
  const quality = stops
    .filter((s) => s.totalRatings >= 30 && s.rating >= 3.5)
    .sort((a, b) => {
      const sa = a.rating * Math.log10(a.totalRatings + 1)
      const sb = b.rating * Math.log10(b.totalRatings + 1)
      return sb - sa
    })
    .slice(0, 25)

  const BATCH_SIZE = 4  // small batches = faster first results
  let globalRank   = 1
  let totalEmitted = 0
  const MAX_STOPS  = 12

  for (let i = 0; i < quality.length && totalEmitted < MAX_STOPS; i += BATCH_SIZE) {
    const batch = quality.slice(i, i + BATCH_SIZE)

    let results: any[] = []

    // Try Gemini first
    if (process.env.GEMINI_API_KEY) {
      try {
        results = await scoreBatchGemini(batch, context, globalRank)
      } catch (err) {
        console.warn(`[STREAM] Gemini batch ${i} failed, trying Groq:`, err instanceof Error ? err.message : err)
      }
    }

    // Groq fallback
    if (results.length === 0 && process.env.GROQ_API_KEY) {
      try {
        results = await scoreBatchGroq(batch, context, globalRank)
      } catch (err) {
        console.warn(`[STREAM] Groq batch ${i} failed:`, err instanceof Error ? err.message : err)
      }
    }

    // Match AI results back to original stops and emit each
    for (const r of results) {
      if (totalEmitted >= MAX_STOPS) break

      const orig = batch.find((s) => s.placeId === r.placeId)
      if (!orig) continue

      const ranked = buildRankedStop(r, orig)
      if (!ranked) continue

      // Emit this stop immediately — frontend adds it to UI right away
      onStop(ranked)
      totalEmitted++
      globalRank++

      // Tiny delay between emits so frontend animations look smooth
      await new Promise((r) => setTimeout(r, 50))
    }

    // Fallback: if AI returned nothing for this batch, emit by rating
    if (results.length === 0) {
      for (const s of batch) {
        if (totalEmitted >= MAX_STOPS) break
        onStop({
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
          aiScore:              Math.round(Math.min(100, s.rating * 15 + Math.log10(s.totalRatings + 1) * 8)),
          aiSummary:            s.editorialSummary || `${s.name} — rated ${s.rating}★`,
          detourKm:             0,
          detourMinutes:        0,
          visitDurationMinutes: 60,
          description:          s.editorialSummary || "",
          isHiddenGem:          s.totalRatings < 300 && s.rating >= 4.2,
        })
        totalEmitted++
        globalRank++
      }
    }

    console.log(`[STREAM] Batch ${Math.floor(i/BATCH_SIZE) + 1}: emitted ${totalEmitted} stops so far`)
  }

  console.log(`[STREAM] ✅ Complete — ${totalEmitted} stops streamed`)
}