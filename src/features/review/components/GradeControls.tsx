import type { Grade } from '#/features/review/domain/sm2'

type GradeControlsProps = {
  onGrade: (grade: Grade) => void
}

export function GradeControls({ onGrade }: GradeControlsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
      <GradeBtn
        label="Again"
        hint="Fail"
        color="var(--purple)"
        onClick={() => onGrade(0)}
      />
      <GradeBtn
        label="Hard"
        hint="Struggle"
        color="var(--amber)"
        onClick={() => onGrade(1)}
      />
      <GradeBtn
        label="Good"
        hint="Recall"
        color="var(--blue)"
        onClick={() => onGrade(2)}
      />
      <GradeBtn
        label="Easy"
        hint="Instant"
        color="var(--racing)"
        onClick={() => onGrade(3)}
      />
    </div>
  )
}

function GradeBtn({
  label,
  hint,
  color,
  onClick,
}: {
  label: string
  hint: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-(--line) bg-(--surface) p-3 text-left hover:bg-(--surface-muted)"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-(--ink-faint)">{hint}</div>
    </button>
  )
}