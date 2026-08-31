import { Router } from 'express'
import { z } from 'zod'

import { getFingerprint, getRemaining, consumeUpload, MAX_ONLINE_UPLOADS } from '../../services/tutorQuotaService.js'

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

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
  if (!GEMINI_API_KEY) {
    res.status(503).json({
      error:
        'Online Tutor is not configured on this server. Local preview is still available, and all non-AI features continue working.',
      remaining,
      limit: MAX_ONLINE_UPLOADS,
    })
    return
  }

  // Build Gemini prompt from provider-independent context
  const contextParts: string[] = []
  if (parsed.excerpt) contextParts.push(`Material excerpt:\n${parsed.excerpt.slice(0, 3000)}`)
  if (parsed.selectedText) contextParts.push(`Selected text:\n${parsed.selectedText}`)
  if (parsed.concepts && parsed.concepts.length > 0) {
    contextParts.push(`Concepts: ${parsed.concepts.map((concept) => concept.name).join(', ')}`)
  }
  if (parsed.weakSpots && parsed.weakSpots.length > 0) {
    const weakest = parsed.weakSpots[0]
    contextParts.push(`Weak spot: ${weakest.conceptName} (${Math.round(weakest.rate * 100)}% recall)`)
  }

  const systemPrompt = [
    'You are Luminoesis Tutor — a helpful, private learning companion.',
    'Ground answers in the provided material and concepts. Do not fabricate citations.',
    'Keep answers concise and focused on understanding.',
    contextParts.join('\n\n'),
    `Question: ${parsed.prompt}`,
  ].join('\n\n')

  // Payload limits already enforced by zod. Now enforce quota before external call.
  consumeUpload(fingerprint)

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
    const gemResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      }),
    })

    if (!gemResponse.ok) {
      const errText = await gemResponse.text().catch(() => '')
      console.error('[tutor] gemini error', gemResponse.status, errText.slice(0, 500))
      res.status(502).json({ error: 'Online Tutor is temporarily unavailable. Please try local preview or try again later.' })
      return
    }

    const data = await gemResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!text) {
      res.status(502).json({ error: 'Online Tutor returned an empty response. Try again or use local preview.' })
      return
    }

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
    res.status(500).json({ error: 'Online Tutor failed. Local preview and all non-AI features remain available.' })
  }
})
