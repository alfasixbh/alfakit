import {
  ActionRunner,
  Translator,
  applyDocumentLocale,
  applyPanelTheme,
  configureCharts,
  configureRealtime,
  debugRecorder,
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
import { createInertiaApp, router } from '@inertiajs/svelte'
import type { render as svelteRender } from 'svelte/server'
import AlfakitRoot from './AlfakitRoot.svelte'
import { showToast } from './components/notifications/toast'
import {
  ALFAKIT_CONTEXT,
  setGlobalAlfakitContext,
  type AlfakitContextValue,
  type AnyComponent,
} from './context.svelte'
import { discoverComponents } from './lib/discovery'
import { APP_MOUNTED, createAppMounted } from './lib/hydration.svelte'
import { preloadIcons } from './lib/icons'
import AlfakitPage from './pages/AlfakitPage.svelte'
import { builtInComponents, createDefaultRegistry } from './registry'

export interface CreateAlfakitOptions extends AlfakitOptions<AnyComponent> {
  /**
   * Extend the Svelte context passed to the app (e.g. with your own providers' values).
   * Runs for server renders too.
   */
  withApp?: (context: Map<unknown, unknown>, alfakit: AlfakitContextValue) => void
}

/** Renders one Inertia page to HTML: what `createInertiaApp` returns on the server. */
export type AlfakitRenderFunction = (
  page: Page,
  render: typeof svelteRender,
) => Promise<InertiaAppSSRResponse>

/**
 * The Inertia app shared by `createAlfakit()` (browser) and `createAlfakitServer()` (Node):
 * the same registry, pages, layout and context. In the browser it mounts, or hydrates
 * server-rendered markup; on the server (no `window`) Inertia returns a render function.
 */
export function bootAlfakit(
  options: CreateAlfakitOptions = {},
): Promise<void | AlfakitRenderFunction> {
  // Auto-registered files sit between the built-ins and the explicit `components` / `pages`.
  const discovered = discoverComponents(options.discover)
  const registry = createDefaultRegistry()
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
    // The fallback for code outside the component tree; never set on the server, where
    // it would be shared between requests.
    setGlobalAlfakitContext(browserContext)
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
    progress: options.progress === undefined ? { color: 'var(--primary)' } : options.progress,
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

      return pending ? pending.then(() => ({ default: component })) : { default: component }
    },
    layout: () => AlfakitRoot,
    withApp: (context: Map<unknown, unknown>, { page, ssr }: { page: Page; ssr: boolean }) => {
      const value = browserContext ?? createContext()

      sync(value, page as Page, !ssr)

      // Panel pages only: other pages (`pages` option) follow the application's own dark
      // mode, like standalone components do.
      const panel = (page.props as unknown as Partial<AlfakitPageProps>).alfakit

      if (!ssr && panel) {
        initializeAppearance(panel)
      }

      context.set(ALFAKIT_CONTEXT, value)
      // Per app: lazily loaded parts render their server markup until this app hydrated.
      context.set(APP_MOUNTED, createAppMounted())
      options.withApp?.(context, value)
    },
  }) as Promise<void | AlfakitRenderFunction>
}

/**
 * Boot the Alfakit panel frontend. Call once from your panel entry file. Markup rendered by
 * `createAlfakitServer()` (`@alfakit/svelte/server`) is hydrated instead of re-rendered.
 *
 * ```ts
 * createAlfakit({
 *   // Files in resources/js/alfakit/fields, columns, … register themselves.
 *   discover: import.meta.glob('./{fields,columns,entries,widgets,pages,components,blocks}/**\/*.svelte'),
 *   components: { 'map-picker': MapPicker },
 * })
 * ```
 */
export async function createAlfakit(options: CreateAlfakitOptions = {}): Promise<void> {
  await bootAlfakit(options)

  // After the first render: the remaining split built-ins (action modals' fields).
  whenIdle(() => void builtInComponents.preloadAll())
}
