import {
  ActionRunner,
  Translator,
  applyDocumentLocale,
  applyPanelTheme,
  configureCharts,
  configureRealtime,
  debugRecorder,
  documentNonce,
  effectiveErrorNotifications,
  initializeAppearance,
  installErrorNotifications,
  installPrefetchInvalidation,
  installSpaUrlExceptions,
  registerRichEditorExtensions,
  reloadOnExpiredPage,
  resolveRequestErrorNotification,
  setRequestErrorReporter,
  whenIdle,
  type AlfakitOptions,
  type AlfakitPageProps,
  type ErrorNotificationsSchema,
  type PanelSchema,
} from '@alfakit/core'
import type { InertiaAppSSRResponse, Page } from '@inertiajs/core'
import { createInertiaApp, router } from '@inertiajs/vue3'
import type { App, DefineComponent } from 'vue'
import AlfakitRoot from './AlfakitRoot.vue'
import { showToast } from './components/notifications/flash-toasts'
import { ALFAKIT_KEY, type AlfakitContextValue, type AnyComponent } from './context'
import { panelLayouts } from './layouts/panel-layouts'
import { discoverComponents } from './lib/discovery'
import { preloadIcons } from './lib/icons'
import AlfakitPage from './pages/AlfakitPage.vue'
import { builtInComponents, createDefaultRegistry } from './registry'

export interface CreateAlfakitOptions extends AlfakitOptions<AnyComponent> {
  /** Configure the Vue app (e.g. register your own plugins). Runs for server renders too. */
  withApp?: (app: App) => void
}

/** Renders one Inertia page to HTML: what `createInertiaApp` returns on the server. */
export type AlfakitRenderFunction = (
  page: Page,
  renderToString: (app: App) => Promise<string>,
) => Promise<InertiaAppSSRResponse>

/**
 * The Inertia app shared by `createAlfakit()` (browser) and `createAlfakitServer()` (Node):
 * the same registry, pages, layout and plugins. In the browser it mounts, or hydrates
 * server-rendered markup; on the server (no `window`) Inertia returns a render function.
 */
