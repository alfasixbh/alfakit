import {
  translator as globalTranslator,
  LocaleFormatter,
  pollComponent,
  resolvePanelNavigation,
  type ActionRunner,
  type AlfakitPageProps,
  type ComponentRegistry,
  type LocalizationSchema,
  type PageSchema,
  type PanelSchema,
  type Translator,
} from '@alfakit/core'
import { page } from '@inertiajs/svelte'
import type { Component } from 'svelte'
import { getContext, hasContext, setContext } from 'svelte'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = Component<any, any, any>

export interface AlfakitContextValue {
  registry: ComponentRegistry<AnyComponent>
  pages: Record<string, AnyComponent>
  actions: ActionRunner
  translator: Translator
  /**
   * Polls a component (`table`, `widget:<id>`) and returns an unsubscribe. Panels use the
   * shared `pollComponent()` (an Inertia partial reload); components outside panels fetch
   * their own schemas by token.
   */
  poll?: (target: string, interval: string | number | null | undefined) => () => void
  /**
   * Fetches fresh schemas of components now (`live()` tables and widgets after a record
   * change). Panels leave it out (a partial reload); components outside panels fetch theirs.
   */
  refresh?: (targets: string[]) => Promise<void>
  /**
   * Whether every page is rendered only after the split built-ins and discovered components
   * it names have loaded, on the server and before hydration (`createAlfakit()` resolves
   * pages that way). Without it (starter kits, standalone components) those components show
   * after hydration: a long-lived SSR server keeps code earlier requests loaded, a fresh
   * browser has none of it, so rendering them early would make the markups differ.
   */
  preloadsPageComponents?: boolean
}

export const ALFAKIT_CONTEXT = Symbol.for('alfakit.context')

/**
 * Outside panels there is no shared `alfakit` prop and no `page` prop: `<AlfakitComponent>`
 * provides both from its payload (as reactive getters), and the hooks below read them first.
 */
export interface StandaloneContextValue {
  readonly panel: PanelSchema
  readonly page: PageSchema
}

export const STANDALONE_CONTEXT = Symbol.for('alfakit.standalone')

// Hooks such as `useDirection()` are also called from event handlers, outside component
// initialisation, where Svelte context is unavailable: the last mounted standalone
// component answers there (browser only, never shared between server renders).
let lastStandalone: StandaloneContextValue | null = null

/** Provide the standalone payload to descendants (call during component initialisation). */
export function provideStandalone(value: StandaloneContextValue): StandaloneContextValue {
  setContext(STANDALONE_CONTEXT, value)

  if (typeof window !== 'undefined') {
    lastStandalone = value
  }

  return value
}

export function useStandalone(): StandaloneContextValue | null {
  try {
    return hasContext(STANDALONE_CONTEXT)
      ? getContext<StandaloneContextValue>(STANDALONE_CONTEXT)
      : null
  } catch {
    return lastStandalone
  }
}

/** The context the component renders in, or null outside `createAlfakit()` and `<AlfakitComponent>`. */
export function useOptionalAlfakit(): AlfakitContextValue | null {
  return hasContext(ALFAKIT_CONTEXT)
    ? (getContext<AlfakitContextValue | undefined>(ALFAKIT_CONTEXT) ?? null)
    : globalContext
}

/** Poll a component (`table`, `widget:<id>`); the returned function stops it. Call during initialisation. */
export function usePollComponent(): NonNullable<AlfakitContextValue['poll']> {
  return useOptionalAlfakit()?.poll ?? pollComponent
}

/** How `live()` components refresh: their own fetch outside panels, else a partial reload. */
export function useRefreshComponents(): AlfakitContextValue['refresh'] {
  return useOptionalAlfakit()?.refresh
}

let globalContext: AlfakitContextValue | null = null

/** Register the app-wide context (used by `createAlfakit()` as a fallback outside the component tree). */
export function setGlobalAlfakitContext(value: AlfakitContextValue | null): void {
  globalContext = value
}

/** Provide the Alfakit context to descendants (call during component initialisation). */
export function provideAlfakit(value: AlfakitContextValue): AlfakitContextValue {
  setContext(ALFAKIT_CONTEXT, value)

  return value
}

export function useAlfakit(): AlfakitContextValue {
  const context = hasContext(ALFAKIT_CONTEXT)
    ? getContext<AlfakitContextValue>(ALFAKIT_CONTEXT)
    : globalContext

  if (!context) {
    throw new Error('Alfakit components must be rendered inside createAlfakit().')
  }

  return context
}

