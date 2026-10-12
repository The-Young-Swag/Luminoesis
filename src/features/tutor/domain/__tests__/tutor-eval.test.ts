import { describe, expect, it } from 'vitest'

import type { MaterialContentBlock } from '#/features/learning-space/domain/materialContent'
import {
  rankByCosine,
  cosineSimilarity,
} from '#/features/tutor/domain/embeddings'
import { selectRelevantMaterialExcerpt } from '#/features/tutor/domain/materialRetrieval'
import {
  classifyIntent,
  isStructurallyInvalid,
  learnerIsRejectingPreviousAnswer,
  looksLikeSourceRepetition,
  mentionsPreviousTopicInstead,
} from '#/features/tutor/providers/localTutorProvider'

function block(id: string, text: string): MaterialContentBlock {
  return { id, type: 'paragraph', text }
}

const MEMORY_BLOCKS = [
  block('m1', 'Short-term memory holds information for about 20 seconds before it fades.'),
  block('m2', 'Long-term memory can store information for years with little decay.'),
  block(
    'm3',
    'Repeating information, or connecting it to something you already know, moves it from short-term to long-term memory.',
  ),
  block('m4', 'Sleep plays a major role in consolidating memories overnight.'),
]

const CELLS_BLOCKS = [
  block('c1', 'The cell membrane controls what enters and leaves the cell.'),
  block('c2', 'Mitochondria produce energy through cellular respiration.'),
  block('c3', 'Ribosomes build proteins from messenger RNA instructions.'),
]

describe('tutor eval: keyword retrieval', () => {
  it('1. grounds a duration question in the matching chunk', () => {
    const excerpt = selectRelevantMaterialExcerpt(
      MEMORY_BLOCKS,
      'how long does short-term memory last',
      4000,
    )
    expect(excerpt).toContain('20 seconds')
  })

  it('2. grounds a how-to question in the matching chunk', () => {
    const excerpt = selectRelevantMaterialExcerpt(
      MEMORY_BLOCKS,
      'how do I move facts into long-term memory',
      4000,
    )
    expect(excerpt).toContain('Repeating information')
  })

  it('3. grounds a membrane question in the matching chunk', () => {
    const excerpt = selectRelevantMaterialExcerpt(
      CELLS_BLOCKS,
      'what controls entry into the cell',
      4000,
    )
    expect(excerpt).toContain('membrane')
  })

  it('4. returns empty for an unrelated topic', () => {
    expect(
      selectRelevantMaterialExcerpt(
        MEMORY_BLOCKS,
        'photosynthesis light reactions',
        4000,
      ),
    ).toBe('')
  })

  it('5. returns empty for an empty topic', () => {
    expect(selectRelevantMaterialExcerpt(MEMORY_BLOCKS, '', 4000)).toBe('')
  })

  it('6. returns empty for empty blocks', () => {
    expect(selectRelevantMaterialExcerpt([], 'memory', 4000)).toBe('')
  })
})

describe('tutor eval: semantic ranking', () => {
  it('7. ranks the closest vectors first, in document order', () => {
    const topic = [1, 0, 0]
    const chunks = [
      [0, 0, 1],
      [0.9, 0.1, 0],
      [0.7, 0.1, 0],
    ]
    expect(rankByCosine(topic, chunks, 2)).toEqual([1, 2])
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
  })

  it('8. treats orthogonal vectors as unrelated', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
    expect(cosineSimilarity([1, 1], [0, 0])).toBe(0)
  })
})

describe('tutor eval: structural validity', () => {
  it('9. rejects fragments under 20 characters', () => {
    expect(isStructurallyInvalid('Memory works.', 'How does memory work?')).toBe(true)
  })

  it('10. rejects echoing the question', () => {
    expect(
      isStructurallyInvalid('How does memory work?', 'How does memory work?'),
    ).toBe(true)
  })

  it('11. rejects model self-talk', () => {
    expect(
      isStructurallyInvalid(
        'As an AI language model, memory involves neurons firing together in patterns.',
        'How does memory work?',
      ),
    ).toBe(true)
  })

  it('12. accepts a plain teaching answer', () => {
    expect(
      isStructurallyInvalid(
        'New facts sit in short-term memory for seconds unless you rehearse them into long-term storage.',
        'How does memory work?',
      ),
    ).toBe(false)
  })
})

describe('tutor eval: repetition guard', () => {
  const source =
    'Short-term memory holds information for about twenty seconds before it fades away completely without rehearsal or focused attention paid'

  it('13. flags near-verbatim copying', () => {
    expect(
      looksLikeSourceRepetition(
        'Short-term memory holds information for about twenty seconds before it fades away completely without rehearsal or focused attention',
        source,
      ),
    ).toBe(true)
  })

  it('14. passes genuine paraphrase', () => {
    expect(
      looksLikeSourceRepetition(
        'Your brain keeps new facts briefly, then drops them unless you review the material again later.',
        source,
      ),
    ).toBe(false)
  })
})

describe('tutor eval: topic drift guard', () => {
  it('15. flags answers about a previous selection', () => {
    expect(
      mentionsPreviousTopicInstead(
        'Mitochondria produce energy for the cell constantly.',
        'Short-term memory holds information briefly.',
        'Mitochondria produce energy for the cell constantly.',
      ),
    ).toBe(true)
  })

  it('16. passes when the selection is unchanged', () => {
    const selection = 'Short-term memory holds information briefly.'
    expect(mentionsPreviousTopicInstead(selection, selection, selection)).toBe(
      false,
    )
  })
})

describe('tutor eval: correction detection', () => {
  it('17. hears rejection plainly stated', () => {
    expect(learnerIsRejectingPreviousAnswer("That doesn't make sense.")).toBe(
      true,
    )
    expect(learnerIsRejectingPreviousAnswer('Explain it differently.')).toBe(
      true,
    )
  })

  it('18. ignores satisfied follow-ups', () => {
    expect(learnerIsRejectingPreviousAnswer('Thanks, that helps. Why?')).toBe(
      false,
    )
  })
})

describe('tutor eval: intent routing', () => {
  it('19. routes definitions', () => {
    expect(classifyIntent('What is working memory?')).toBe('define')
  })

  it('20. routes comparisons', () => {
    expect(
      classifyIntent('What is the difference between recall and recognition?'),
    ).toBe('compare')
  })
})
