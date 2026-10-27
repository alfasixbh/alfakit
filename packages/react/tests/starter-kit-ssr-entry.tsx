import type { Page } from '@inertiajs/core'
import { createInertiaApp } from '@inertiajs/react'
import { renderToString } from 'react-dom/server'
import { createStarterKitPage } from '../src/starter-kit'

/**
 * A starter kit's own `ssr.tsx`: Inertia resolves the host's `Alfakit/Page` (which
 * `createStarterKitPage()` builds), with no AlfaKit SSR entry and no page preload.
 */
const StarterKitPage = createStarterKitPage({ layout: null })

export async function renderStarterKit(page: Page): Promise<string> {
  const render = (await createInertiaApp({
    resolve: () => StarterKitPage,
    setup: ({ App, props }) => <App {...props} />,
  })) as unknown as (page: Page, render: typeof renderToString) => Promise<{ body: string }>

  return (await render(page, renderToString)).body
}
