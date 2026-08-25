type AdaptiveOptInBannerProps = {
  onEnable: () => void
  onDismiss: () => void
}

export function AdaptiveOptInBanner({ onEnable, onDismiss }: AdaptiveOptInBannerProps) {
  return (
    <section className="card-flat flex flex-col gap-4 border-(--veridian)/20 p-5 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <div className="mono-label">Adaptive learning</div>

        <h3 className="mt-1 text-[15px] font-medium">Allow Luminoesis to notice rhythm and suggest?</h3>

        <p className="mt-1 text-sm leading-relaxed text-(--ink-soft)">
          You stay in control. Suggestions are optional, timing-only, on-device, and never based on key content.
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn-primary" onClick={onEnable}>
          Enable
        </button>

        <button type="button" className="btn-ghost" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  )
}
