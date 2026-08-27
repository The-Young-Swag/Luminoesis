import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'

import type { Card } from '#/features/library/domain/card'
import {
  exportToJson,
  exportToMarkdown,
} from '#/features/library/domain/import'
import { cardRepository } from '#/features/library/repositories/cardRepository'

import { deleteCard } from '../application/deleteCard'
import { useLibraryData } from '../hooks/useLibraryData'
import { CardDialog } from './CardDialog'
import { ImportWizard } from './ImportWizard'
import { LibraryTable } from './LibraryTable'

const PAGE_SIZE = 10

export function LibraryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | undefined>()

  const { cards, total, ready } = useLibraryData(search, page, PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isFirstPage = page <= 0
  const isLastPage = page >= totalPages - 1
  const startIndex = page * PAGE_SIZE
  const endIndex = Math.min(total, startIndex + cards.length)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handleCreate = () => {
    setEditingCard(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (card: Card) => {
    setEditingCard(card)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const remaining = total - 1
    const newTotalPages = Math.max(1, Math.ceil(remaining / PAGE_SIZE))

    if (page > newTotalPages - 1) {
      setPage(newTotalPages - 1)
    }

    await deleteCard(id)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCard(undefined)
  }

  const handleSaved = () => {
    handleCloseDialog()
  }

  const handleImported = () => {
    setIsImportOpen(false)
  }

  const handleExportJson = async () => {
    const all = await cardRepository.findAll()
    exportToJson(all)
  }

  const handleExportMarkdown = async () => {
    const all = await cardRepository.findAll()
    exportToMarkdown(all)
  }

  if (!ready) {
    return (
      <section className="page-wrap py-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your knowledge…</span>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm space-y-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-4 w-full max-w-xs" />
          </div>

          <div className="skeleton h-10 w-28 shrink-0 rounded-lg" />
        </div>

        <div className="glass-panel rounded-[14px] mb-5 p-3">
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>

        <div className="overflow-hidden rounded-xl border border-(--line) bg-(--surface)">
          <div className="border-b border-(--line) px-4 py-3.5 sm:px-5">
            <div className="skeleton h-4 w-32" />
          </div>

          <div className="divide-y divide-(--line)">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 px-4 py-4 sm:px-5"
              >
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton hidden h-4 flex-1 sm:block" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page-wrap py-8">
      <header className="rise mb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Knowledge</p>

            <h1 className="display mt-2 text-3xl tracking-tight">
              Your knowledge
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ink-soft)">
              Keep the ideas you want to remember. These cards become part of
              your adaptive review sessions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-(--blue)/30 focus:ring-offset-2 focus:ring-offset-background"
          >
            <Plus size={16} aria-hidden="true" />
            Add card
          </button>
        </div>
      </header>

      <div className="glass-panel rounded-[14px] rise mb-5 p-3" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search knowledge</span>

            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--ink-faint)"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search your knowledge…"
              className="w-full rounded-lg border border-(--line) bg-(--surface-muted) py-2.5 pl-9 pr-9 text-sm text-(--ink) outline-none transition duration-150 placeholder:text-(--ink-faint) focus:border-(--ink-soft) focus:bg-(--surface) focus:ring-2 focus:ring-(--blue)/10"
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-(--ink-faint) transition-colors hover:text-(--ink) focus:outline-none focus:ring-2 focus:ring-(--blue)/20"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="btn-ghost inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--blue)/30"
            >
              <Upload size={16} aria-hidden="true" />
              Import
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="btn-ghost inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--blue)/30"
              title="Export JSON"
            >
              <Download size={16} aria-hidden="true" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              className="btn-ghost inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--blue)/30"
              title="Export Markdown"
            >
              <Download size={16} aria-hidden="true" />
              <span>Markdown</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-(--ink-faint)">
          <span>
            {total} {total === 1 ? 'card' : 'cards'}
            {search ? ' match your search' : ' in your library'}
          </span>

          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="font-medium text-(--ink-soft) hover:text-(--ink)"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      <div
        className="rise overflow-hidden rounded-xl border border-(--line) bg-(--surface)"
        style={{ animationDelay: '110ms' }}
      >
        <div className="border-b border-(--line) px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-(--ink)">
                Your cards
              </h2>

              <p className="mt-0.5 text-xs text-(--ink-faint)">
                Knowledge ready for review.
              </p>
            </div>

            <span className="text-xs tabular-nums text-(--ink-faint)">
              {total}
            </span>
          </div>
        </div>

        <LibraryTable
          cards={cards}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-(--line) px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-(--ink-soft)">
              Showing{' '}
              <span className="font-medium text-(--ink)">{startIndex + 1}</span>
              –<span className="font-medium text-(--ink)">{endIndex}</span> of{' '}
              <span className="font-medium text-(--ink)">{total}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={isFirstPage}
                className="btn-ghost inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--blue)/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Prev
              </button>

              <span className="px-1 text-sm tabular-nums text-(--ink-soft)">
                Page {page + 1} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={isLastPage}
                className="btn-ghost inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--blue)/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <CardDialog
          card={editingCard}
          onClose={handleCloseDialog}
          onSaved={handleSaved}
        />
      )}

      {isImportOpen && (
        <ImportWizard
          onClose={() => setIsImportOpen(false)}
          onImported={handleImported}
        />
      )}
    </section>
  )
}
