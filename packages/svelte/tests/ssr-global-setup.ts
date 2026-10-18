import { svelte } from '@sveltejs/vite-plugin-svelte'
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
    plugins: [svelte({ compilerOptions: { runes: true } })],
    resolve: {
      alias: {
        '@alfakit/core': fileURLToPath(new URL('../../core/src/index.ts', import.meta.url)),
      },
    },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })

  try {
    const { createAlfakitServer } = (await vite.ssrLoadModule('/src/server.ts')) as {
      createAlfakitServer: () => (page: unknown) => Promise<{ body: string } | null>
    }
    const render = createAlfakitServer()
    const pages: Record<string, { page: unknown; body: string }> = {}

    for (const name of FIXTURES) {
      const { default: page } = (await vite.ssrLoadModule(
        `/../core/tests/fixtures/ssr/${name}.json`,
      )) as { default: unknown }

      pages[name] = { page, body: (await render(page))?.body ?? '' }
    }

    project.provide('ssrPages', pages)
  } finally {
    await vite.close()
  }
}
