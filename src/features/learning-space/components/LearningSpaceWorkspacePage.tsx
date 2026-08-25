import { FileStack, Plus } from 'lucide-react'

import { useLearningSpaceDetail } from '../hooks/useLearningSpaceDetail'

type Lear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = {
  learningSpaceId: string
}

export function LearningSpaceWorkspacePage({
  learningSpaceId,
}: Lear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8) {
  const { learningSpace, ready } = useLearningSpaceDetail(learningSpaceId)

  if (!ready) {
    return (
      <section
        className="page-wrap py-8"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading learning space…</span>

        <div className="space-y-3">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-8 w-72" />
          <div className="skeleton h-4 w-full max-w-md" />
        </div>

        <div className="card-flat mt-8 p-10">
          <div className="skeleton mx-auto h-10 w-10 rounded-full" />
          <div className="skeleton mx-auto mt-4 h-4 w-48" />
          <div className="skeleton mx-auto mt-2 h-3 w-64" />
        </div>
      </section>
    )
  }

  if (!learningSpace) {
    return (
      <section className="page-wrap py-8">
        <div className="card-flat p-10 text-center">
          <p className="text-sm font-medium text-(--ink)">
            This learning space couldn’t be found
          </p>

          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-(--ink-soft)">
            It may have been deleted.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="page-wrap py-8">
      <header className="rise">
        <p className="eyebrow">Learning space</p>

        <h1 className="display mt-2 text-3xl tracking-tight">
          {learningSpace.title}
        </h1>

        {learningSpace.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ink-soft)">
            {learningSpace.description}
          </p>
        )}
      </header>

      <div
        className="card-flat rise mt-8 p-10 text-center"
        style={{ animationDelay: '60ms' }}
      >
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-(--line) bg-(--surface-muted) text-(--ink-faint)">
          <FileStack size={20} aria-hidden="true" />
        </span>

        <p className="mt-4 text-sm font-medium text-(--ink)">
          Your learning space is empty
        </p>

        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-(--ink-soft)">
          Add your first material to bring this lesson together.
        </p>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="btn-primary mt-6 inline-flex cursor-not-allowed items-center gap-2 opacity-50"
        >
          <Plus size={16} aria-hidden="true" />
          Add material
        </button>
      </div>
    </section>
  )
}