/**
 * The shared `alfakit` prop (panel, navigation, user, endpoints…). Read it inside
 * `$derived` to follow navigations.
 */
export function usePanel(): PanelSchema {
  const props = page.props as unknown as AlfakitPageProps

  // The navigation structure is a once prop; its active items and badges are merged in here.
  return resolvePanelNavigation(
    useStandalone()?.panel ?? props.alfakit,
    props.alfakitNavigationBadges,
  )
}

export function usePageSchema(): PageSchema | undefined {
  return useStandalone()?.page ?? (page.props as unknown as AlfakitPageProps).page
}

/**
 * Read the page schema and the panel later, in callbacks that run outside component
 * initialisation (timers, awaited requests). Call it while the component initialises: it
 * remembers the standalone root the component sits in (or none). Calling `usePageSchema()`
 * from such a callback can't see the component's context and falls back to the last
 * standalone component mounted, which in a starter kit is a header widget with another
 * page's token.
 */
export function usePageReader(): { page: () => PageSchema | undefined; panel: () => PanelSchema } {
  const standalone = useStandalone()

  return {
    page: () => standalone?.page ?? (page.props as unknown as AlfakitPageProps).page,
    panel: () => {
      const props = page.props as unknown as AlfakitPageProps

      return resolvePanelNavigation(
        standalone?.panel ?? props.alfakit,
        props.alfakitNavigationBadges,
      )
    },
  }
}

export function useAlfakitProps(): AlfakitPageProps {
  return page.props as unknown as AlfakitPageProps
}

function useTranslator(): Translator {
  // Primitives may render outside createAlfakit() (tests, Storybook); fall back to the
  // shared translator so they still show their English defaults.
  const context = hasContext(ALFAKIT_CONTEXT)
    ? getContext<AlfakitContextValue | undefined>(ALFAKIT_CONTEXT)
    : globalContext

  return context?.translator ?? globalTranslator
}

/** `t('table.showing', { first: 1, last: 10, total: 42 }, 'Fallback')` */
export function useT(): Translator['t'] {
  const translator = useTranslator()

  return translator.t.bind(translator)
}

/** Plural-aware lines: `choice('table.selected', 3)` (Laravel `trans_choice` syntax). */
export function useChoice(): Translator['choice'] {
  const translator = useTranslator()

  return translator.choice.bind(translator)
}

/**
 * The current language, direction, currency, timezone and language list. Read it inside
 * `$derived` (or markup) to follow navigations.
 */
export function useLocalization(): LocalizationSchema {
  return usePanel().localization
}

/** The reading direction of the current language (reactive when read in `$derived`/markup). */
export function useDirection(): 'ltr' | 'rtl' {
  return (
    (
      useStandalone()?.panel ??
      (page.props as unknown as Partial<AlfakitPageProps> | undefined)?.alfakit
    )?.localization?.direction ?? 'ltr'
  )
}

/**
 * `Intl` formatting in the user's locale: `format.current.money(12.5)`,
 * `format.current.relative(date)`. Call during component initialisation; the formatter is
 * re-created when the language, currency or timezone changes.
 */
export function useFormatter(): { readonly current: LocaleFormatter } {
  const standalone = useStandalone()
  const localization = $derived(
    (standalone?.panel ?? (page.props as unknown as Partial<AlfakitPageProps> | undefined)?.alfakit)
      ?.localization,
  )
  const tag = $derived(localization?.tag ?? 'en')
  const currency = $derived(localization?.currency ?? 'USD')
  const timezone = $derived(localization?.timezone)
  const formatter = $derived(new LocaleFormatter(tag, currency, timezone))

  return {
    get current() {
      return formatter
    },
  }
}

export function useActionRunner(): ActionRunner {
  return useAlfakit().actions
}

export function useRegistry(): ComponentRegistry<AnyComponent> {
  return useAlfakit().registry
}

/**
 * The component registry when rendered inside `createAlfakit()`, otherwise null (primitives
 * rendered on their own in tests or Storybook). Call during component initialisation.
 */
export function useOptionalRegistry(): ComponentRegistry<AnyComponent> | null {
  const context = hasContext(ALFAKIT_CONTEXT)
    ? getContext<AlfakitContextValue | undefined>(ALFAKIT_CONTEXT)
    : globalContext

  return context?.registry ?? null
}
