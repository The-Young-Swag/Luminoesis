import { useState } from 'react'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type {
  Question,
  QuestionType,
} from '#/features/quiz/domain/question'
import { createQuestion } from '#/features/quiz/application/question'
import type { CreateQuestionInput } from '#/features/quiz/application/question'

type AddQuestionDialogProps = {
  concepts: Concept[]
  onCreated: (question: Question) => void
  onClose: () => void
}

const TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple choice',
  'true-false': 'True / false',
  'short-answer': 'Short answer',
}

export function AddQuestionDialog({
  concepts,
  onCreated,
  onClose,
}: AddQuestionDialogProps) {
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? '')
  const [type, setType] = useState<QuestionType>('multiple-choice')
  const [prompt, setPrompt] = useState('')
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [answer, setAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isChoiceType = type === 'multiple-choice' || type === 'true-false'
  const effectiveChoices =
    type === 'true-false' ? ['True', 'False'] : choices

  function updateChoice(index: number, value: string) {
    setChoices((previous) =>
      previous.map((item, i) => (i === index ? value : item)),
    )
  }

  function addChoice() {
    setChoices((previous) => [...previous, ''])
  }

  function removeChoice(index: number) {
    setChoices((previous) => previous.filter((_, i) => i !== index))
  }

  async function save() {
    setError(null)
    const payload: CreateQuestionInput = {
      conceptId,
      prompt,
      type,
      explanation: explanation || undefined,
      answer,
      ...(isChoiceType ? { choices: effectiveChoices } : {}),
    }

    try {
      const created = await createQuestion(payload)
      onCreated(created)
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Invalid question.',
      )
    }
  }

  return (
    <div className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="glass-surface glass-specular rise card-flat w-full max-w-lg p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-(--ink)">Add question</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="kicker text-(--ink-faint)">Concept</span>
            <select
              value={conceptId}
              onChange={(event) => setConceptId(event.target.value)}
              className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none"
            >
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="kicker text-(--ink-faint)">Type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as QuestionType)
              }
              className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none"
            >
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="kicker text-(--ink-faint)">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={2}
              className="card-flat mt-1 w-full bg-transparent p-3 text-(--ink) outline-none"
            />
          </label>

          {isChoiceType ? (
            <div>
              <span className="kicker text-(--ink-faint)">Choices</span>
              {effectiveChoices.map((choice, index) => (
                <div key={index} className="mt-2 flex items-center gap-2">
                  <input
                    value={choice}
                    disabled={type === 'true-false'}
                    onChange={(event) => updateChoice(index, event.target.value)}
                    className="card-flat flex-1 bg-transparent px-3 py-2 text-(--ink) outline-none"
                  />
                  {type === 'multiple-choice' ? (
                    <button
                      type="button"
                      onClick={() => removeChoice(index)}
                      className="btn-ghost px-2 py-1 text-sm"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {type === 'multiple-choice' ? (
                <button
                  type="button"
                  onClick={addChoice}
                  className="btn-ghost mt-2 px-3 py-1 text-sm"
                >
                  Add choice
                </button>
              ) : null}

              <label className="mt-3 block">
                <span className="kicker text-(--ink-faint)">Correct answer</span>
                <select
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none"
                >
                  <option value="">Select…</option>
                  {effectiveChoices.map((choice, index) => (
                    <option key={index} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="kicker text-(--ink-faint)">
                Reference answer
              </span>
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="kicker text-(--ink-faint)">
              Explanation (optional)
            </span>
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              rows={2}
              className="card-flat mt-1 w-full bg-transparent p-3 text-(--ink) outline-none"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={save}
            className="btn-primary px-5 py-2"
          >
            Add question
          </button>
        </div>
      </div>
    </div>
  )
}
