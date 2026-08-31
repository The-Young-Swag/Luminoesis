import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createApp } from './http/app.js'
import { DB_PATH_VALUE } from './infrastructure/database/client.js'

// Local dev convenience: load Gemini key from gemeni.txt / GEMENI.txt if not in env.
// File is gitignored and never exposed to the browser.
if (!process.env.GEMINI_API_KEY) {
  for (const name of ['gemeni.txt', 'GEMENI.txt', 'gemini.txt']) {
    const p = join(process.cwd(), name)
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, 'utf8').trim()
        if (raw) {
          process.env.GEMINI_API_KEY = raw
          console.log(`[Luminoesis-sync] loaded GEMINI_API_KEY from ${name} (${raw.length} chars)`)
          break
        }
      } catch {}
    }
  }
}

const PORT = Number(process.env.SYNC_PORT ?? 4901)
const app = createApp()

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Luminoesis-sync] listening on http://0.0.0.0:${PORT} db=${DB_PATH_VALUE}`)
  })
}

export default app
