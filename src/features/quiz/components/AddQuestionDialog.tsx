import { useEffect, useState } from 'react'

import { Dialog } from '#/shared/components/ui/Dialog'

import type { Concept } from '#/features/learning-space/domain/learningSpace'
import type {
  Question,
  QuestionType,
} from '#/features/quiz/domain/question'
import { createQuestion } from '#/features/quiz/application/question'
import type { CreateQuestionInput } from '#/features/quiz/application/question'

type AddQuestionDialogProps = {
  concepts: Concept[]
  initialPrompt?: string
  initialMaterialId?: string
  open: boolean
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
  initialPrompt,
  initialMaterialId,
  open,
  onCreated,
  onClose,
}: AddQuestionDialogProps) {
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? '')
  const [type, setType] = useState<QuestionType>('multiple-choice')
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [materialId] = useState(initialMaterialId ?? '')
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [answer, setAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conceptId && concepts[0]) {
      setConceptId(concepts[0].id)
    }
  }, [concepts, conceptId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
      materialId: materialId || undefined,
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
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="add-question-title"
      label="Add question"
    >
      <div className="max-h-[80vh] w-full overflow-auto p-6">
        <div className="flex items-start justify-between">
          <h2 id="add-question-title" className="text-lg font-semibold text-(--ink)">Add question</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add question"
            className="btn-ghost px-3 py-1 text-sm"
          >
            Cancel
          </button>
        </div>

        {concepts.length === 0 ? (
          <p className="mt-4 text-sm text-(--ink-soft)">
            Add a concept to this Learning Space first — questions need something to attach to.
          </p>
        ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="kicker text-(--ink-soft)">Concept</span>
            <select
              value={conceptId}
              onChange={(event) => setConceptId(event.target.value)}
              className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            >
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="kicker text-(--ink-soft)">Type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as QuestionType)
              }
              className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            >
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="kicker text-(--ink-soft)">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={2}
              className="card-flat mt-1 w-full bg-transparent p-3 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            />
          </label>

          {isChoiceType ? (
            <div>
              <span className="kicker text-(--ink-soft)">Choices</span>
              {effectiveChoices.map((choice, index) => (
                <div key={index} className="mt-2 flex items-center gap-2">
                  <input
                    value={choice}
                    disabled={type === 'true-false'}
                    onChange={(event) => updateChoice(index, event.target.value)}
                    className="card-flat flex-1 bg-transparent px-3 py-2 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
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
                <span className="kicker text-(--ink-soft)">Correct answer</span>
                <select
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
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
              <span className="kicker text-(--ink-soft)">
                Reference answer
              </span>
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="card-flat mt-1 w-full bg-transparent px-3 py-2 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
              />
            </label>
          )}

          <label className="block">
            <span className="kicker text-(--ink-soft)">
              Explanation (optional)
            </span>
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              rows={2}
              className="card-flat mt-1 w-full bg-transparent p-3 text-(--ink) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-400">{error}</p>
          ) : null}
        </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={concepts.length === 0}
            className="btn-primary px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add question
          </button>
        </div>
      </div>
    </Dialog>
  )
}
