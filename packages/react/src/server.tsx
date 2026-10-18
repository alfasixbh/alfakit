import { discoveryKey } from '@alfakit/core'
import type { InertiaAppResponse, Page } from '@inertiajs/core'
import { renderToString } from 'react-dom/server'
import {
  bootAlfakit,
  type AlfakitRenderFunction,
  type CreateAlfakitOptions,
} from './create-alfakit'

export interface CreateAlfakitServerOptions extends CreateAlfakitOptions {
  /**
   * Render Inertia pages that are neither Alfakit pages (they lack the shared `alfakit` prop)
   * nor registered with `pages`, e.g. the rest of your application. Without it those pages
   * render in the browser only.
   */
  fallback?: (page: Page) => InertiaAppResponse
}

/**
 * Server-side rendering for Alfakit panels: returns the render callback for Inertia's SSR
 * server. Pass the same components and pages as `createAlfakit()` so both sides render
 * the same tree.
 *
 * ```tsx
 * // resources/js/ssr.tsx
 * import createServer from '@inertiajs/react/server'
 * import { createAlfakitServer } from '@alfakit/react/server'
 *
 * createServer(createAlfakitServer({ components: { 'map-picker': MapPicker } }))
 * ```
 */
export function createAlfakitServer(
  options: CreateAlfakitServerOptions = {},
): (page: Page) => InertiaAppResponse {
  const { fallback, ...alfakitOptions } = options
  let render: Promise<AlfakitRenderFunction> | null = null
  const discoveredPages = new Set(
    Object.keys(alfakitOptions.discover ?? {}).flatMap((path) => {
      const key = discoveryKey(path)

      return key?.section === 'pages' ? [key.key] : []
    }),
  )

  return async (page) => {
    // Panel pages and the pages registered with `pages` render here; any other page goes to
    // `fallback`, or `null` tells Laravel to fall back to client-side rendering for it.
    const registered =
      (alfakitOptions.pages !== undefined && page.component in alfakitOptions.pages) ||
      discoveredPages.has(page.component)

    if (!(page.props as Record<string, unknown>).alfakit && !registered) {
      return fallback ? fallback(page) : (null as unknown as void)
    }

    render ??= bootAlfakit(alfakitOptions).then((result) => {
      if (typeof result !== 'function') {
        throw new Error('Alfakit: createAlfakitServer() must run on the server (no `window`).')
      }

      return result
    })

    return (await render)(page, renderToString)
  }
}

export type { CreateAlfakitOptions } from './create-alfakit'
