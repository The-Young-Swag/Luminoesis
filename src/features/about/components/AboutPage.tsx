import { ExternalLink, Github, Linkedin, Mail } from 'lucide-react'

import { PageHeader } from '#/shared/components/ui/PageHeader'

const PORTFOLIO_URL = 'https://ivan-harvey-rivera.vercel.app/'

const CONTACTS = [
  {
    label: 'GitHub',
    detail: 'The-Young-Swag',
    href: 'https://github.com/The-Young-Swag',
    icon: Github,
    external: true,
  },
  {
    label: 'LinkedIn',
    detail: 'Ivan Harvey Rivera',
    href: 'https://www.linkedin.com/in/ivan-harvey-rivera',
    icon: Linkedin,
    external: true,
  },
  {
    label: 'Email',
    detail: 'xplizit.nm7@gmail.com',
    href: 'mailto:xplizit.nm7@gmail.com',
    icon: Mail,
    external: false,
  },
] as const

export function AboutPage() {
  return (
    <div className="page-wrap max-w-220 space-y-4 py-6 md:py-8">
      <PageHeader title="About" context="The maker behind LumiNoesis" />

      <section aria-labelledby="about-heading" className="card-flat p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
          <figure className="mx-auto w-44 sm:mx-0 sm:w-52">
            <span className="block rounded-2xl border border-(--line) bg-(--surface-muted)/50 p-2">
              <img
                src="/assets/IVAN_HARVEY_RIVERA.jpg"
                alt="Portrait of Ivan Harvey Rivera"
                width={1024}
                height={1536}
                loading="eager"
                fetchPriority="high"
                className="block aspect-[2/3] w-full rounded-xl object-contain"
              />
            </span>
          </figure>

          <div className="min-w-0">
            <div
              id="about-heading"
              className="text-balance leading-tight tracking-tight"
            >
              <span className="block text-[13px] font-semibold text-(--ink-soft)">
                Developed By
              </span>
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noreferrer"
                className="display mt-1 block text-2xl underline decoration-(--accent-line) decoration-2 underline-offset-4 transition-colors hover:text-(--accent) hover:decoration-(--accent)"
              >
                Ivan Harvey Rivera
              </a>
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-(--ink-soft)">
              LumiNoesis is an offline-first study companion that senses rhythm,
              adapts review, and surfaces insight — built and designed by one
              developer.
            </p>

            <div className="mt-6 border-t border-(--line) pt-2">
              <h2 className="pt-2 text-[13px] font-semibold text-(--ink-soft)">
                Contact
              </h2>

              <ul className="mt-1">
                {CONTACTS.map((contact) => (
                  <li key={contact.label}>
                    <a
                      href={contact.href}
                      {...(contact.external
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                      aria-label={`${contact.label}: ${contact.detail}`}
                      className="feed-row flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 no-underline"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-(--line) bg-(--surface-muted) text-(--ink-soft)">
                        <contact.icon size={16} aria-hidden="true" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-(--ink)">
                          {contact.label}
                        </span>
                        <span className="block truncate text-xs text-(--ink-soft)">
                          {contact.detail}
                        </span>
                      </span>

                      {contact.external && (
                        <ExternalLink
                          size={14}
                          aria-hidden="true"
                          className="shrink-0 text-(--ink-faint)"
                        />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
