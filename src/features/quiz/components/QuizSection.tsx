import { useMemo, useRef, useState } from 'react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import { useQuestions } from '#/features/quiz/hooks/useQuestions'
import { useQuizAttempts } from '#/features/quiz/hooks/useQuizAttempts'
import { buildQuiz, submitQuizAttempt } from '#/features/quiz/application/quiz'
import type {
  SubmitQuizAnswer,
  SubmitQuizResult,
} from '#/features/quiz/application/quiz'
import { deleteQuestion } from '#/features/quiz/application/question'
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
  const conceptIds = useMemo(
    () => concepts.map((concept) => concept.id),
    [concepts],
  )
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

  const hasQuestions = questions.length > 0

  return (
    <section className="card-flat mt-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-(--ink)">Practice</h2>
          <p className="mt-1 text-sm text-(--ink-soft)">
            {hasQuestions
              ? `${questions.length} question${questions.length === 1 ? '' : 's'} in this space.`
              : 'Add questions to concepts to start practicing.'}
          </p>
        </div>
        <button
          type="button"
          onClick={startSetup}
          disabled={concepts.length === 0 || !hasQuestions}
          className="btn-primary px-4 py-2"
        >
          Start quiz
        </button>
      </div>

      {attempts.length > 0 ? (
        <ul className="mt-4 divide-y divide-(--line)">
          {attempts.slice(0, 5).map((attempt) => (
            <li
              key={attempt.id}
              className="flex items-center justify-between py-2 text-sm"
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
      ) : null}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="kicker text-(--ink-faint)">Questions</h3>
          <button
            type="button"
            onClick={() => setShowAddQuestion(true)}
            disabled={concepts.length === 0}
            className="btn-ghost px-3 py-1 text-sm"
          >
            Add question
          </button>
        </div>

        {questions.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {questions.map((question) => (
              <li
                key={question.id}
                className="card-flat flex items-center justify-between p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-(--ink)">
                    {question.prompt}
                  </p>
                  <span className="chip mt-1">
                    {conceptTitleById.get(question.conceptId) ?? 'Concept'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteQuestion(question.id)}
                  className="btn-ghost px-2 py-1 text-sm"
                  aria-label="Delete question"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-(--ink-soft)">
            No questions yet.
          </p>
        )}
      </div>

      {phase === 'setup' ? (
        <QuizSetupDialog
          concepts={concepts}
          onStart={beginQuiz}
          onClose={reset}
        />
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
        <QuizResults
          result={result}
          conceptTitleById={conceptTitleById}
          onClose={reset}
        />
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
