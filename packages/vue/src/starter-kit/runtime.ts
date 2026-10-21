import {
  ActionRunner,
  Translator,
  resolveRequestErrorNotification,
  type AlfakitOptions,
} from '@alfakit/core'
import { showToast } from '../components/notifications/flash-toasts'
import type { AlfakitContextValue, AnyComponent } from '../context'
import AuthLayout from '../layouts/AuthLayout.vue'
import { lazyPanelLayouts } from '../layouts/lazy-layouts'
import { discoverComponents } from '../lib/discovery'
import { preloadIcons } from '../lib/icons'
import AlfakitPage from '../pages/AlfakitPage.vue'
import { createDefaultRegistry } from '../registry'
import StarterKitContentLayout from './StarterKitContentLayout.vue'

export interface StarterKitPageOptions extends Pick<
  AlfakitOptions<AnyComponent>,
  'components' | 'pages' | 'chartFormatters' | 'chartPlugins' | 'richEditorExtensions'
> {
  /**
   * The host layout Alfakit pages render in, usually the starter kit's `AppLayout`
   * (`@/layouts/AppLayout.vue`). It receives the page's breadcrumbs as `{ title, href }`.
   * `null` renders the pages without a host layout.
   */
  layout?: AnyComponent | null
  /**
   * Auto-registered custom components, as for `createAlfakit({ discover })`: pass
   * `import.meta.glob('../../alfakit/{fields,columns,entries,widgets,pages,components,blocks}/**\/*.vue')`
   * from `resources/js/pages/Alfakit/Page.vue` and every file there registers under its name.
   */
  discover?: AlfakitOptions<AnyComponent>['discover']
}

// One context for the browser session (it survives navigations between host and Alfakit
// pages); a server render builds one per request so concurrent renders never share a locale.
let browserContext: AlfakitContextValue | null = null

function createStarterKitContext(options: StarterKitPageOptions): AlfakitContextValue {
  // The host's layout replaces the panel's. Auth pages (invitations, tenant registration)
  // keep the panel's card; the fullscreen layout loads on demand.
  // Auto-registered files sit between the built-ins and the explicit `components` / `pages`.
  const discovered = discoverComponents(options.discover)
  const registry = createDefaultRegistry()
    .registerMany(lazyPanelLayouts)
    .register('layout:auth', AuthLayout)
    .register('layout:app', StarterKitContentLayout)
    .registerMany(discovered.components)
    .registerMany(options.components ?? {})
  const translator = new Translator()

  return {
    registry,
    pages: { 'Alfakit/Page': AlfakitPage, ...discovered.pages, ...options.pages },
    translator,
    actions: new ActionRunner({
      endpoints: { action: '', modal: '' },
      // A failed action request is a toast, never a silent no-op.
      onError: (error) => {
        const notification = resolveRequestErrorNotification(
          error,
          null,
          (key, replacements, fallback) => translator.t(key, replacements, fallback),
        )

        if (notification) showToast(notification)
      },
    }),
  }
}

/** @internal The context of the starter kit root (shared by the browser session). */
export function starterKitContext(options: StarterKitPageOptions): AlfakitContextValue {
  // Panel pages draw named icons: fetch the name → chunk map with the page.
  preloadIcons()

  if (typeof window === 'undefined') return createStarterKitContext(options)

  browserContext ??= createStarterKitContext(options)

  return browserContext
}
