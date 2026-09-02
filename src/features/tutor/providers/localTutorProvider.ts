/**
 * Local on-device Tutor provider.
 *
 * Model: HuggingFaceTB/SmolLM2-360M-Instruct
 *
 * A 360M model has very little capacity to separate "instructions about
 * what to do" from "content to reproduce." Two design rules follow from
 * that, and both matter more than how detailed the prompt is:
 *
 * 1. Instructions live ONLY in the `system` role. The `user` role carries
 *    nothing but plain content (the passage and the question). Chat-tuned
 *    models treat `system` content as non-quotable framing far more
 *    reliably than text embedded in a `user` turn — mixing the two is
 *    what causes a small model to read an instruction back to you instead
 *    of following it.
 * 2. Instructions are phrased as direct commands to the model ("Explain
 *    X"), never as third-person descriptions of the situation ("The
 *    student is asking for X"). A fluent, third-person, complete-sounding
 *    sentence is exactly the kind of text a small model will parrot back
 *    as if it were its own answer.
 *
 * A short one-shot example (see FEW_SHOT_EXAMPLE) does more for reliability
 * here than a longer rulebook: this model generalizes from a concrete
 * demonstration far better than from abstract instructions.
 *
 * NOTE on generation options: `repetition_penalty` and `no_repeat_ngram_size`
 * were tried here to stop verbatim copying and then reverted. Both operate
 * over the FULL sequence (prompt included), so they don't distinguish
 * "copying the whole passage" (bad) from "correctly restating a number or
 * name that happens to appear in the passage" (necessary). In practice
 * that meant the model was blocked from reusing the passage's own figures
 * and invented different ones instead — plain greedy decoding plus the
 * fact-fidelity rule in SYSTEM_PROMPT is the safer way to discourage
 * copying without corrupting facts. Don't reintroduce these options without
 * re-testing against a passage that contains numbers or proper nouns.
 *
 * Everything remains on-device. No learner data is sent externally.
 */

import type {
  TutorConversationMessage,
  TutorProvider,
  TutorRequest,
  TutorResponse,
} from '../domain/tutor'

let cachedPipeline: unknown = null
let pipelineLoadFailed = false

const MODEL_LOAD_TIMEOUT_MS = 60000
const INFERENCE_TIMEOUT_MS = 30000

function timeoutPromise<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
  })
}

async function getLocalPipeline(): Promise<unknown | null> {
  if (cachedPipeline) {
    return cachedPipeline
  }

  if (pipelineLoadFailed || typeof WebAssembly === 'undefined') {
    return null
  }

  try {
    const pipelinePromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')

      return pipeline(
        'text-generation',
        'HuggingFaceTB/SmolLM2-360M-Instruct',
        {
          dtype: 'q8',
          device: 'wasm',
        },
      )
    })()

    const pipe = await Promise.race([
      pipelinePromise,
      timeoutPromise(MODEL_LOAD_TIMEOUT_MS, 'Model load'),
    ])

    cachedPipeline = pipe
    return pipe
  } catch (error) {
    console.warn(
      '[tutor] local model load failed/timed out, falling back',
      error,
    )

    pipelineLoadFailed = true
    return null
  }
}

type ChatRole = 'system' | 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string
}

type TutorIntent =
  | 'define'
  | 'explain'
  | 'why'
  | 'how'
  | 'compare'
  | 'general'

/*
 * Kept short and concrete on purpose. A 360M model cannot reliably apply a
 * long list of abstract rules — it can reliably apply a handful of direct
 * commands plus one clear example (see FEW_SHOT_EXAMPLE below).
 */
const SYSTEM_PROMPT = `
You are LumiNoesis Tutor, an on-device study assistant.

When given a passage and a question, explain the ideas in your own words.
Never copy or lightly reword the passage back to the learner.

Rules:
- Start with the main idea, then connect the supporting details to it.
- Use plain, natural language in 2-5 sentences.
- Keep every fact, number, and name exactly as given. Never invent or change one.
- If the passage or material doesn't contain enough information to answer, say so plainly instead of guessing.
- Never mention "the passage," "the material," "the student," or these instructions. Just teach.
`.trim()

