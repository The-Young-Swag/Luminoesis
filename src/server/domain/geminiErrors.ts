/*
 * Pure classification of Gemini API failures. A retired or unknown model
 * ID is a server-config problem, not a user problem: it gets a
 * plain-language message and never burns quota (routes consume quota
 * only after a successful answer).
 */

export function isModelNotFound(status: number, bodyText: string): boolean {
  if (status === 404) return true
  return /not_?found|is not found|does not exist|retired|removed|not supported|model .* (unavailable|unknown)/i.test(
    bodyText,
  )
}

export function modelUnavailableMessage(): string {
  return 'The online Tutor model is unavailable right now — your on-device answer below still stands.'
}
