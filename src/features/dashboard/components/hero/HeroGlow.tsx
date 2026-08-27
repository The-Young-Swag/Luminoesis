export function HeroGlow() {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.10] blur-3xl"
        style={{ background: 'var(--veridian)' }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'var(--blue)' }}
        aria-hidden="true"
      />
    </>
  )
}
