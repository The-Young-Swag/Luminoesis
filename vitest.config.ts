import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    // Sequential files, one worker: jsdom setup (~1min on a loaded host)
    // happens once instead of per file. (vitest 4 has no per-pool
    // singleFork/singleThread knobs — fileParallelism:false is the
    // equivalent.) Per-file module isolation is preserved.
    fileParallelism: false,
    maxWorkers: 1,
    // Generous because jsdom setup + transform dominate on slow hosts.
    // A hanging suite fails loudly instead of stalling CI forever.
    testTimeout: 60000,
    hookTimeout: 30000,
    teardownTimeout: 15000,
  },
})
