import { Router } from 'express'
import { z } from 'zod'

import { getFingerprint, getRemaining, consumeUpload, MAX_ONLINE_UPLOADS } from '../../services/tutorQuotaService.js'
import { isModelNotFound, modelUnavailableMessage } from '../../domain/geminiErrors.js'

export const tutorRouter = Router()

const TutorChatSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  selectedText: z.string().trim().max(800).optional(),
  materialId: z.string().trim().min(1).optional(),
  materialTitle: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(4000).optional(),
  concepts: z.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() })).max(8).optional(),
  weakSpots: z.array(z.object({ conceptId: z.string(), conceptName: z.string(), rate: z.number(), total: z.number() })).max(3).optional(),
})

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined
}

/*
 * Model ID is a config value, not a constant. Gemini 2.5 models shut
 * down 16 October 2026 — never use a 2.5 ID here.
 *
 * Default verified against Google's published pricing (free input/output
 * rows for gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite,
 * gemini-3.1-flash-lite as of Aug/Sep 2026; gemini-3.8-flash GA Sep 2026).
 * Model rows are volatile — confirm the exact ID and its free-tier RPM/RPD
 * in AI Studio before relying on it, and override via GEMINI_MODEL.
 */
function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'
}

const GEMINI_TIMEOUT_MS = 60000

type TutorPromptInput = {
  prompt: string
  selectedText?: string
  materialId?: string
  materialTitle?: string
  excerpt?: string
  concepts?: Array<{ id: string; name: string; description?: string }>
  weakSpots?: Array<{ conceptId: string; conceptName: string; rate: number; total: number }>
}

function buildGeminiPrompt(parsed: TutorPromptInput): string {
  // Build Gemini prompt from provider-independent context
  const contextParts: string[] = []
  if (parsed.excerpt) contextParts.push(`Material excerpt:\n${parsed.excerpt.slice(0, 3000)}`)
  if (parsed.selectedText) contextParts.push(`Selected text:\n${parsed.selectedText}`)
  if (parsed.concepts && parsed.concepts.length > 0) {
    contextParts.push(`Concepts: ${parsed.concepts.map((concept) => concept.name).join(', ')}`)
  }
  if (parsed.weakSpots && parsed.weakSpots.length > 0) {
    const weakest = parsed.weakSpots[0]
    if (weakest) {
      contextParts.push(`Weak spot: ${weakest.conceptName} (${Math.round(weakest.rate * 100)}% recall)`)
    }
  }

  return [
    'You are Luminoesis Tutor — a helpful, private learning companion.',
    'Ground answers in the provided material and concepts. Do not fabricate citations.',
    'Keep answers concise and focused on understanding.',
    contextParts.join('\n\n'),
    `Question: ${parsed.prompt}`,
  ].join('\n\n')
}

function geminiBody(prompt: string): Record<string, unknown> {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
  }
}

async function callGemini(
  systemPrompt: string,
  stream: boolean,
  onToken?: (text: string) => void,
): Promise<string> {
  const geminiKey = getGeminiKey()
  if (!geminiKey) {
    throw new Error('Online Tutor is not configured on this server.')
  }

  const model = getGeminiModel()
  const endpoint = stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${geminiKey}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const gemResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody(systemPrompt)),
      signal: controller.signal,
    })

    if (!gemResponse.ok || !gemResponse.body) {
      const errText = await gemResponse.text().catch(() => '')
      console.error('[tutor] gemini error', gemResponse.status, errText.slice(0, 500))
      // A retired or unknown model ID is a config problem, not a user
      // problem: say so plainly, and never burn quota on it (callers only
      // consume quota after a successful answer).
      if (isModelNotFound(gemResponse.status, errText)) {
        throw new Error(modelUnavailableMessage())
      }
      throw new Error('Online Tutor is temporarily unavailable.')
    }

    if (!stream) {
      const data = (await gemResponse.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
      if (!text) throw new Error('Online Tutor returned an empty response.')
      return text
    }

    const reader = gemResponse.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const data = JSON.parse(payload) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          const chunk = data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('') ?? ''
          if (chunk) {
            fullText += chunk
            onToken?.(chunk)
          }
        } catch {
          // Partial JSON across chunk boundaries — keep buffering.
          buffer = `${line}\n${buffer}`
        }
      }
    }

    const text = fullText.trim()
    if (!text) throw new Error('Online Tutor returned an empty response.')
    return text
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Online Tutor timed out. Try again or use local preview.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// GET /tutor/quota — remaining uploads for this anonymous user
tutorRouter.get('/quota', (req, res) => {
  const fingerprint = getFingerprint(req, res)
  res.json({
    remaining: getRemaining(fingerprint),
    limit: MAX_ONLINE_UPLOADS,
    used: MAX_ONLINE_UPLOADS - getRemaining(fingerprint),
  })
})

