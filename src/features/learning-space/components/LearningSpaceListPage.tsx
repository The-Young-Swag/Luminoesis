import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'

import type { LearningSpace } from '#/features/learning-space/domain/learningSpace'

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
        <span className="sr-only">
          Loading your learning spaces…
        </span>

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
            <div
              key={index}
              className="card-flat p-5"
            >
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
              Bring the materials for one subject together
              in one place — open a space to keep working on
              it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-(--blue)/30 focus:ring-offset-2 focus:ring-offset-background"
          >
            <Plus
              size={16}
              aria-hidden="true"
            />
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
            Create one for a subject or lesson you&apos;re
            studying, then bring its materials together.
          </p>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary mt-5"
          >
            Create a learning space
          </button>
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
  const navigate = useNavigate()

  function openLearningSpace() {
    void navigate({
      to: '/learning-spaces/$learningSpaceId',
      params: {
        learningSpaceId: learningSpace.id,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={openLearningSpace}
      className="card-flat group block w-full cursor-pointer p-5 text-left transition hover:-translate-y-0.5 hover:border-(--blue)/30 focus:outline-none focus:ring-2 focus:ring-(--blue)/30"
      aria-label={`Open learning space: ${learningSpace.title}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-(--ink-soft)">
            Learning Space
          </p>

          <h2 className="mt-2 truncate font-semibold text-(--ink)">
            {learningSpace.title}
          </h2>
        </div>

        <ArrowRight
          size={17}
          className="mt-1 shrink-0 text-(--ink-soft) transition-transform group-hover:translate-x-0.5 group-hover:text-(--ink)"
          aria-hidden="true"
        />
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-(--ink-soft)">
        {learningSpace.description || 'No description yet.'}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-(--line) pt-4">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-(--ink-soft) transition-colors group-hover:text-(--ink)">
          Open space
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </button>
  )
}