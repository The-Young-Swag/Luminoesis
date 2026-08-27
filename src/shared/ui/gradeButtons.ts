import type { Grade } from '#/features/review/domain/sm2'

export type GradeButton = {
  grade: Grade
  label: string
  key: string
  className: string
}

/**
 * Shared grade-action styling for review surfaces (flashcard + brain-trainer).
 *
 * Colors use the design tokens (--destructive/--warning/--blue/--emerald) so the
 * grade buttons stay on-brand and theme-correct instead of hard-coded Tailwind
 * reds/ambers. Kept in one place so the two overlays never drift apart.
 */
export const GRADE_BUTTONS: GradeButton[] = [
  {
    grade: 0,
    label: 'Again',
    key: '1',
    className:
      'bg-(--destructive) text-white hover:opacity-90 focus-visible:ring-(--destructive)',
  },
  {
    grade: 1,
    label: 'Hard',
    key: '2',
    className:
      'bg-(--warning) text-white hover:opacity-90 focus-visible:ring-(--warning)',
  },
  {
    grade: 2,
    label: 'Good',
    key: '3',
    className:
      'bg-(--blue) text-white hover:opacity-90 focus-visible:ring-(--blue)',
  },
  {
    grade: 3,
    label: 'Easy',
    key: '4',
    className:
      'bg-(--emerald) text-white hover:opacity-90 focus-visible:ring-(--emerald)',
  },
]
