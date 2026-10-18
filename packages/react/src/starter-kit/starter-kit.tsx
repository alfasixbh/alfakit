import {
  ActionRunner,
  STARTER_KIT_TOASTER_ID,
  Translator,
  configureCharts,
  installStarterKitRuntime,
  registerRichEditorExtensions,
  resolveRequestErrorNotification,
  starterKitBreadcrumbsFromProps,
  syncStarterKitPage,
  type AlfakitOptions,
  type AlfakitPageProps,
  type StarterKitBreadcrumb,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { setToasterId, showToast } from '../components/notifications/flash-toasts'
import { Slot } from '../components/panel/slot'
import {
  AlfakitProvider,
  useAlfakitProps,
  type AlfakitContextValue,
  type AnyComponent,
} from '../context'
import { AlfakitRoot } from '../create-alfakit'
import { MAX_WIDTHS, type AppLayoutProps } from '../layouts/app-layout'
import { preloadIcons } from '../lib/icons'
import { cn } from '../lib/utils'
import { AlfakitPage } from '../pages/page'
import { createDefaultRegistry } from '../registry'

/** The host's layout, as the starter kits' `AppLayout` takes its props. */
export type StarterKitLayout = ComponentType<{
  breadcrumbs?: StarterKitBreadcrumb[]
  children: ReactNode
}>

export interface StarterKitPageOptions extends Pick<
  AlfakitOptions<AnyComponent>,
  'components' | 'pages' | 'chartFormatters' | 'chartPlugins' | 'richEditorExtensions'
> {
  /**
   * The host layout Alfakit pages render in, usually the starter kit's `AppLayout`
   * (`@/layouts/app-layout`). It receives the page's breadcrumbs as `{ title, href }`.
   * `null` renders the pages without a host layout.
   */
  layout?: StarterKitLayout | null
}

/**
 * The content area of an Alfakit page inside the host layout: what `layout:app` renders in
 * starter kit mode instead of Alfakit's sidebar and top bar. Replace it with
 * `createStarterKitPage({ components: { 'layout:app': MyContent } })`.
 */
export function StarterKitContentLayout({ children, maxContentWidth }: AppLayoutProps) {
  const props = useAlfakitProps()
  // The host's pages fill the content area, so starter kit pages default to the full width.
  const width = maxContentWidth ?? props.alfakit.maxContentWidth ?? 'full'

  return (
    <div
      data-slot="content"
      data-alfakit-embedded=""
      className={cn(
        'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
        MAX_WIDTHS[width] ?? 'max-w-full',
      )}
    >
      <Slot name="content.start" />
      {children}
      <Slot name="content.end" />
    </div>
  )
}

// One context for the browser session (it survives navigations between host and Alfakit
// pages); a server render builds one per request so concurrent renders never share a locale.
let browserContext: AlfakitContextValue | null = null

function createStarterKitContext(options: StarterKitPageOptions): AlfakitContextValue {
  const registry = createDefaultRegistry()
    .register('layout:app', StarterKitContentLayout)
    .registerMany(options.components ?? {})
  const translator = new Translator()

  return {
    registry,
    pages: { 'Alfakit/Page': AlfakitPage, ...options.pages },
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

function starterKitContext(options: StarterKitPageOptions): AlfakitContextValue {
  if (typeof window === 'undefined') return createStarterKitContext(options)

  browserContext ??= createStarterKitContext(options)

  return browserContext
}

/**
 * The Inertia layout around every Alfakit page in starter kit mode, inside the host layout:
 * Alfakit's context, modals, toasts and the reading direction. It stays mounted while the
 * user moves between Alfakit pages.
 */
export function AlfakitStarterKitRoot({
  options,
  children,
}: {
  options?: StarterKitPageOptions
  children?: ReactNode
}) {
  const [context] = useState(() => starterKitContext(options ?? {}))
  const props = usePage<AlfakitPageProps>().props
  const panel = props.alfakit

  // Endpoints and error notifications follow the open page.
  if (panel) {
    context.actions.setEndpoints({
      action: panel.endpoints.action ?? '',
      modal: panel.endpoints.modal ?? '',
    })
  }

  useEffect(() => {
    syncStarterKitPage(props)
  }, [props])

  useEffect(() => {
    installStarterKitRuntime(
      (notification) => showToast(notification),
      (key, replacements, fallback) => context.translator.t(key, replacements, fallback),
    )
    setToasterId(STARTER_KIT_TOASTER_ID)

    return () => {
      // A host page is open: its errors and toasts are the host's again.
      syncStarterKitPage(null)
      setToasterId(undefined)
    }
  }, [context])

  return (
    <AlfakitProvider value={context}>
      <AlfakitRoot toasterId={STARTER_KIT_TOASTER_ID}>{children}</AlfakitRoot>
    </AlfakitProvider>
  )
}

/**
 * The page component for `Alfakit/Page` in a starter kit app: the host's
 * `resources/js/pages/Alfakit/Page.tsx` (written by `alfakit:install --starter-kit`) exports it,
 * so Inertia's page resolution, the root view's page preload and SSR all find it like any
 * other host page.
 *
 * ```tsx
 * import { createStarterKitPage } from '@alfakit/react'
 * import AppLayout from '@/layouts/app-layout'
 *
 * export default createStarterKitPage({ layout: AppLayout })
 * ```
 */
export function createStarterKitPage(options: StarterKitPageOptions = {}) {
  // Panel pages draw named icons: fetch `lucide-react/dynamic` with the page.
  preloadIcons()
  // `'js:name'` chart option callbacks, Chart.js plugins and rich editor extensions.
  configureCharts(options)
  registerRichEditorExtensions(options.richEditorExtensions ?? {})

  function AlfakitStarterKitPage() {
    return <AlfakitPage />
  }

  // A layout callback: the host layout (with the page's breadcrumbs), then Alfakit's root.
  AlfakitStarterKitPage.layout = (props: Record<string, unknown>) => [
    ...(options.layout
      ? [[options.layout, { breadcrumbs: starterKitBreadcrumbsFromProps(props) }] as const]
      : []),
    [AlfakitStarterKitRoot, { options }] as const,
  ]

  return AlfakitStarterKitPage
}
