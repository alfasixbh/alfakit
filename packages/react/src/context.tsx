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
import { usePage } from '@inertiajs/react'
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>

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

const AlfakitContext = createContext<AlfakitContextValue | null>(null)

const NO_PROPS: AlfakitPageProps = {} as AlfakitPageProps

/**
 * The Inertia page props, or an empty object outside an Inertia app (component tests,
 * Storybook, a plain server render of an `<AlfakitComponent>`). `usePage()` only reads a
 * context before throwing, so the hook order is the same on both paths.
 */
function useOptionalPageProps(): AlfakitPageProps {
  try {
    return usePage<AlfakitPageProps>().props
  } catch {
    return NO_PROPS
  }
}

/**
 * Outside panels there is no shared `alfakit` prop and no `page` prop: `<AlfakitComponent>`
 * provides both from its payload, and the hooks below read them first.
 */
export interface StandaloneContextValue {
  panel: PanelSchema
  page: PageSchema
}

const StandaloneContext = createContext<StandaloneContextValue | null>(null)

export function StandaloneProvider({
  value,
  children,
}: {
  value: StandaloneContextValue
  children: ReactNode
}) {
  return <StandaloneContext.Provider value={value}>{children}</StandaloneContext.Provider>
}

export function useStandalone(): StandaloneContextValue | null {
  return useContext(StandaloneContext)
}

export function AlfakitProvider({
  value,
  children,
}: {
  value: AlfakitContextValue
  children: ReactNode
}) {
  return <AlfakitContext.Provider value={value}>{children}</AlfakitContext.Provider>
}

export function useAlfakit(): AlfakitContextValue {
  const context = useContext(AlfakitContext)

  if (!context) {
    throw new Error('Alfakit components must be rendered inside createAlfakit().')
  }

  return context
}

/**
 * The component registry when rendered inside `createAlfakit()`, otherwise null (primitives
 * rendered on their own in tests or Storybook).
 */
export function useOptionalRegistry(): ComponentRegistry<AnyComponent> | null {
  return useContext(AlfakitContext)?.registry ?? null
}

/** The context the component renders in, or null outside `createAlfakit()` and `<AlfakitComponent>`. */
export function useOptionalAlfakit(): AlfakitContextValue | null {
  return useContext(AlfakitContext)
}

/** The shared `alfakit` prop (panel, navigation, user, endpoints…). */
export function usePanel(): PanelSchema {
  const standalone = useContext(StandaloneContext)
  const props = useOptionalPageProps()

  // The navigation structure is a once prop; its active items and badges are merged in here.
  return resolvePanelNavigation(standalone?.panel ?? props.alfakit, props.alfakitNavigationBadges)
}

export function usePageSchema(): PageSchema | undefined {
  const standalone = useContext(StandaloneContext)
  const page = useOptionalPageProps().page

  return standalone?.page ?? page
}

/** Poll a component (`table`, `widget:<id>`); the returned function stops it. */
export function usePollComponent(): NonNullable<AlfakitContextValue['poll']> {
  return useContext(AlfakitContext)?.poll ?? pollComponent
}

/** How `live()` components refresh: their own fetch outside panels, else a partial reload. */
export function useRefreshComponents(): AlfakitContextValue['refresh'] {
  return useContext(AlfakitContext)?.refresh
}

export function useAlfakitProps(): AlfakitPageProps {
  return useOptionalPageProps()
}

function useTranslator(): Translator {
  // Primitives may render outside createAlfakit() (tests, Storybook); fall back to the
  // shared translator so they still show their English defaults.
  return useContext(AlfakitContext)?.translator ?? globalTranslator
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

/** The current language, direction, currency, timezone and language list. */
export function useLocalization(): LocalizationSchema {
  return usePanel().localization
}

export function useDirection(): 'ltr' | 'rtl' {
  const standalone = useContext(StandaloneContext)
  const panel = useOptionalPageProps().alfakit

  return (standalone?.panel ?? panel)?.localization?.direction ?? 'ltr'
}

/** `Intl` formatting in the user's locale: `format.money(12.5)`, `format.relative(date)`. */
export function useFormatter(): LocaleFormatter {
  const standalone = useContext(StandaloneContext)
  const panel = useOptionalPageProps().alfakit
  const localization = (standalone?.panel ?? panel)?.localization

  const tag = localization?.tag
  const currency = localization?.currency
  const timezone = localization?.timezone

  return useMemo(
    () => new LocaleFormatter(tag ?? 'en', currency ?? 'USD', timezone),
    [tag, currency, timezone],
  )
}

export function useActionRunner(): ActionRunner {
  return useAlfakit().actions
}

export function useRegistry(): ComponentRegistry<AnyComponent> {
  return useAlfakit().registry
}
