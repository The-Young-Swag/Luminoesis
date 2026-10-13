import { describe, expect, it } from 'vitest'

import { isModelNotFound, modelUnavailableMessage } from '../geminiErrors'

describe('geminiErrors', () => {
  it('treats 404 as model-not-found regardless of body', () => {
    expect(isModelNotFound(404, '')).toBe(true)
    expect(isModelNotFound(404, 'something else')).toBe(true)
  })

  it('detects retired/unknown-model bodies', () => {
    expect(
      isModelNotFound(
        400,
        '{"error":{"code":404,"message":"models/gemini-2.5-flash is not found","status":"NOT_FOUND"}}',
      ),
    ).toBe(true)
    expect(
      isModelNotFound(400, 'Model gemini-2.5-flash has been retired'),
    ).toBe(true)
    expect(isModelNotFound(400, 'models/gemini-9-flash does not exist')).toBe(
      true,
    )
  })

  it('leaves transient failures alone', () => {
    expect(isModelNotFound(500, 'Internal error')).toBe(false)
    expect(isModelNotFound(429, 'Quota exceeded')).toBe(false)
    expect(isModelNotFound(503, 'Service unavailable')).toBe(false)
  })

  it('keeps the user message plain and non-technical', () => {
    const message = modelUnavailableMessage()
    expect(message).not.toMatch(/404|NOT_FOUND|stack|error/i)
    expect(message.length).toBeGreaterThan(20)
  })
})
