/**
 * MANUAL model-in-the-loop eval — NOT run in CI (filename deliberately
 * outside vitest's `*.test.*` include).
 *
 * Run: `npm run eval:tutor` (downloads the ~380MB model on first run).
 *
 * Ten fixed cases over two sample materials. Each case runs the REAL
 * provider end to end (worker first, main-thread fallback) and scores:
 *   - the existing validators accept the answer (structural, repetition,
 *     topic-drift), and
 *   - expected key facts appear / failure phrases do not.
 *
 * Greedy decoding makes runs near-deterministic per device; treat the
 * score as a signal, not a gate. Re-run after every prompt or model
 * change and compare against the previous score before merging.
 */
import type { TutorContext } from '../domain/tutor'
import {
  isStructurallyInvalid,
  looksLikeSourceRepetition,
  mentionsPreviousTopicInstead,
} from '../providers/localTutorProvider'
import { localTutorProvider } from '../providers/localTutorProvider'

type ManualCase = {
  name: string
  selectedText?: string
  prompt: string
  mustContain: string[]
  mustNotContain: string[]
}

const MEMORY = [
  'Short-term memory holds information for about 20 seconds before it fades.',
  'Long-term memory can store information for years with little decay.',
  'Repeating information moves it from short-term to long-term memory.',
].join('\n')

const CELLS = [
  'The cell membrane controls what enters and leaves the cell.',
  'Mitochondria produce energy through cellular respiration.',
  'Ribosomes build proteins from messenger RNA instructions.',
].join('\n')

const CASES: ManualCase[] = [
  {
    name: 'define from selection',
    selectedText: MEMORY,
    prompt: 'What is short-term memory?',
    mustContain: ['20 seconds'],
    mustNotContain: ['passage', 'as an AI'],
  },
  {
    name: 'explain from selection',
    selectedText: MEMORY,
    prompt: 'Explain how memories stick around.',
    mustContain: ['long-term'],
    mustNotContain: ['passage'],
  },
  {
    name: 'why question',
    selectedText: CELLS,
    prompt: 'Why does the cell need mitochondria?',
    mustContain: ['energy'],
    mustNotContain: ['passage'],
  },
  {
    name: 'how question',
    selectedText: MEMORY,
    prompt: 'How do I move facts into long-term memory?',
    mustContain: ['Repeat'],
    mustNotContain: ['passage'],
  },
  {
    name: 'compare across bullets',
    selectedText: MEMORY,
    prompt: 'What is the difference between short-term and long-term memory?',
    mustContain: ['20 seconds', 'years'],
    mustNotContain: ['passage'],
  },
  {
    name: 'numbers survive rewording',
    selectedText: CELLS,
    prompt: 'What does the membrane do?',
    mustContain: ['membrane', 'enters'],
    mustNotContain: ['passage'],
  },
  {
    name: 'no fabrication without material',
    prompt: 'What is the capital of Assyria in 1400 BC?',
    mustContain: [],
    mustNotContain: ['passage'],
  },
  {
    name: 'short question still teaches',
    selectedText: CELLS,
    prompt: 'Ribosomes?',
    mustContain: ['protein'],
    mustNotContain: ['passage'],
  },
  {
    name: 'correction turn rephrases',
    selectedText: MEMORY,
    prompt: 'Explain it differently.',
    mustContain: ['memory'],
    mustNotContain: ['passage'],
  },
  {
    name: 'coherent multi-bullet answer',
    selectedText: `${MEMORY}\n${CELLS}`,
    prompt: 'Summarize both passages briefly.',
    mustContain: ['memory', 'cell'],
    mustNotContain: ['passage', 'as an AI'],
  },
]

function buildContext(testCase: ManualCase): TutorContext {
  return {
    material: testCase.selectedText
      ? {
          id: 'eval-material',
          title: 'Eval material',
          excerpt: testCase.selectedText,
          source: 'user',
        }
      : undefined,
    selectedText: testCase.selectedText,
    concepts: [],
    highlights: [],
    reviewHistory: [],
    weakSpots: [],
    conversationHistory: [],
    prompt: testCase.prompt,
  }
}

function scoreCase(testCase: ManualCase, answer: string): string[] {
  const failures: string[] = []
  const lowered = answer.toLowerCase()

  if (isStructurallyInvalid(answer, testCase.prompt)) {
    failures.push('rejected by structural validator')
  }
  if (
    testCase.selectedText &&
    looksLikeSourceRepetition(answer, testCase.selectedText)
  ) {
    failures.push('flagged as source repetition')
  }
  if (
    mentionsPreviousTopicInstead(answer, testCase.selectedText, undefined)
  ) {
    failures.push('flagged as off-topic')
  }
  for (const phrase of testCase.mustContain) {
    if (!lowered.includes(phrase.toLowerCase())) {
      failures.push(`missing "${phrase}"`)
    }
  }
  for (const phrase of testCase.mustNotContain) {
    if (lowered.includes(phrase.toLowerCase())) {
      failures.push(`contains banned "${phrase}"`)
    }
  }
  return failures
}

async function main(): Promise<void> {
  console.log(`Running ${CASES.length} manual eval cases (model loads first)…\n`)
  let passed = 0

  for (const testCase of CASES) {
    const response = await localTutorProvider.respond({
      context: buildContext(testCase),
    })
    const failures = scoreCase(testCase, response.text)
    const ok = failures.length === 0
    if (ok) passed += 1

    console.log(`${ok ? 'PASS' : 'FAIL'}  ${testCase.name} [${response.execution ?? response.provider}]`)
    if (!ok) {
      for (const failure of failures) console.log(`       - ${failure}`)
      console.log(`       > ${response.text.slice(0, 220)}`)
    }
  }

  console.log(`\nScore: ${passed}/${CASES.length}`)
  if (passed < CASES.length) process.exitCode = 1
}

void main()
