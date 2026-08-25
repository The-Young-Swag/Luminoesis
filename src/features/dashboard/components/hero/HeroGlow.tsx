export function HeroGlow() {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--veridian), transparent 65%)' }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--blue), transparent 70%)' }}
        aria-hidden="true"
      />
    </>
  )
}
