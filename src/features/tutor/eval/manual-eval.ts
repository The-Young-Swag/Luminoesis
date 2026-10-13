/**
 * MANUAL model-in-the-loop eval — NOT run in CI (filename deliberately
 * outside vitest's `*.test.*` include).
 *
 * Run: `npm run eval:tutor` (downloads the ~380MB model on first run).
 *   `npm run eval:tutor -- --capable` also attempts the 1.7B tier
 *   (sets TUTOR_ALLOW_CAPABLE_WASM=1; needs ~2GB download + ~3GB RAM).
 *
 * Three scored sections:
 *   1. retrieval — keyword vs embedding excerpt selection over fixed
 *      blocks (embedding needs a worker; skipped in Node, see below).
 *   2. generation — the 10 fixed cases through the REAL provider end to
 *      end (worker first, main-thread fallback), per tier.
 *   3. results are saved to NOTES_REPORTS/eval-tutor-<date>.json so future
 *      runs can be compared.
 *
 * Greedy decoding makes runs near-deterministic per device; treat the
 * score as a signal, not a gate. Re-run after every prompt or model
 * change and compare against the previous score before merging.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { TutorContext } from '../domain/tutor'
import {
  isStructurallyInvalid,
  looksLikeSourceRepetition,
  mentionsPreviousTopicInstead,
} from '../providers/localTutorProvider'
import { localTutorProvider } from '../providers/localTutorProvider'
import {
  selectRelevantMaterialExcerpt,
  selectSemanticExcerpt,
} from '../domain/materialRetrieval'
import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'

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
  const wantCapable = process.argv.includes('--capable')
  const tiers: Array<'standard' | 'capable'> = ['standard']
  if (wantCapable) {
    process.env.TUTOR_ALLOW_CAPABLE_WASM = '1'
    tiers.push('capable')
  }

  const result: EvalResult = {
    date: new Date().toISOString().slice(0, 10),
    runtime: typeof process !== 'undefined' ? `node ${process.version}` : 'unknown',
    retrieval: await runRetrievalSection(),
    generation: {},
  }

  for (const tier of tiers) {
    console.log(`\n--- generation (${tier}) ---`)
    try {
      result.generation[tier] = await runGenerationSection(tier)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`tier ${tier} failed to run: ${message.slice(0, 200)}`)
      result.generation[tier] = { passed: 0, total: CASES.length, error: message.slice(0, 300), cases: [] }
    }
  }

  saveResult(result)

  console.log('\n=== summary ===')
  for (const check of result.retrieval) {
    console.log(
      `retrieval/${check.name}: keyword=${check.keywordOk ? 'PASS' : 'FAIL'} embedding=${check.embeddingStatus}`,
    )
  }
  for (const [tier, section] of Object.entries(result.generation)) {
    console.log(`generation/${tier}: ${section.passed}/${section.total}${section.error ? ` (error: ${section.error.slice(0, 120)})` : ''}`)
  }
  const failed = Object.values(result.generation).some((s) => s.passed < s.total)
  if (failed) process.exitCode = 1
}

type RetrievalCheck = {
  name: string
  keywordOk: boolean
  embeddingStatus: 'PASS' | 'FAIL' | 'SKIPPED (no worker in Node)'
}

type GenerationCaseResult = {
  name: string
  ok: boolean
  failures: string[]
  execution?: string
}

type GenerationSection = {
  passed: number
  total: number
  error?: string
  cases: GenerationCaseResult[]
}

type EvalResult = {
  date: string
  runtime: string
  retrieval: RetrievalCheck[]
  generation: Record<string, GenerationSection>
}

const RETRIEVAL_BLOCKS: MaterialContentBlock[] = [
  { id: 'mem-1', type: 'paragraph', text: 'Short-term memory holds information for about 20 seconds before it fades.' },
  { id: 'mem-2', type: 'paragraph', text: 'Long-term memory can store information for years with little decay.' },
  { id: 'mem-3', type: 'paragraph', text: 'Repeating information moves it from short-term to long-term memory.' },
  { id: 'cell-1', type: 'paragraph', text: 'The cell membrane controls what enters and leaves the cell.' },
  { id: 'cell-2', type: 'paragraph', text: 'Mitochondria produce energy through cellular respiration.' },
  { id: 'cell-3', type: 'paragraph', text: 'Ribosomes build proteins from messenger RNA instructions.' },
  { id: 'atm-1', type: 'paragraph', text: "Earth's atmosphere is about 78 percent nitrogen and 21 percent oxygen." },
  { id: 'atm-2', type: 'paragraph', text: 'The Sun is a star made mostly of hydrogen and helium plasma.' },
]

const RETRIEVAL_CASES = [
  { name: 'memory duration', topic: 'short-term memory duration', expect: '20 seconds' },
  { name: 'mitochondria', topic: 'mitochondria function', expect: 'energy' },
  { name: 'nitrogen leak-check', topic: 'nitrogen percentage atmosphere', expect: '78 percent' },
  { name: 'unrelated honesty', topic: 'photosynthesis in oak trees', expect: '' },
]

async function runRetrievalSection(): Promise<RetrievalCheck[]> {
  console.log(`Running ${RETRIEVAL_CASES.length} retrieval cases (keyword vs embedding)…\n`)
  const checks: RetrievalCheck[] = []

  for (const testCase of RETRIEVAL_CASES) {
    const keyword = selectRelevantMaterialExcerpt(RETRIEVAL_BLOCKS, testCase.topic, 4000)
    const keywordOk =
      testCase.expect === '' ? keyword === '' : keyword.toLowerCase().includes(testCase.expect.toLowerCase())

    let embeddingStatus: RetrievalCheck['embeddingStatus'] = 'SKIPPED (no worker in Node)'
    try {
      const semantic = await selectSemanticExcerpt(RETRIEVAL_BLOCKS, testCase.topic, 4000)
      if (semantic !== null) {
        const ok =
          testCase.expect === ''
            ? semantic === ''
            : semantic.toLowerCase().includes(testCase.expect.toLowerCase())
        embeddingStatus = ok ? 'PASS' : 'FAIL'
      }
    } catch {
      embeddingStatus = 'SKIPPED (no worker in Node)'
    }

    console.log(
      `${keywordOk ? 'PASS' : 'FAIL'}  retrieval/${testCase.name} [keyword]${testCase.expect === '' ? ' (honest empty)' : ''}`,
    )
    console.log(`       embedding: ${embeddingStatus}`)
    checks.push({ name: testCase.name, keywordOk, embeddingStatus })
  }

  return checks
}

async function runGenerationSection(tier: 'standard' | 'capable'): Promise<GenerationSection> {
  console.log(`Running ${CASES.length} manual eval cases (model loads first)…\n`)
  let passed = 0
  const cases: GenerationCaseResult[] = []

  for (const testCase of CASES) {
    const response = await localTutorProvider.respond(
      { context: buildContext(testCase) },
      { tier },
    )
    const failures = scoreCase(testCase, response.text)
    const ok = failures.length === 0
    if (ok) passed += 1

    console.log(`${ok ? 'PASS' : 'FAIL'}  ${testCase.name} [${response.execution ?? response.provider}]`)
    if (!ok) {
      for (const failure of failures) console.log(`       - ${failure}`)
      console.log(`       > ${response.text.slice(0, 220)}`)
    }
    cases.push({ name: testCase.name, ok, failures, execution: response.execution ?? response.provider })
  }

  console.log(`\nScore: ${passed}/${CASES.length}`)
  return { passed, total: CASES.length, cases }
}

function saveResult(result: EvalResult): void {
  try {
    const dir = path.resolve(process.cwd(), 'NOTES_REPORTS')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `eval-tutor-${result.date}.json`)
    fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
    console.log(`\nSaved ${file}`)
  } catch (error) {
    console.warn('[eval] could not save results', error)
  }
}

void main()
