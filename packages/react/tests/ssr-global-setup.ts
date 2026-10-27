import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { TestProject } from 'vitest/node'

const FIXTURES = [
  'login',
  'dashboard',
  'posts-index',
  'posts-create',
  'posts-edit',
  'kitchen-sink',
] as const

declare module 'vitest' {
  export interface ProvidedContext {
    ssrPages: Record<string, { page: unknown; body: string }>
    /** The kitchen sink as a starter kit page, before and after the panel pages warmed the server. */
    starterKitPage: { page: unknown; cold: string; warm: string }
  }
}

/**
 * Server-renders the page fixtures once, in this Node process (no `window`, modules loaded
 * through Vite's SSR pipeline, as an application's SSR bundle would), so the jsdom
 * hydration test can hydrate real server markup.
 */
export default async function setup(project: TestProject): Promise<void> {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const vite = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    plugins: [react()],
    resolve: {
      alias: {
        '@alfakit/core': fileURLToPath(new URL('../../core/src/index.ts', import.meta.url)),
      },
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })

  try {
    const { createAlfakitServer } = (await vite.ssrLoadModule('/src/server.tsx')) as {
      createAlfakitServer: () => (page: unknown) => Promise<{ body: string } | null>
    }
    const { renderStarterKit } = (await vite.ssrLoadModule('/tests/starter-kit-ssr-entry.tsx')) as {
      renderStarterKit: (page: unknown) => Promise<string>
    }
    const render = createAlfakitServer()
    const pages: Record<string, { page: unknown; body: string }> = {}
    const { default: starterKitPage } = (await vite.ssrLoadModule(
      '/../core/tests/fixtures/ssr/kitchen-sink.json',
    )) as { default: unknown }
    // A long-lived SSR server: the starter kit page first, then panel pages (which load the
    // split built-ins they use), then the starter kit page again (OM-B06).
    const cold = await renderStarterKit(starterKitPage)

    for (const name of FIXTURES) {
      const { default: page } = (await vite.ssrLoadModule(
        `/../core/tests/fixtures/ssr/${name}.json`,
      )) as { default: unknown }

      pages[name] = { page, body: (await render(page))?.body ?? '' }
    }

    project.provide('ssrPages', pages)
    project.provide('starterKitPage', {
      page: starterKitPage,
      cold,
      warm: await renderStarterKit(starterKitPage),
    })
  } finally {
    await vite.close()
  }
}
