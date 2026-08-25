import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import type { LearningSpace } from '#/shared/types/learningSpace'

import { useLearningSpaceList } from '../hooks/useLearningSpaceList'
import { CreateLearningSpaceDialog } from './CreateLearningSpaceDialog'

export function LearningSpaceListPage() {
  const { learningSpaces, ready } = useLearningSpaceList()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!ready) {
    return (
      <section
        className="page-wrap py-8"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading your learning spacesâ€¦</span>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm space-y-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-4 w-full max-w-xs" />
          </div>

          <div className="skeleton h-10 w-44 shrink-0 rounded-lg" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card-flat p-5">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton mt-3 h-3 w-full" />
              <div className="skeleton mt-1.5 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="page-wrap py-8">
      <header className="rise mb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Learning</p>

            <h1 className="display mt-2 text-3xl tracking-tight">
              Your learning spaces
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ink-soft)">
              Bring the materials for one subject together in one place â€”
              open a space to keep working on it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-(--blue)/30 focus:ring-offset-2 focus:ring-offset-background"
          >
            <Plus size={16} aria-hidden="true" />
            New learning space
          </button>
        </div>
      </header>

      {learningSpaces.length === 0 ? (
        <div className="card-flat rise p-10 text-center">
          <p className="text-sm font-medium text-(--ink)">
            No learning spaces yet
          </p>

          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-(--ink-soft)">
            Create one for a subject or lesson you&rsquo;re studying, then
            bring its materials together.
          </p>
        </div>
      ) : (
        <div className="rise grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {learningSpaces.map((learningSpace) => (
            <LearningSpaceCard
              key={learningSpace.id}
              learningSpace={learningSpace}
            />
          ))}
        </div>
      )}

      {isDialogOpen && (
        <CreateLearningSpaceDialog
          onClose={() => setIsDialogOpen(false)}
          onCreated={() => setIsDialogOpen(false)}
        />
      )}
    </section>
  )
}

type LearningSpaceCardProps = {
  learningSpace: LearningSpace
}

function LearningSpaceCard({
  learningSpace,
}: LearningSpaceCardProps) {
  return (
    <div className="card-flat group relative p-5">
      <Link
        to="/learning-spaces/$learningSpaceId"
        params={{ learningSpaceId: learningSpace.id }}
        className="block no-underline"
      >
        <h2 className="truncate font-semibold text-(--ink)">
          {learningSpace.title}
        </h2>

        <p className="mt-1.5 line-clamp-2 text-sm text-(--ink-soft)">
          {learningSpace.description || 'No description yet.'}
        </p>
      </Link>

      <button
        type="button"
        aria-label={`Delete ${learningSpace.title}`}
        onClick={onDelete}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-(--ink-faint) opacity-0 transition-colors hover:bg-(--destructive)/10 hover:text-destructive focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-(--destructive)/20 group-hover:opacity-100"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