export function bootAlfakit(
  options: CreateAlfakitOptions = {},
): Promise<void | AlfakitRenderFunction> {
  // Auto-registered files sit between the built-ins and the explicit `components` / `pages`.
  const discovered = discoverComponents(options.discover)
  const registry = createDefaultRegistry()
    .registerMany(panelLayouts)
    .registerMany(discovered.components)
    .registerMany(options.components ?? {})
  const pages: Record<string, AnyComponent> = {
    'Alfakit/Page': AlfakitPage,
    ...discovered.pages,
    ...options.pages,
  }
  const isServer = typeof window === 'undefined'

  // Every panel page draws named icons: fetch the name → chunk map while booting.
  preloadIcons()

  // `'js:name'` chart option callbacks and Chart.js plugins for every chart widget.
  configureCharts(options)
  // `createAlfakit({ echo })`: Laravel Echo for `Panel::realtime()` without `window.Echo`.
  if (options.echo !== undefined && !isServer) configureRealtime(null, { echo: options.echo })
  // Rich content plugin extensions, loaded when an editor needs them.
  registerRichEditorExtensions(options.richEditorExtensions ?? {})

  // The browser's current panel, read by the SPA-exception and error-notification listeners.
  let currentPanel: PanelSchema | null = null
  // The open page's error notifications (its override, else the panel's).
  let currentErrorNotifications: ErrorNotificationsSchema | false | undefined

  // One translator and action runner for the browser session; a server render gets fresh
  // ones per request so concurrent renders never share a locale or endpoints.
  const createContext = (): AlfakitContextValue => {
    const translator = new Translator()

    return {
      registry,
      pages,
      translator,
      // The runner's endpoints are refreshed on every navigation from the shared props.
      actions: new ActionRunner({
        endpoints: { action: '', modal: '' },
        // A failed action request is a toast, never a silent no-op.
        onError: (error) => {
          const notification = resolveRequestErrorNotification(
            error,
            currentErrorNotifications,
            (key, replacements, fallback) => translator.t(key, replacements, fallback),
          )

          if (notification) showToast(notification)
        },
      }),
    }
  }

  const browserContext = isServer ? null : createContext()

  const sync = (context: AlfakitContextValue, page: Page, applyToDocument: boolean) => {
    const props = page.props as unknown as AlfakitPageProps
    const panel = props.alfakit

    if (!panel) return

    if (context === browserContext) {
      currentPanel = panel
      currentErrorNotifications = effectiveErrorNotifications(panel, props.page)
    }

    context.translator.setTranslations(panel.translations ?? {})
    context.translator.setLocale(panel.localization?.tag ?? 'en')
    context.actions.setEndpoints({
      action: panel.endpoints.action ?? '',
      modal: panel.endpoints.modal ?? '',
    })

    if (applyToDocument) {
      applyDocumentLocale(panel.localization)
      applyPanelTheme(panel)
      // Internal requests and form stores are only recorded while the page carries the debug prop.
      debugRecorder.setEnabled(props.alfakitDebug !== undefined)
    }
  }

  if (browserContext) {
    router.on('navigate', (event) => sync(browserContext, event.detail.page, true))
    reloadOnExpiredPage()
    // Prefetched pages and deferred table totals are dropped after every mutation.
    installPrefetchInvalidation()
    installSpaUrlExceptions(() => currentPanel)
    installErrorNotifications(
      () => ({ errorNotifications: currentErrorNotifications }),
      (notification) => showToast(notification),
    )
    // Failed internal requests without their own handler (form live refreshes, step
    // validation) show the configured error notification too.
    setRequestErrorReporter((error) => {
      const notification = resolveRequestErrorNotification(
        error,
        currentErrorNotifications,
        (key, replacements, fallback) => browserContext.translator.t(key, replacements, fallback),
      )

      if (notification) showToast(notification)
    })
  }

  return createInertiaApp<AlfakitPageProps>({
    title: (title) => title,
    progress: options.progress === undefined ? { color: 'var(--primary)' } : options.progress,
    // The page's CSP nonce, so the progress bar's injected <style> passes a nonce-based policy.
    nonce: documentNonce(),
    resolve: (name, page) => {
      const component = pages[name]

      if (!component) {
        throw new Error(
          `Alfakit: page component "${name}" is not registered. Pass it to createAlfakit({ pages }).`,
        )
      }

      // The page's auto-registered components load first, so the server render and the
      // hydration both show them (no flash, no mismatch).
      // Built-ins split per type (`builtInComponents`) load the same way.
      const loading = [
        builtInComponents.preloadFor(page),
        discovered.discovery.preloadFor(page),
      ].filter((promise) => promise !== undefined)
      const pending = loading.length > 0 ? Promise.all(loading) : undefined

      return pending
        ? pending.then(() => component as DefineComponent)
        : (component as DefineComponent)
    },
    layout: () => AlfakitRoot,
    withApp: (app, { page, ssr }) => {
      const context = browserContext ?? createContext()

      sync(context, page as unknown as Page, !ssr)

      // Panel pages only: other pages (`pages` option) follow the application's own dark
      // mode, like standalone components do.
      const panel = (page.props as unknown as Partial<AlfakitPageProps>).alfakit

      if (!ssr && panel) {
        initializeAppearance(panel)
      }

      app.provide(ALFAKIT_KEY, context)
      options.withApp?.(app)
    },
  }) as Promise<void | AlfakitRenderFunction>
}

/**
 * Boot the Alfakit panel frontend. Call once from your panel entry file. Markup rendered by
 * `createAlfakitServer()` (`@alfakit/vue/server`) is hydrated instead of re-rendered.
 *
 * ```ts
 * createAlfakit({
 *   // Files in resources/js/alfakit/fields, columns, … register themselves.
 *   discover: import.meta.glob('./{fields,columns,entries,widgets,pages,components,blocks}/**\/*.vue'),
 *   components: { 'map-picker': MapPicker },
 * })
 * ```
 */
export async function createAlfakit(options: CreateAlfakitOptions = {}): Promise<void> {
  await bootAlfakit(options)

  // After the first render: the remaining split built-ins (action modals' fields).
  whenIdle(() => void builtInComponents.preloadAll())
}
