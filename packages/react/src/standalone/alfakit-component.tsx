import {
  StandaloneComponentState,
  findStandalonePropName,
  registerStandaloneProp,
  standalonePanelSchema,
  type ContentBlock,
  type StandaloneComponentSchema,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { Direction } from 'radix-ui'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageActionProvider } from '../components/actions/action-context'
import { ActionList } from '../components/actions/action-list'
import { ActionModals } from '../components/actions/action-modals'
import { TooltipProvider } from '../components/ui/tooltip'
import {
  AlfakitProvider,
  StandaloneProvider,
  useOptionalAlfakit,
  type AlfakitContextValue,
  type AnyComponent,
} from '../context'
import { cn } from '../lib/utils'
import { ContentBlockRenderer } from '../pages/page'
import { AlfakitToaster } from './alfakit-toaster'
import {
  claimToaster,
  createStandaloneContext,
  createStandaloneRegistry,
  ensureStandaloneRuntime,
  hasToaster,
} from './runtime'

export interface AlfakitComponentProps {
  /** The payload: `ContactForm::make()` passed as an Inertia prop. */
  component: StandaloneComponentSchema
  /** Renderer overrides for this instance (`{ TextInput: MyInput }`), on top of `configureAlfakit()`. */
  components?: Record<string, AnyComponent>
  className?: string
  /** Rendered above the content blocks (after the heading and actions). */
  header?: ReactNode
  /** Rendered below the content blocks. */
  footer?: ReactNode
  /** Render each content block yourself (e.g. to lay a form and a table side by side). */
  children?: (blocks: ContentBlock[], render: (block: ContentBlock) => ReactNode) => ReactNode
}

/**
 * Renders an Alfakit component outside a panel: a form, table, infolist, widgets or any mix
 * (`AlfaSix\Alfakit\Standalone\*`) in any Inertia page of the application. Needs no
 * `createAlfakit()` and no panel layout: it provides its own translator, registry, action
 * runner and modals, and inherits the application's shadcn tokens.
 *
 * ```tsx
 * <AlfakitComponent component={orders} className="max-w-4xl" />
 * ```
 */
export function AlfakitComponent({
  component,
  components,
  className,
  header,
  footer,
  children,
}: AlfakitComponentProps) {
  const parent = useOptionalAlfakit()
  const props = useOptionalPageProps()
  const [, setVersion] = useState(0)
  // The registry overrides are an object literal in JSX: compare them by their keys.
  const overrideKeys = Object.keys(components ?? {}).join(',')

  // Lazy and polled schemas of this component, merged into the page it renders.
  const state = useMemo(
    () => new StandaloneComponentState(component, () => setVersion((value) => value + 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  state.setComponent(component)

  const context = useMemo<AlfakitContextValue>(() => {
    const poll = (target: string, interval: string | number | null | undefined) =>
      state.poll(target, interval)
    const refresh = (targets: string[]) => state.refresh(targets)

    if (parent) {
      return {
        ...parent,
        registry: createStandaloneRegistry(components, parent.registry),
        poll,
        refresh,
      }
    }

    return {
      ...createStandaloneContext(
        { action: component.endpoints.action, modal: component.endpoints.modal },
        components,
        poll,
      ),
      refresh,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, state, overrideKeys])

  // Endpoints follow the latest payload (they change per locale or path).
  context.actions.setEndpoints({
    action: component.endpoints.action,
    modal: component.endpoints.modal,
  })

  // Inside `createAlfakit()` the panel feeds the shared translator; on a page without the
  // `alfakit` prop (the rest of the app) the component's own translations apply.
  const ownsTranslator = !parent || !props?.alfakit

  if (ownsTranslator) {
    context.translator.setTranslations(component.translations ?? {})
    context.translator.setLocale(component.localization?.tag ?? 'en')
  }

  const panel = useMemo(() => standalonePanelSchema(component), [component])
  const page = state.page
  const direction = component.localization?.direction ?? 'ltr'

  useEffect(() => {
    ensureStandaloneRuntime()
  }, [])

  // Partial reloads (sorting, paging, inline edits) request this component's own prop.
  const propName = findStandalonePropName(props, component)

  useEffect(() => registerStandaloneProp(propName ?? null), [propName])

  useEffect(() => {
    void state.loadLazy(component)
    // The token identifies a new payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, component.token])

  // Toasts: use the layout's <AlfakitToaster /> when there is one, else the first component
  // on the page renders one (checked after every component's effects ran).
  const [ownsToaster, setOwnsToaster] = useState(false)

  useEffect(() => {
    if (parent) return

    let release: (() => void) | null = null
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || hasToaster()) return

      release = claimToaster()
      setOwnsToaster(true)
    })

    return () => {
      cancelled = true
      release?.()
    }
  }, [parent])

  const render = (block: ContentBlock) => <ContentBlockRenderer key={block.key} block={block} />
  const actionContext = useMemo(
    () => ({ token: component.token, component: 'page' }),
    [component.token],
  )

  const body = (
    <PageActionProvider value={actionContext}>
      <div
        data-slot="standalone"
        data-alfakit-component={component.class}
        dir={direction}
        className={cn('flex flex-col gap-6', className)}
      >
        {(page.heading || page.headerActions?.length) && (
          <header
            data-slot="page-header"
            className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              {page.heading && (
                <h2 className="text-xl font-semibold tracking-tight">{page.heading}</h2>
              )}
              {page.subheading && (
                <p className="text-muted-foreground mt-1 text-sm">{page.subheading}</p>
              )}
            </div>
            {page.headerActions && page.headerActions.length > 0 && (
              <ActionList
                actions={page.headerActions}
                context={actionContext}
                align="end"
                className="max-w-full shrink-0"
              />
            )}
          </header>
        )}
        {header}
        {children ? children(page.content, render) : page.content.map(render)}
        {footer}
      </div>
      <ActionModals />
      {ownsToaster && <AlfakitToaster claimed />}
    </PageActionProvider>
  )

  return (
    <AlfakitProvider value={context}>
      <StandaloneProvider value={{ panel, page }}>
        {parent ? (
          body
        ) : (
          <Direction.Provider dir={direction}>
            <TooltipProvider delayDuration={0}>{body}</TooltipProvider>
          </Direction.Provider>
        )}
      </StandaloneProvider>
    </AlfakitProvider>
  )
}

/**
 * The host page's Inertia props, or undefined when rendered outside an Inertia app (a
 * component test, Storybook, a plain server render): partial reloads then reload every prop.
 */
function useOptionalPageProps(): Record<string, unknown> | undefined {
  try {
    return usePage().props as Record<string, unknown>
  } catch {
    return undefined
  }
}
