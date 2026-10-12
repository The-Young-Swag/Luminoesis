import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

import { StatCard } from '#/features/dashboard/components/snapshot/StatCard'

type CardProps = {
  label: string
  value: string
  hint: string
  to?: '/review' | '/insights'
}

async function renderCard(props: CardProps) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <StatCard
        icon={<span />}
        label={props.label}
        value={props.value}
        hint={props.hint}
        to={props.to}
      />
    ),
  })
  const reviewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/review',
    component: () => null,
  })
  const insightsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/insights',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([
    indexRoute,
    reviewRoute,
    insightsRoute,
  ])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()

  try {
    return renderToStaticMarkup(<RouterProvider router={router} />)
  } finally {
    router.history.destroy()
  }
}

describe('StatCard', () => {
  it('renders an anchor when a destination is provided', async () => {
    const html = await renderCard({
      label: 'Reviews',
      value: '12',
      hint: 'Last 7 days',
      to: '/review',
    })

    expect(html).toContain('href="/review"')
    expect(html).toContain('Reviews')
    expect(html).toContain('12')
  })

  it('renders a plain div when no destination is provided', async () => {
    const html = await renderCard({
      label: 'Study time',
      value: '30m',
      hint: 'Last 7 days',
    })

    expect(html).not.toContain('<a ')
    expect(html).toContain('Study time')
  })

  it('links recall to the insights route', async () => {
    const html = await renderCard({
      label: 'Recall',
      value: '85%',
      hint: 'vs last week',
      to: '/insights',
    })

    expect(html).toContain('href="/insights"')
  })
})
