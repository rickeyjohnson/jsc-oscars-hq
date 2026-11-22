/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Hand-rolled instead of vite-plugin-pwa: the worker is ~60 lines and we only need two
// build-time values stamped in (a version, and the entry assets to precache).
function stampServiceWorker(): Plugin {
  const precache = new Set<string>(['/'])
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    generateBundle(_o, bundle) {
      for (const [file, chunk] of Object.entries(bundle)) {
        if ((chunk.type === 'chunk' && chunk.isEntry) || (chunk.type === 'asset' && file.endsWith('.css'))) precache.add('/' + file)
      }
    },
    writeBundle(options) {
      const sw = join(options.dir ?? 'dist', 'sw.js')
      if (!existsSync(sw)) return
      ;['/fonts/CenturyGothic/CenturyGothicPaneuropeanLight.woff2', '/fonts/CenturyGothic/CenturyGothicPaneuropeanRegular.woff2', '/manifest.webmanifest', '/icons/icon-192.png'].forEach((f) => precache.add(f))
      const out = readFileSync(sw, 'utf8')
        .replace('"__BUILD_ID__"', JSON.stringify(Date.now().toString(36)))
        .replace('= __PRECACHE__', '= ' + JSON.stringify([...precache]))
      writeFileSync(sw, out)
    },
  }
}

// Link-preview scrapers ignore relative image URLs, so og tags need the absolute origin.
// Set VITE_SITE_URL (and redeploy) when the domain changes.
function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const origin = (process.env.VITE_SITE_URL || loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_').VITE_SITE_URL || 'https://jsc-oscars-hq.vercel.app').replace(/\/+$/, '')
        return html.replaceAll('%SITE_URL%', origin)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrl(), stampServiceWorker()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
})
