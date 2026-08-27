import { Link } from '@tanstack/react-router'

import { useConceptDetail } from '#/features/learning-space/hooks/useConceptDetail'

type ConceptDetailPageProps = {
  conceptId: string
}

export function ConceptDetailPage({ conceptId }: ConceptDetailPageProps) {
  const { concept, learningSpace, materials, highlights, flashcards, questions, ready } =
    useConceptDetail(conceptId)

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center text-(--ink-soft)">
        Loading concept…
      </main>
    )
  }

  if (!concept) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center text-(--ink-soft)">
        <p>This concept could not be found.</p>
        <Link to="/learning-spaces" className="link mt-3 inline-block">
          Back to Learning Spaces
        </Link>
      </main>
    )
  }

  const linkedMaterials = materials.filter((material) =>
    concept.materialIds.includes(material.id),
  )

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-(--ink-soft)">
        <Link to="/learning-spaces" className="link">
          Learning Spaces
        </Link>
        <span aria-hidden="true">/</span>
        {learningSpace && (
          <Link
            to="/learning-spaces/$learningSpaceId"
            params={{ learningSpaceId: learningSpace.id }}
            className="link"
          >
            {learningSpace.title}
          </Link>
        )}
      </nav>

      <header className="mt-4">
        <h1 className="display text-3xl text-(--ink)">{concept.name}</h1>
        {concept.description && (
          <p className="mt-2 max-w-2xl leading-7 text-(--ink-soft)">
            {concept.description}
          </p>
        )}
      </header>

      <Section title="Source materials" count={linkedMaterials.length}>
        {linkedMaterials.length === 0 ? (
          <Empty>No linked materials yet.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedMaterials.map((material) => (
              <Link
                key={material.id}
                to="/material/$materialId"
                params={{ materialId: material.id }}
                className="chip"
              >
                {material.title}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Highlights" count={highlights.length}>
        {highlights.length === 0 ? (
          <Empty>No highlights linked to this concept yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {highlights.map((highlight) => (
              <li key={highlight.id} className="card-flat p-4 text-sm leading-6 text-(--ink)">
                {highlight.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Flashcards" count={flashcards.length}>
        {flashcards.length === 0 ? (
          <Empty>No flashcards for this concept yet.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {flashcards.map((flashcard) => (
              <div key={flashcard.id} className="card-flat p-4">
                <p className="text-sm font-medium text-(--ink)">{flashcard.front}</p>
                <p className="mt-2 text-sm leading-6 text-(--ink-soft)">
                  {flashcard.back}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Quiz questions" count={questions.length}>
        {questions.length === 0 ? (
          <Empty>No quiz questions for this concept yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {questions.map((question) => (
              <li key={question.id} className="card-flat p-4 text-sm leading-6 text-(--ink)">
                {question.prompt}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-8">
        <Link to="/review" className="btn-primary">
          Train this concept
        </Link>
      </div>
    </main>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="display text-xl text-(--ink)">{title}</h2>
        <span className="text-sm text-(--ink-soft)">{count}</span>
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-(--line) px-4 py-6 text-center text-sm text-(--ink-soft)">
      {children}
    </p>
  )
}
