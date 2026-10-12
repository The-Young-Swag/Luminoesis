import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'

import Sidebar from '../shared/components/layout/Sidebar'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles/app.css?url'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('theme')
    var mode = theme === 'light' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', mode === 'dark')
  } catch (error) {}
})()
`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Luminoesis — Adaptive Study',
      },
      {
        name: 'description',
        content:
          'Offline-first adaptive spaced-repetition that senses rhythm, adapts review, surfaces insight. On-device, timing-only.',
      },
      {
        name: 'theme-color',
        content: '#f6f7f3',
      },
      {
        name: 'color-scheme',
        content: 'light dark',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />

        <HeadContent />
      </head>

      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <div
          aria-hidden="true"
          className="grain-overlay"
        />

        <div className="app-shell">
          <Sidebar />

          <div className="app-main">
            <main id="main-content" tabIndex={-1} className="app-content">
              {children}
            </main>
          </div>
        </div>

        {import.meta.env.DEV && (
          <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        )}

        <Scripts />
      </body>
    </html>
  )
}