// @vitest-environment node
import type { StandaloneComponentSchema } from '@alfakit/core'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'

/**
 * `<AlfakitComponent>` must render on the server (no `window`, no Inertia app) the way a
 * host application's SSR bundle renders its own pages.
 */
it('server-renders a standalone form without window or an Inertia app', async () => {
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
    const { renderStandalone } = (await vite.ssrLoadModule('/tests/standalone-ssr-entry.tsx')) as {
      renderStandalone: (component: StandaloneComponentSchema) => string
    }

    const html = renderStandalone(contactForm as unknown as StandaloneComponentSchema)

    expect(html).toContain('data-slot="standalone"')
    expect(html).toContain('Contact us')
    expect(html).toContain('hi@example.com')
    expect(html).toContain('Submit')
  } finally {
    await vite.close()
  }
}, 60_000)
