/** Targeting-reticle corner marks — the page's one recurring signature motif. */
export function CornerBrackets() {
  return (
    <>
      <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-(--veridian)/40" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-(--veridian)/40" />
    </>
  )
}
