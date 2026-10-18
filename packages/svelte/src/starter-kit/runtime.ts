import {
  ActionRunner,
  Translator,
  resolveRequestErrorNotification,
  type AlfakitOptions,
} from '@alfakit/core'
import { showToast } from '../components/notifications/toast'
import type { AlfakitContextValue, AnyComponent } from '../context.svelte'
import { preloadIcons } from '../lib/icons'
import AlfakitPage from '../pages/AlfakitPage.svelte'
import { createDefaultRegistry } from '../registry'
import StarterKitContentLayout from './StarterKitContentLayout.svelte'

export interface StarterKitPageOptions extends Pick<
  AlfakitOptions<AnyComponent>,
  'components' | 'pages' | 'chartFormatters' | 'chartPlugins' | 'richEditorExtensions'
> {
  /**
   * The host layout Alfakit pages render in, usually the starter kit's `AppLayout`
   * (`@/layouts/AppLayout.svelte`). It receives the page's breadcrumbs as `{ title, href }`.
   * `null` renders the pages without a host layout.
   */
  layout?: AnyComponent | null
}

// One context for the browser session (it survives navigations between host and Alfakit
// pages); a server render builds one per request so concurrent renders never share a locale.
let browserContext: AlfakitContextValue | null = null

function createStarterKitContext(options: StarterKitPageOptions): AlfakitContextValue {
  const registry = createDefaultRegistry()
    .register('layout:app', StarterKitContentLayout as AnyComponent)
    .registerMany(options.components ?? {})
  const translator = new Translator()

  return {
    registry,
    pages: { 'Alfakit/Page': AlfakitPage as AnyComponent, ...options.pages },
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
