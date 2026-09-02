import type { TutorConversationMessage } from './tutor'

/*
 * A short follow-up like "Why?", "Can you give the exact ratio?", or "What
 * about the ratio?" carries no subject of its own — it's only meaningful
 * relative to whatever was just discussed. These patterns catch that
 * shape of question so it can be resolved against the conversation
 * instead of treated as a fresh, standalone topic.
 */
const FOLLOW_UP_PATTERNS = [
  /^why\??$/i,
  /^how\??$/i,
  /^(can you )?(explain|elaborate)( (that|this|more))?\??$/i,
  /^what about\b/i,
  /^what does (that|this) mean\??$/i,
  /^(can you )?give (me )?an example\.?$/i,
  /^(can you )?give (me )?(the |an )?(exact|precise|full)\b/i,
  /^(and )?what('s| is) the (exact|precise) /i,
]

export function isReferentFollowUp(question: string): boolean {
  const normalized = question.trim().toLowerCase()
  return FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized))
}

/*
 * Walks backward through the conversation to find what a follow-up is
 * actually about: the most recent user message that either had its own
 * selection, or was itself a standalone (non-follow-up) question. That's
 * the subject a bare "why?" or "give the exact ratio" refers to.
 */
export function resolveConversationalTopic(
  conversationHistory: TutorConversationMessage[],
): string | undefined {
  for (let index = conversationHistory.length - 1; index >= 0; index -= 1) {
    const message = conversationHistory[index]

    if (message.role !== 'user') {
      continue
    }

    if (message.selectedText) {
      return message.selectedText
    }

    if (!isReferentFollowUp(message.text)) {
      return message.text
    }
  }

  return undefined
}

/*
 * The single subject a turn is "about." Used consistently by material
 * retrieval (what to search the document for) and by the local provider
 * (what to check injected material against, and what to tell the model
 * it's continuing) — one resolution, shared, so the two layers can't
 * silently disagree about what's being asked.
 *
 * Selected text always wins — it's the strongest possible signal of
 * intent. Otherwise a follow-up inherits the prior subject; a standalone
 * question is its own subject.
 */
export function resolveEffectiveTopic(
  prompt: string,
  selectedText: string | undefined,
  conversationHistory: TutorConversationMessage[],
): string {
  if (selectedText) {
    return selectedText
  }

  if (isReferentFollowUp(prompt)) {
    return resolveConversationalTopic(conversationHistory) ?? prompt
  }

  return prompt
}
