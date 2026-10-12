import type { SubmitQuizResult } from '#/features/quiz/application/quiz'

type QuizResultsProps = {
  result: SubmitQuizResult
  conceptTitleById: Map<string, string>
  onClose: () => void
  onRetake: () => void
}

export function QuizResults({
  result,
  conceptTitleById,
  onClose,
  onRetake,
}: QuizResultsProps) {
  const { correctCount, totalQuestions, conceptBreakdown } = result
  const percent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

  const needsWork = Object.entries(conceptBreakdown)
    .filter(([, value]) => value.correct < value.total)
    .map(([conceptId]) => conceptId)

  return (
    <div className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="glass-surface glass-specular rise card-flat w-full max-w-xl p-6">
        <span className="eyebrow">Quiz complete</span>
        <h2 className="mt-2 text-2xl font-semibold text-(--ink)">
          {correctCount} / {totalQuestions} correct
        </h2>
        <p className="mt-1 text-(--ink-soft)">{percent}% accuracy</p>

        {needsWork.length > 0 ? (
          <div className="mt-5">
            <h3 className="kicker text-(--ink-faint)">Needs work</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {needsWork.map((conceptId) => (
                <li key={conceptId} className="chip">
                  {conceptTitleById.get(conceptId) ?? 'Unknown concept'}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-(--ink-soft)">
            Nice work — every concept in this quiz was answered correctly.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="btn-ghost px-5 py-2"
          >
            Retake quiz
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-5 py-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
