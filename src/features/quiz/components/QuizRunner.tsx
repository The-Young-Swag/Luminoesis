import { useMemo, useRef, useState } from 'react'

import type { Question } from '#/features/quiz/domain/question'
import type { SubmitQuizAnswer } from '#/features/quiz/application/quiz'
import { isAnswerCorrect } from '#/features/quiz/application/quiz'

type QuizRunnerProps = {
  questions: Question[]
  conceptTitleById: Map<string, string>
  onCancel: () => void
  onComplete: (answers: SubmitQuizAnswer[]) => void
}

export function QuizRunner({
  questions,
  conceptTitleById,
  onCancel,
  onComplete,
}: QuizRunnerProps) {
  const [index, setIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const startedAtRef = useRef<number>(Date.now())

  const total = questions.length
  const current = questions[index]
  const conceptTitle =
    total === 0 ? undefined : conceptTitleById.get(current.conceptId)

  const choices = useMemo(() => {
    if (total === 0) return []
    const item = questions[index]
    if (item.type === 'multiple-choice') return item.choices ?? []
    if (item.type === 'true-false') return ['True', 'False']
    return []
  }, [questions, index, total])

  function selectChoice(choice: string) {
    setUserAnswer(choice)
  }

  function goNext() {
    if (index >= total) return
    const answered = userAnswer.trim()
    if (answered === '') return

    const nextAnswers = { ...answers, [current.id]: answered }
    setAnswers(nextAnswers)

    if (index + 1 >= total) {
      finish(nextAnswers)
      return
    }

    setIndex(index + 1)
    setUserAnswer('')
  }

  function finish(allAnswers: Record<string, string>) {
    const now = Date.now()
    const payload: SubmitQuizAnswer[] = questions.map((question, idx) => ({
      questionId: question.id,
      conceptId: question.conceptId,
      prompt: question.prompt,
      type: question.type,
      userAnswer: allAnswers[question.id] ?? '',
      correct: isAnswerCorrect(question, allAnswers[question.id] ?? ''),
      durationMs: Math.round((now - startedAtRef.current) / (idx + 1)),
    }))
    onComplete(payload)
  }

  if (total === 0) return null

  return (
    <div className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="glass-surface glass-specular rise card-flat w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Question {index + 1} of {total}</span>
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost px-3 py-1 text-sm"
          >
            Exit
          </button>
        </div>

        {conceptTitle ? (
          <p className="chip mt-3 w-fit">{conceptTitle}</p>
        ) : null}

        <h2 className="mt-3 text-lg font-semibold text-(--ink)">
          {current.prompt}
        </h2>

        <div className="mt-4 space-y-2">
          {choices.length > 0 ? (
            choices.map((choice, choiceIndex) => {
              const selected = userAnswer === choice
              return (
                <button
                  key={`${index}-${choiceIndex}`}
                  type="button"
                  onClick={() => selectChoice(choice)}
                  className={`card-flat w-full px-4 py-3 text-left text-(--ink) transition ${
                    selected
                      ? 'ring-2 ring-(--blue)'
                      : 'hover:bg-(--surface-muted)'
                  }`}
                >
                  {choice}
                </button>
              )
            })
          ) : (
            <textarea
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              placeholder="Type your answer…"
              rows={3}
              className="card-flat w-full bg-transparent p-3 text-(--ink) outline-none"
            />
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={goNext}
            disabled={userAnswer.trim() === ''}
            className="btn-primary px-5 py-2"
          >
            {index + 1 >= total ? 'Submit quiz' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
