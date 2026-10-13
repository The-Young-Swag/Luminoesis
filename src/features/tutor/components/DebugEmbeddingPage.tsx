import { useState } from 'react'

import { PageHeader } from '#/shared/components/ui/PageHeader'
import { isTimingReadoutVisible } from '#/features/tutor/domain/inferenceTiming'
import {
  selectRelevantMaterialExcerpt,
  selectSemanticExcerpt,
} from '#/features/tutor/domain/materialRetrieval'
import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'

/*
 * Browser-side retrieval baseline: the Node eval cannot run embeddings
 * (no Worker there), so keyword-vs-embedding is baselined here, in a real
 * browser, behind the same gate as the timing readout (DEV or
 * ?debug=tutor). Not linked from anywhere in the app.
 */

const BLOCKS: MaterialContentBlock[] = [
  { id: 'mem-1', type: 'paragraph', text: 'Short-term memory holds information for about 20 seconds before it fades.' },
  { id: 'mem-2', type: 'paragraph', text: 'Long-term memory can store information for years with little decay.' },
  { id: 'mem-3', type: 'paragraph', text: 'Repeating information moves it from short-term to long-term memory.' },
  { id: 'cell-1', type: 'paragraph', text: 'The cell membrane controls what enters and leaves the cell.' },
  { id: 'cell-2', type: 'paragraph', text: 'Mitochondria produce energy through cellular respiration.' },
  { id: 'cell-3', type: 'paragraph', text: 'Ribosomes build proteins from messenger RNA instructions.' },
  { id: 'atm-1', type: 'paragraph', text: "Earth's atmosphere is about 78 percent nitrogen and 21 percent oxygen." },
  { id: 'atm-2', type: 'paragraph', text: 'The Sun is a star made mostly of hydrogen and helium plasma.' },
]

const CASES = [
  { name: 'memory duration', topic: 'short-term memory duration', expect: '20 seconds' },
  { name: 'mitochondria', topic: 'mitochondria function', expect: 'energy' },
  { name: 'nitrogen leak-check', topic: 'nitrogen percentage atmosphere', expect: '78 percent' },
  { name: 'unrelated honesty', topic: 'photosynthesis in oak trees', expect: '' },
]

type Row = {
  name: string
  keyword: 'PASS' | 'FAIL'
  embedding: 'PASS' | 'FAIL' | 'SKIPPED'
  keywordMs: number
  embeddingMs: number | null
}

export function DebugEmbeddingPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [running, setRunning] = useState(false)

  if (!isTimingReadoutVisible()) {
    return (
      <div className="page-wrap py-6 md:py-8">
        <PageHeader title="Not available" context="Debug page" />
        <p className="mt-4 text-sm text-(--ink-soft)">
          This page only renders in DEV builds or with ?debug=tutor.
        </p>
      </div>
    )
  }

  async function run() {
    setRunning(true)
    const next: Row[] = []
    for (const testCase of CASES) {
      const keywordStart = performance.now()
      const keyword = selectRelevantMaterialExcerpt(BLOCKS, testCase.topic, 4000)
      const keywordMs = Math.round(performance.now() - keywordStart)
      const keywordOk =
        testCase.expect === ''
          ? keyword === ''
          : keyword.toLowerCase().includes(testCase.expect.toLowerCase())

      let embedding: Row['embedding'] = 'SKIPPED'
      let embeddingMs: Row['embeddingMs'] = null
      try {
        const embedStart = performance.now()
        const semantic = await selectSemanticExcerpt(BLOCKS, testCase.topic, 4000)
        embeddingMs = Math.round(performance.now() - embedStart)
        if (semantic !== null) {
          const ok =
            testCase.expect === ''
              ? semantic === ''
              : semantic.toLowerCase().includes(testCase.expect.toLowerCase())
          embedding = ok ? 'PASS' : 'FAIL'
        }
      } catch {
        embedding = 'SKIPPED'
      }

      next.push({
        name: testCase.name,
        keyword: keywordOk ? 'PASS' : 'FAIL',
        embedding,
        keywordMs,
        embeddingMs,
      })
      setRows([...next])
    }
    setRunning(false)
  }

  const keywordScore = rows?.filter((row) => row.keyword === 'PASS').length ?? 0
  const embeddingScore = rows?.filter((row) => row.embedding === 'PASS').length ?? 0
  const embeddingRan = rows?.some((row) => row.embedding !== 'SKIPPED') ?? false

  return (
    <div className="page-wrap py-6 md:py-8">
      <PageHeader title="Retrieval check" context="Keyword vs embedding · dev only" />

      <p className="mt-4 max-w-xl text-sm leading-6 text-(--ink-soft)">
        Same corpus as the Node eval. Keyword runs inline; embedding loads
        the MiniLM model in the worker on first use. Record both scores in
        NOTES_REPORTS when comparing retrieval changes.
      </p>

      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="btn-primary mt-4"
      >
        {running ? 'Running…' : rows ? 'Run again' : 'Run check'}
      </button>

      {rows && (
        <div className="card-flat mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--line) text-left text-xs text-(--ink-soft)">
                <th className="px-4 py-2.5 font-medium">Case</th>
                <th className="px-4 py-2.5 font-medium">Keyword</th>
                <th className="px-4 py-2.5 font-medium">Embedding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-(--line) last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {row.keyword} · {row.keywordMs}ms
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {row.embedding}
                    {row.embeddingMs !== null ? ` · ${row.embeddingMs}ms` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && !running && (
        <p className="mt-3 font-mono text-xs tabular-nums text-(--ink-soft)">
          keyword {keywordScore}/{rows.length}
          {embeddingRan ? ` · embedding ${embeddingScore}/${rows.length}` : ' · embedding skipped (worker unavailable)'}
        </p>
      )}
    </div>
  )
}
