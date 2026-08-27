import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { StatCard } from '#/features/dashboard/components/snapshot/StatCard'

describe('StatCard', () => {
  it('renders an anchor when a destination is provided', () => {
    const html = renderToStaticMarkup(
      <StatCard
        icon={<span />}
        label="Reviews"
        value="12"
        hint="Last 7 days"
        to="/review"
      />,
    )

    expect(html).toContain('href="/review"')
    expect(html).toContain('Reviews')
    expect(html).toContain('12')
  })

  it('renders a plain div when no destination is provided', () => {
    const html = renderToStaticMarkup(
      <StatCard
        icon={<span />}
        label="Study time"
        value="30m"
        hint="Last 7 days"
      />,
    )

    expect(html).not.toContain('<a ')
    expect(html).toContain('Study time')
  })

  it('links recall to the insights route', () => {
    const html = renderToStaticMarkup(
      <StatCard
        icon={<span />}
        label="Recall"
        value="85%"
        hint="vs last week"
        to="/insights"
      />,
    )

    expect(html).toContain('href="/insights"')
  })
})
