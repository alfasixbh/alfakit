import {
  ActionRunner,
  PANEL_TOAST_OFFSET,
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
  overlayPlacementDirection,
  registerRichEditorExtensions,
  reloadOnExpiredPage,
  resolveRequestErrorNotification,
  resolveToastPosition,
  setIconAliases,
  setRequestErrorReporter,
  whenIdle,
  type AlfakitOptions,
  type AlfakitPageProps,
  type ErrorNotificationsSchema,
  type PanelSchema,
} from '@alfakit/core'
import type { InertiaAppSSRResponse, Page } from '@inertiajs/core'
import { createInertiaApp, router, usePage } from '@inertiajs/react'
import { Direction } from 'radix-ui'
import {
  StrictMode,
  createElement,
  useLayoutEffect,
  type ReactElement,
  type ReactNode,
} from 'react'
import { ActionModals } from './components/actions/action-modals'
import { DevToolsSlot } from './components/dev-tools/dev-tools-slot'
import { FlashToasts, showToast } from './components/notifications/flash-toasts'
import { RealtimeNotifications } from './components/notifications/realtime-notifications'
import { ImpersonationBanner } from './components/panel/impersonation-banner'
import { PwaManager } from './components/panel/pwa'
import { SchemaContractGuard } from './components/panel/schema-contract-guard'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { AlfakitProvider, useAlfakit, type AlfakitContextValue, type AnyComponent } from './context'
import { panelLayouts } from './layouts/panel-layouts'
import { discoverComponents } from './lib/discovery'
import { preloadIcons } from './lib/icons'
import { AlfakitPage } from './pages/page'
import { builtInComponents, createDefaultRegistry } from './registry'

/**
 * Rendered inside Inertia's page tree, so it follows the current page: the reading
 * direction for Radix primitives, modals and toasts.
 */
export function AlfakitRoot({
  children,
  toasterId,
}: {
  children: ReactNode
  /** Starter kit mode: Alfakit's toaster gets an id so the host's id-less one never doubles its toasts. */
  toasterId?: string
}) {
  const panel = usePage<AlfakitPageProps>().props.alfakit
  const { translator, registry } = useAlfakit()
  const localization = panel?.localization
  const direction = localization?.direction ?? 'ltr'

  // Every visit (including the redirect after a language switch) may carry new strings,
  // so the translator is updated before children render.
  if (panel) {
    translator.setTranslations(panel.translations ?? {})
    translator.setLocale(localization?.tag ?? 'en')
    // Chrome icons replaced with `Icons::register()`, also in a server render, so the server
    // and the browser draw the same glyph (W-V3-28).
    setIconAliases(panel.theme?.icons)
  }

  // Starter kit mode: the host app owns `<html lang dir>` (its own pages and layout are not
  // mirrored); `AlfakitStarterKitRoot` puts the direction on Alfakit's own root element.
  const ownsDocument = panel?.starterKit !== true

  useLayoutEffect(() => {
    if (ownsDocument) applyDocumentLocale(localization)
  }, [localization, ownsDocument])

  useLayoutEffect(() => {
    applyPanelTheme(panel)
  }, [panel])

  return (
    <Direction.Provider dir={direction}>
      <TooltipProvider delayDuration={0}>
        <SchemaContractGuard panel={panel}>{children}</SchemaContractGuard>
        <ActionModals />
        <FlashToasts />
        <RealtimeNotifications />
        {/* `Panel::pwa()`: service worker and the "new version" toast. */}
        <PwaManager />
        {/* Schema inspector: renders (and loads its code) only with `alfakitDevTools`. */}
        <DevToolsSlot />
        {/* Replace with createAlfakit({ components: { 'panel:impersonation-banner': … } }). */}
        {panel?.impersonation &&
          createElement(registry.resolve('panel:impersonation-banner') ?? ImpersonationBanner, {
            impersonation: panel.impersonation,
          })}
        <Toaster
          id={toasterId}
          position={resolveToastPosition(
            panel?.toastPosition,
            overlayPlacementDirection(direction, panel?.starterKit),
          )}
          offset={PANEL_TOAST_OFFSET}
          mobileOffset={PANEL_TOAST_OFFSET}
          dir={direction}
          richColors
          closeButton
        />
      </TooltipProvider>
    </Direction.Provider>
  )
}

export interface CreateAlfakitOptions extends AlfakitOptions<AnyComponent> {
  /** Wrap the whole app (e.g. with your own providers). */
  withApp?: (app: ReactNode) => ReactNode
  strictMode?: boolean
}

/** Renders one Inertia page to HTML: what `createInertiaApp` returns on the server. */
export type AlfakitRenderFunction = (
  page: Page,
  renderToString: (element: ReactElement) => string,
) => Promise<InertiaAppSSRResponse>

/**
 * The Inertia app shared by `createAlfakit()` (browser) and `createAlfakitServer()` (Node):
 * the same registry, pages, layout and providers. In the browser it mounts, or hydrates
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

  // Every panel page draws named icons: fetch `lucide-react/dynamic` while booting.
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
      const pending = [
        builtInComponents.preloadFor(page),
        discovered.discovery.preloadFor(page),
      ].filter((promise) => promise !== undefined)

      return pending.length > 0 ? Promise.all(pending).then(() => component) : component
    },
    layout: () => AlfakitRoot,
    strictMode: options.strictMode ?? true,
    withApp: (app, { page, ssr }) => {
      const context = browserContext ?? createContext()

      sync(context, page as Page, !ssr)

      // Panel pages only: other pages (`pages` option) follow the application's own dark
      // mode, like standalone components do.
      const panel = (page.props as unknown as Partial<AlfakitPageProps>).alfakit

      if (!ssr && panel) {
        initializeAppearance(panel)
      }

      const tree = <AlfakitProvider value={context}>{app}</AlfakitProvider>

      const wrapped = options.withApp ? options.withApp(tree) : tree

      return options.strictMode === false ? <>{wrapped}</> : <StrictMode>{wrapped}</StrictMode>
    },
  }) as Promise<void | AlfakitRenderFunction>
}

/**
 * Boot the Alfakit panel frontend. Call once from your panel entry file. Markup rendered by
 * `createAlfakitServer()` (`@alfakit/react/server`) is hydrated instead of re-rendered.
 *
 * ```tsx
 * createAlfakit({
 *   // Files in resources/js/alfakit/fields, columns, … register themselves.
 *   discover: import.meta.glob('./{fields,columns,entries,widgets,pages,components,blocks}/**\/*.tsx'),
 *   components: { 'map-picker': MapPicker },
 * })
 * ```
 */
export async function createAlfakit(options: CreateAlfakitOptions = {}): Promise<void> {
  await bootAlfakit(options)

  // After the first render: the remaining split built-ins (action modals' fields).
  whenIdle(() => void builtInComponents.preloadAll())
}
