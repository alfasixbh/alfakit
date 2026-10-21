import {
  configureCharts,
  registerRichEditorExtensions,
  starterKitBreadcrumbsFromProps,
  usesStarterKitHostLayout,
} from '@alfakit/core'
import AlfakitStarterKitRoot from './AlfakitStarterKitRoot.svelte'
import type { StarterKitPageOptions } from './runtime'

export type { StarterKitPageOptions } from './runtime'

/**
 * The `layout` export of the host's `resources/js/pages/Alfakit/Page.svelte` (written by
 * `alfakit:install --starter-kit`): the host layout (with the page's breadcrumbs as
 * `{ title, href }`), then Alfakit's root. The page itself renders `<AlfakitPage />`, so
 * Inertia's page resolution, the root view's page preload and SSR all find it like any other
 * host page.
 *
 * ```svelte
 * <script module lang="ts">
 *   import { createStarterKitLayout } from '@alfakit/svelte'
 *   import AppLayout from '@/layouts/AppLayout.svelte'
 *
 *   export const layout = createStarterKitLayout({ layout: AppLayout })
 * </script>
 *
 * <script lang="ts">
 *   import { AlfakitPage } from '@alfakit/svelte'
 * </script>
 *
 * <AlfakitPage />
 * ```
 */
export function createStarterKitLayout(options: StarterKitPageOptions = {}) {
  // `'js:name'` chart option callbacks, Chart.js plugins and rich editor extensions.
  configureCharts(options)
  registerRichEditorExtensions(options.richEditorExtensions ?? {})

  return (props: Record<string, unknown>) => [
    ...(options.layout && usesStarterKitHostLayout(props)
      ? [[options.layout, { breadcrumbs: starterKitBreadcrumbsFromProps(props) }]]
      : []),
    [AlfakitStarterKitRoot, { options }],
  ]
}