// POST /tutor/chat — server-mediated Gemini call with quota + validation
tutorRouter.post('/chat', async (req, res) => {
  const parsed = TutorChatSchema.parse(req.body)
  const fingerprint = getFingerprint(req, res)

  const remaining = getRemaining(fingerprint)
  if (remaining <= 0) {
    res.status(429).json({
      error: `You've used all ${MAX_ONLINE_UPLOADS} online Tutor uploads available for this demo. Local AI may still work, and all non-AI learning features continue working.`,
      remaining: 0,
      limit: MAX_ONLINE_UPLOADS,
    })
    return
  }

  // Honest: require key server-side; never expose to browser
  if (!getGeminiKey()) {
    res.status(503).json({
      error:
        'Online Tutor is not configured on this server. Local preview is still available, and all non-AI features continue working.',
      remaining,
      limit: MAX_ONLINE_UPLOADS,
    })
    return
  }

  try {
    const text = await callGemini(buildGeminiPrompt(parsed), false)
    // Quota counts only successful answers — failures stay free.
    consumeUpload(fingerprint)

    res.json({
      text,
      provider: 'gemini',
      citation: parsed.materialId
        ? { materialId: parsed.materialId, materialTitle: parsed.materialTitle ?? 'Material', excerpt: parsed.selectedText?.slice(0, 120) }
        : undefined,
      remaining: getRemaining(fingerprint),
      limit: MAX_ONLINE_UPLOADS,
    })
  } catch (error) {
    console.error('[tutor] unexpected', error)
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Online Tutor failed. Local preview and all non-AI features remain available.',
    })
  }
})

// POST /tutor/chat/stream — same contract, Server-Sent Events of tokens
tutorRouter.post('/chat/stream', async (req, res) => {
  const parsed = TutorChatSchema.parse(req.body)
  const fingerprint = getFingerprint(req, res)

  const remaining = getRemaining(fingerprint)
  if (remaining <= 0) {
    res.status(429).json({
      error: `You've used all ${MAX_ONLINE_UPLOADS} online Tutor uploads available for this demo.`,
      remaining: 0,
      limit: MAX_ONLINE_UPLOADS,
    })
    return
  }

  if (!getGeminiKey()) {
    res.status(503).json({
      error: 'Online Tutor is not configured on this server.',
      remaining,
      limit: MAX_ONLINE_UPLOADS,
    })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  try {
    await callGemini(buildGeminiPrompt(parsed), true, (token) => {
      send({ token })
    })
    // Quota counts only successful answers — failures stay free.
    consumeUpload(fingerprint)
    send({
      done: true,
      citation: parsed.materialId
        ? { materialId: parsed.materialId, materialTitle: parsed.materialTitle ?? 'Material', excerpt: parsed.selectedText?.slice(0, 120) }
        : undefined,
      remaining: getRemaining(fingerprint),
      limit: MAX_ONLINE_UPLOADS,
    })
    res.end()
  } catch (error) {
    send({
      error: error instanceof Error ? error.message : 'Online Tutor failed.',
    })
    res.end()
  }
})
