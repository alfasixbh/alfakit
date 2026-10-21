import {
  configureCharts,
  registerRichEditorExtensions,
  starterKitBreadcrumbsFromProps,
  usesStarterKitHostLayout,
} from '@alfakit/core'
import { defineComponent, h, markRaw } from 'vue'
import AlfakitPage from '../pages/AlfakitPage.vue'
import AlfakitStarterKitRoot from './AlfakitStarterKitRoot.vue'
import type { StarterKitPageOptions } from './runtime'

export type { StarterKitPageOptions } from './runtime'

/**
 * The page component for `Alfakit/Page` in a starter kit app: the host's
 * `resources/js/pages/Alfakit/Page.vue` (written by `alfakit:install --starter-kit`) exports
 * it, so Inertia's page resolution, the root view's page preload and SSR all find it like any
 * other host page.
 *
 * ```vue
 * <script lang="ts">
 * import { createStarterKitPage } from '@alfakit/vue'
 * import AppLayout from '@/layouts/AppLayout.vue'
 *
 * export default createStarterKitPage({ layout: AppLayout })
 * </script>
 * ```
 */
export function createStarterKitPage(options: StarterKitPageOptions = {}) {
  // `'js:name'` chart option callbacks, Chart.js plugins and rich editor extensions.
  configureCharts(options)
  registerRichEditorExtensions(options.richEditorExtensions ?? {})

  const page = defineComponent({
    name: 'AlfakitStarterKitPage',
    setup: () => () => h(AlfakitPage),
  })

  // A layout callback: the host layout (with the page's breadcrumbs), then Alfakit's root.
  return Object.assign(page, {
    layout: (props: Record<string, unknown>) => [
      ...(options.layout && usesStarterKitHostLayout(props)
        ? [[markRaw(options.layout), { breadcrumbs: starterKitBreadcrumbsFromProps(props) }]]
        : []),
      [AlfakitStarterKitRoot, { options }],
    ],
  })
}
