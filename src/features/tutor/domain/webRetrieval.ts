export type RetrievalQueryInput = {
  question: string
  materialTitle: string
  conceptNames: string[]
}

export type WebSource = {
  title: string
  url: string
  extract: string
}

export type WebRetrievalResult = {
  sources: WebSource[]
}

export type WebRetrievalCacheEntry = {
  queryKey: string
  materialId?: string
  sources: WebSource[]
  retrievedAt: number
  expiresAt: number
}

/*
 * Wikipedia's API is free, keyless, and CORS-enabled (via `origin=*`), so
 * it can be called directly from the browser — no backend, no API key,
 * zero cost. This is the entire "web retrieval" half of Online Mode.
 *
 * The other half — an online LLM synthesizing an answer from material +
 * selection + these sources + conversation — is a separate concern and
 * must NOT be added here. That call needs a paid API key, which must stay
 * server-side (see the existing fetchGeminiTutor in tutorService.ts,
 * which already does this correctly via the sync server's /tutor/chat
 * endpoint). Keep retrieval and synthesis on opposite sides of that line.
 */
const WIKIPEDIA_SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA_SUMMARY_ENDPOINT =
  'https://en.wikipedia.org/api/rest_v1/page/summary'
const MAX_SOURCES = 2
const MAX_EXTRACT_CHARS = 800

/*
 * Deliberately narrow: only the learner's question, material title, and
 * concept names go into the query text. Learner-private fields (mastery,
 * review history, conversation history) must never reach this function —
 * callers should not pass them in, and this type intentionally has no
 * field for them.
 */
function buildQueryText(input: RetrievalQueryInput): string {
  return [input.question, input.materialTitle, ...input.conceptNames]
    .filter((part) => part.trim().length > 0)
    .join(' ')
    .slice(0, 300)
}

async function searchWikipediaTitles(queryText: string): Promise<string[]> {
  const url = new URL(WIKIPEDIA_SEARCH_ENDPOINT)
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('srsearch', queryText)
  url.searchParams.set('srlimit', String(MAX_SOURCES))

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Wikipedia search failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    query?: { search?: Array<{ title: string }> }
  }

  return (data.query?.search ?? []).map((result) => result.title)
}

async function fetchWikipediaSummary(
  title: string,
): Promise<WebSource | undefined> {
  const response = await fetch(
    `${WIKIPEDIA_SUMMARY_ENDPOINT}/${encodeURIComponent(title)}`,
  )

  if (!response.ok) {
    return undefined
  }

  const data = (await response.json()) as {
    title?: string
    extract?: string
    content_urls?: { desktop?: { page?: string } }
  }

  if (!data.extract) {
    return undefined
  }

  return {
    title: data.title ?? title,
    url:
      data.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    extract: data.extract.slice(0, MAX_EXTRACT_CHARS),
  }
}

/*
 * Looks up a small number of Wikipedia article summaries relevant to the
 * learner's question. Returns real, attributable sources (title + URL +
 * extract) rather than a synthesized answer — synthesis is the online
 * provider's job, not this function's.
 *
 * Fails soft: any error (offline, rate limited, no results) returns an
 * empty result rather than throwing, so Online Mode can fall back to
 * material-only or model-knowledge answers instead of failing outright.
 */
export async function retrieveWebSources(
  input: RetrievalQueryInput,
): Promise<WebRetrievalResult> {
  const queryText = buildQueryText(input)

  if (!queryText) {
    return { sources: [] }
  }

  try {
    const titles = await searchWikipediaTitles(queryText)
    const summaries = await Promise.all(titles.map(fetchWikipediaSummary))

    const sources = summaries.filter(
      (source): source is WebSource => source !== undefined,
    )

    return { sources }
  } catch (error) {
    console.warn('[tutor] web retrieval failed', error)
    return { sources: [] }
  }
}