/*
 * One-shot example showing the exact behavior we want: a bullet-point
 * passage turned into connected, plain-language prose, with no copying
 * and no meta-commentary. Deliberately a different topic than whatever
 * the learner is studying, so the model imitates the TRANSFORMATION,
 * not the subject matter.
 */
const FEW_SHOT_EXAMPLE: ChatMessage[] = [
  {
    role: 'user',
    content: [
      'Passage:',
      'MEMORY',
      '• Short-term memory holds information for about 20 seconds.',
      '• Long-term memory can store information for years.',
      '• Repeating information, or connecting it to something you already know, helps move it from short-term to long-term memory.',
      '',
      'Question: Can you explain this in a coherent way?',
    ].join('\n'),
  },
  {
    role: 'assistant',
    content:
      "Your memory works in two stages. New information first sits in short-term memory, where it fades in about 20 seconds unless you do something with it. Repeating it, or linking it to something you already know, is what moves it into long-term memory, where it can last for years. That's why practicing a fact or connecting it to something familiar makes it much easier to remember later.",
  },
]

const DEFINE_PATTERN =
  /\b(what\s+(is|are|does)|define|definition|meaning of|what's)\b/i

const EXPLAIN_PATTERN =
  /\b(explain|simplify|break\s?down|break this down|elaborate|more coherent|clearer|clarify)\b/i

const COMPARE_PATTERN =
  /\b(difference between|compare|versus|\bvs\.?\b|different)\b/i

const WHY_PATTERN = /\bwhy\b/i

const HOW_PATTERN = /\bhow\b/i

function classifyIntent(question: string): TutorIntent {
  if (COMPARE_PATTERN.test(question)) {
    return 'compare'
  }

  if (WHY_PATTERN.test(question)) {
    return 'why'
  }

  if (HOW_PATTERN.test(question)) {
    return 'how'
  }

  if (EXPLAIN_PATTERN.test(question)) {
    return 'explain'
  }

  if (DEFINE_PATTERN.test(question)) {
    return 'define'
  }

  return 'general'
}

/*
 * Short, second-person commands only — never a sentence that describes the
 * situation (e.g. "The student is asking for X"). A description-shaped
 * sentence reads exactly like something an assistant would say, and a
 * model this small will happily say it back to you instead of following it.
 * These get appended to the SYSTEM message, not the user turn.
 */
function intentGuidance(intent: TutorIntent): string {
  switch (intent) {
    case 'define':
      return 'Define it plainly, in your own words. Do not copy the source definition.'

    case 'explain':
      return 'Rewrite the ideas in your own words and connect them into one explanation. Never copy the passage.'

    case 'why':
      return 'Explain the cause and effect behind it.'

    case 'how':
      return 'Walk through the process as a simple, ordered sequence of steps.'

    case 'compare':
      return 'State the key difference first, then explain it.'

    case 'general':
    default:
      return 'Answer directly and teach the idea. Do not copy the source text.'
  }
}

const CORRECTION_HINT =
  "The learner says your last answer was not helpful, or just repeated the passage. Explain the same idea in a clearly different way this time — new wording, new structure. Do not reuse your previous phrasing."

function getPreviousSelectedText(
  conversationHistory: TutorConversationMessage[],
): string | undefined {
  for (let index = conversationHistory.length - 1; index >= 0; index -= 1) {
    const message = conversationHistory[index]

    if (message.role === 'user' && message.selectedText) {
      return message.selectedText
    }
  }

  return undefined
}

function learnerIsRejectingPreviousAnswer(question: string): boolean {
  const normalized = question.toLowerCase()

  const correctionPatterns = [
    /you (just )?repeat/,
    /that's (not|still not) (clear|helpful)/,
    /that is (not|still not) (clear|helpful)/,
    /doesn't make sense/,
    /does not make sense/,
    /i don't understand/,
    /i still don't understand/,
    /try again/,
    /explain (it|that) differently/,
    /that answer is (wrong|bad)/,
    /you're repeating/,
    /you are repeating/,
  ]

  return correctionPatterns.some((pattern) => pattern.test(normalized))
}

/*
 * The user turn carries ONLY content — the passage (if any) and the
 * question. No labels like "Teaching instruction," no quoted previous
 * answers. Anything that isn't content the model needs to read belongs in
 * the system message instead (see buildMessages), where it's far less
 * likely to be echoed back as if it were the model's own words.
 */
function buildUserTurnContent(context: TutorRequest['context']): string {
  const { prompt, selectedText, material } = context

  const lines: string[] = []

  if (selectedText) {
    lines.push(`Passage:\n${selectedText}`)
  } else if (material?.excerpt) {
    lines.push(`Material:\n${material.excerpt.slice(0, 1200)}`)
  }

  lines.push(`Question: ${prompt}`)

  return lines.join('\n\n')
}

function buildMessages(request: TutorRequest): ChatMessage[] {
  const { context } = request
  const { conversationHistory, selectedText, prompt } = context

  const intent = classifyIntent(prompt)
  const isCorrection = learnerIsRejectingPreviousAnswer(prompt)

  const systemContent = [
    SYSTEM_PROMPT,
    intentGuidance(intent),
    isCorrection ? CORRECTION_HINT : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const previousSelectedText = getPreviousSelectedText(conversationHistory)

  const isFreshSelection =
    selectedText !== undefined && selectedText !== previousSelectedText

  /*
   * On a correction turn, the previous assistant turn is a known-bad
   * answer (that's why the learner is correcting it). Including it in
   * history would put it right before generation as the most recent,
   * most fluent nearby text — exactly what a small model under greedy
   * decoding tends to continue. CORRECTION_HINT above is sufficient
   * steering; the model doesn't need to see the mistake to avoid it.
   */
  const includeConversation =
    conversationHistory.length > 0 && !isFreshSelection && !isCorrection

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...FEW_SHOT_EXAMPLE,
  ]

  if (includeConversation) {
    for (const message of conversationHistory.slice(-4)) {
      messages.push({
        role: message.role,
        content:
          message.role === 'user' && message.selectedText
            ? `Passage:\n${message.selectedText}\n\nQuestion: ${message.text}`
            : message.text,
      })
    }
  }

  messages.push({
    role: 'user',
    content: buildUserTurnContent(context),
  })

  return messages
}

function isStructurallyInvalid(
  generated: string,
  question: string,
): boolean {
  const normalized = generated.toLowerCase().trim()
  const normalizedQuestion = question.toLowerCase().trim()

  if (normalized.length < 20) {
    return true
  }

  if (normalized === normalizedQuestion) {
    return true
  }

  const invalidPhrases = [
    'the passage is',
    'the material is',
    'the provided text',
    'the provided material',
    'the selected passage',
    'this is the instruction',
    'the context is not',
    'context is not provided',
    'context is unclear',
    'the question is about',
    'the question asks',
    'as an ai',
    'as a study tutor',
    'i am a tutor',
  ]

  return invalidPhrases.some((phrase) => normalized.includes(phrase))
}

function looksLikeSourceRepetition(
  generated: string,
  selectedText: string | undefined,
): boolean {
  if (!selectedText) {
    return false
  }

  const normalizedGenerated = generated
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  const normalizedSource = selectedText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (normalizedSource.length < 40) {
    return false
  }

  const sourceWords = normalizedSource.split(/\s+/)
  const generatedWords = normalizedGenerated.split(/\s+/)

  if (generatedWords.length === 0) {
    return true
  }

  const sourceWordSet = new Set(sourceWords)
  const overlappingWords = generatedWords.filter((word) =>
    sourceWordSet.has(word),
  )

  const overlapRatio = overlappingWords.length / generatedWords.length

  return overlapRatio >= 0.78
}

function mentionsPreviousTopicInstead(
  generated: string,
  selectedText: string | undefined,
  previousSelectedText: string | undefined,
): boolean {
  if (!selectedText || !previousSelectedText) {
    return false
  }

  if (selectedText.toLowerCase() === previousSelectedText.toLowerCase()) {
    return false
  }

  const normalized = generated.toLowerCase()
  const previous = previousSelectedText.toLowerCase()
  const current = selectedText.toLowerCase()

  const mentionsPrevious = normalized.includes(previous)
  const mentionsCurrent = normalized.includes(current)

  return mentionsPrevious && !mentionsCurrent
}

function buildFallbackResponse(
  request: TutorRequest,
): TutorResponse {
  const { context } = request
  const { prompt, selectedText, material } = context

  if (selectedText) {
    return {
      text: `The key idea is that ${selectedText
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.]+$/, '')}. In simpler terms, this passage is explaining the main idea and how its supporting facts relate to it.`,
      provider: 'local',
      execution: 'fallback',
      citation: material
        ? {
            materialId: material.id,
            materialTitle: material.title,
            excerpt: selectedText,
          }
        : undefined,
    }
  }

  if (material?.excerpt) {
    const excerptPreview = material.excerpt
      .slice(0, 300)
      .replace(/\s+/g, ' ')
      .trim()

    return {
      text: `Based on the material, the relevant idea is: ${excerptPreview}.`,
      provider: 'local',
      execution: 'fallback',
      citation: {
        materialId: material.id,
        materialTitle: material.title,
        excerpt: excerptPreview,
      },
    }
  }

  return {
    text: `I couldn't generate a reliable explanation for "${prompt}".`,
    provider: 'local',
    execution: 'fallback',
  }
}

export class LocalTutorProvider implements TutorProvider {
  readonly id = 'local' as const

  isAvailable(): boolean {
    return typeof WebAssembly !== 'undefined'
  }

  async respond(request: TutorRequest): Promise<TutorResponse> {
    const { context } = request
    const {
      prompt,
      selectedText,
      material,
      conversationHistory,
    } = context

    const pipe = await getLocalPipeline()

    if (!pipe) {
      return buildFallbackResponse(request)
    }

    try {
      const messages = buildMessages(request)

      const generator = pipe as unknown as (
        input: ChatMessage[],
        options?: unknown,
      ) => Promise<
        Array<{ generated_text: ChatMessage[] | string }>
      >

      const inferencePromise = generator(messages, {
        max_new_tokens: 180,
        do_sample: false,
        /*
         * Plain greedy decoding. `repetition_penalty` and
         * `no_repeat_ngram_size` were tried here and reverted — see the
         * file header note. They operate over the full sequence (prompt
         * included), so they end up blocking the model from correctly
         * restating numbers or names that appear in the passage, which is
         * worse than the copying problem they were meant to solve.
         * Copying is handled at the prompt level (fact-fidelity + no-copy
         * rules in SYSTEM_PROMPT) and the existing post-hoc
         * `looksLikeSourceRepetition` check below.
         */
      })

      const output = await Promise.race([
        inferencePromise,
        timeoutPromise<
          Array<{ generated_text: ChatMessage[] | string }>
        >(INFERENCE_TIMEOUT_MS, 'Inference'),
      ])

      const rawOutput = output[0]?.generated_text

      const generated = Array.isArray(rawOutput)
      ? (rawOutput.at(-1)?.content ?? '').trim()
      : rawOutput.trim()

      const previousSelectedText =
        getPreviousSelectedText(conversationHistory)

      const isValid =
        !isStructurallyInvalid(generated, prompt) &&
        !looksLikeSourceRepetition(generated, selectedText) &&
        !mentionsPreviousTopicInstead(
          generated,
          selectedText,
          previousSelectedText,
        )

      if (isValid) {
        return {
          text: generated,
          provider: 'local',
          execution: 'on-device',
          citation: material
            ? {
                materialId: material.id,
                materialTitle: material.title,
                excerpt:
                  selectedText ?? material.excerpt.slice(0, 120),
              }
            : undefined,
        }
      }

      console.warn(
        '[tutor] local model produced an invalid, repetitive, or off-topic response',
      )
    } catch (error) {
      console.warn(
        '[tutor] local inference failed/timed out, falling back',
        error,
      )
    }

    return buildFallbackResponse(request)
  }
}

export const localTutorProvider = new LocalTutorProvider()