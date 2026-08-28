import { useMemo, useRef, useState } from 'react'
import { ClipboardCheck, ClipboardList, Plus, Trash2 } from 'lucide-react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { useQuestions } from '#/features/quiz/hooks/useQuestions'
import { useQuizAttempts } from '#/features/quiz/hooks/useQuizAttempts'
import { buildQuiz, submitQuizAttempt } from '#/features/quiz/application/quiz'
import type {
  SubmitQuizAnswer,
  SubmitQuizResult,
} from '#/features/quiz/application/quiz'
import { deleteQuestion } from '#/features/quiz/application/question'
import { SectionHeader } from '#/shared/components/ui/SectionHeader'
import { EmptyState } from '#/shared/components/ui/EmptyState'
import { QuizSetupDialog } from '#/features/quiz/components/QuizSetupDialog'
import { QuizRunner } from '#/features/quiz/components/QuizRunner'
import { QuizResults } from '#/features/quiz/components/QuizResults'
import { AddQuestionDialog } from '#/features/quiz/components/AddQuestionDialog'

type QuizSectionProps = {
  learningSpaceId: string
  concepts: Concept[]
}

type Phase = 'idle' | 'setup' | 'running' | 'results'

export function QuizSection({ learningSpaceId, concepts }: QuizSectionProps) {
  const conceptIds = useMemo(() => concepts.map((concept) => concept.id), [concepts])
  const { questions } = useQuestions(conceptIds)
  const { attempts } = useQuizAttempts(learningSpaceId)

  const [phase, setPhase] = useState<Phase>('idle')
  const [session, setSession] = useState<typeof questions>([])
  const [result, setResult] = useState<SubmitQuizResult | null>(null)
  const [scopeIds, setScopeIds] = useState<string[]>(conceptIds)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const startedAtRef = useRef<number>(Date.now())

  const conceptTitleById = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept.name])),
    [concepts],
  )

  function startSetup() {
    setScopeIds(conceptIds)
    setPhase('setup')
  }

  function beginQuiz(config: { conceptIds: string[]; limit: number }) {
    setScopeIds(config.conceptIds)
    startedAtRef.current = Date.now()
    const built = buildQuiz({
      conceptIds: config.conceptIds,
      questions,
      limit: config.limit,
    })
    setSession(built)
    setPhase('running')
  }

  async function completeQuiz(answers: SubmitQuizAnswer[]) {
    const outcome = await submitQuizAttempt({
      learningSpaceId,
      conceptIds: scopeIds,
      startedAt: startedAtRef.current,
      answers,
    })
    setResult(outcome)
    setPhase('results')
  }

  function reset() {
    setPhase('idle')
    setSession([])
    setResult(null)
  }

  const hasConcepts = concepts.length > 0
  const hasQuestions = questions.length > 0

  return (
    <section id="practice" className="scroll-mt-24">
      <SectionHeader
        icon={ClipboardCheck}
        title="Practice"
        description={
          hasQuestions
            ? `${questions.length} question${questions.length === 1 ? '' : 's'} in this space.`
            : 'Add questions to concepts to start practicing.'
        }
        action={
          <button
            type="button"
            onClick={startSetup}
            disabled={!hasConcepts || !hasQuestions}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start quiz
          </button>
        }
      />

      {!hasConcepts ? (
        <EmptyState
          icon={ClipboardList}
          title="Concepts come first"
          description="Practice questions are tied to concepts. Add a concept to this Learning Space before writing questions."
        />
      ) : (
        <>
          {attempts.length > 0 && (
            <div className="card-flat mb-6 p-6">
              <h3 className="mono-label text-(--ink-faint)">Recent attempts</h3>

              <ul className="mt-4 divide-y divide-(--line)">
                {attempts.slice(0, 5).map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="text-(--ink-soft)">
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-(--ink)">
                      {attempt.correctCount}/{attempt.totalQuestions}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="mono-label text-(--ink-faint)">Questions</h3>

            <button
              type="button"
              onClick={() => setShowAddQuestion(true)}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Plus size={16} aria-hidden="true" />
              Add question
            </button>
          </div>

          {questions.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {questions.map((question) => (
                <article
                  key={question.id}
                  className="card-flat group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-(--blue)/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-3 text-sm leading-6 text-(--ink)">
                      {question.prompt}
                    </p>

                    <button
                      type="button"
                      onClick={() => deleteQuestion(question.id)}
                      aria-label="Delete question"
                      className="shrink-0 rounded-lg p-1.5 text-(--ink-faint) opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex-1 border-t border-(--line) pt-4">
                    <span className="chip">
                      {conceptTitleById.get(question.conceptId) ?? 'Concept'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No questions yet"
              description="Write a few questions for your concepts, then start a quiz to test your recall."
              action={
                <button
                  type="button"
                  onClick={() => setShowAddQuestion(true)}
                  className="btn-primary"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add question
                </button>
              }
            />
          )}
        </>
      )}

      {phase === 'setup' ? (
        <QuizSetupDialog concepts={concepts} onStart={beginQuiz} onClose={reset} />
      ) : null}

      {phase === 'running' && session.length > 0 ? (
        <QuizRunner
          questions={session}
          conceptTitleById={conceptTitleById}
          onCancel={reset}
          onComplete={completeQuiz}
        />
      ) : null}

      {phase === 'results' && result ? (
        <QuizResults result={result} conceptTitleById={conceptTitleById} onClose={reset} />
      ) : null}

      {showAddQuestion ? (
        <AddQuestionDialog
          concepts={concepts}
          onCreated={() => setShowAddQuestion(false)}
          onClose={() => setShowAddQuestion(false)}
        />
      ) : null}
    </section>
  )
}