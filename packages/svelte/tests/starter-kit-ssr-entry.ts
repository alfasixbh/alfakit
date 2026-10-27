import type { Page } from '@inertiajs/core'
import { createInertiaApp } from '@inertiajs/svelte'
import { render } from 'svelte/server'
import { AlfakitPage } from '../src/pages'
import { createStarterKitLayout } from '../src/starter-kit'

/**
 * A starter kit's own `ssr.ts`: Inertia resolves the host's `Alfakit/Page.svelte` (its
 * `layout` from `createStarterKitLayout()`), with no AlfaKit SSR entry and no page preload.
 */
const starterKitPage = { default: AlfakitPage, layout: createStarterKitLayout({ layout: null }) }

export async function renderStarterKit(page: Page): Promise<string> {
  const renderPage = (await createInertiaApp({
    resolve: () => starterKitPage as never,
  })) as unknown as (page: Page, renderer: typeof render) => Promise<{ body: string }>

  return (await renderPage(page, render)).body
}
