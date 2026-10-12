export function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow && <p className="mono-label">{eyebrow}</p>}
      <h2 className="mt-1 text-sm font-semibold">{title}</h2>
    </div>
  )
}
