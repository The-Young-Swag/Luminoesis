import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // Cross-origin isolation headers as middleware: server.headers alone
    // is dropped by the Start dev handler, so set them explicitly on
    // every response. credentialless (not require-corp) keeps HF,
    // jsDelivr, and Google Fonts loading.
    {
      name: 'coi-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
          next()
        })
      },
    },
    devtools(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
      router: { generatedRouteTree: 'routeTree.gen.ts' },
    }),
    viteReact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'LumiNoesis — Adaptive Study',
        short_name: 'LumiNoesis',
        description:
          'Offline-first adaptive spaced-repetition that senses rhythm, adapts review, surfaces insight.',
        theme_color: '#0A2018',
        background_color: '#E6E8F7',
        display: 'standalone',
        icons: [
          {
            src: 'assets/luminoesis-mark-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'assets/luminoesis-mark-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,mjs,css,html,ico,svg,woff2,webp,png,webmanifest}',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Tutor quota is low-frequency and benefits from offline grace.
            // NetworkFirst keeps the count fresh when online, stale cache when offline.
            urlPattern: /\/tutor\/quota/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tutor-quota',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Google Fonts binaries — cached for a year, revalidated rarely.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-binaries',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // On-device model weights (transformers.js, ~hundreds of MB).
            // Cached so models never re-download; persist() keeps them.
            urlPattern: /^https:\/\/huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-model-weights',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Alternate weight CDN used by some transformers.js builds.
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-assets',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    headers: {
      // Cross-origin isolation for multi-threaded WASM (SharedArrayBuffer).
      // credentialless (not require-corp) so Hugging Face, jsDelivr, and
      // Google Fonts keep loading without CORP headers on their side.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    // Render serves the app on *.onrender.com — allow the production host
    // (Vite blocks unknown Host headers by default).
    allowedHosts: ['luminoesis.onrender.com'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

export default config
