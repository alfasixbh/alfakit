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
import { usePage } from '@inertiajs/vue3'
import {
  computed,
  inject,
  provide,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = Component<any>

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
}

export const ALFAKIT_KEY: InjectionKey<AlfakitContextValue> = Symbol('alfakit')

/**
 * Outside panels there is no shared `alfakit` prop and no `page` prop: `<AlfakitComponent>`
 * provides both from its payload, and the composables below read them first.
 */
export interface StandaloneContextValue {
  panel: Ref<PanelSchema>
  page: Ref<PageSchema>
}

export const STANDALONE_KEY: InjectionKey<StandaloneContextValue> = Symbol('alfakit.standalone')

export function provideStandalone(value: StandaloneContextValue): void {
  provide(STANDALONE_KEY, value)
}

export function useStandalone(): StandaloneContextValue | null {
  return inject(STANDALONE_KEY, null)
}

/** The context the component renders in, or null outside `createAlfakit()` and `<AlfakitComponent>`. */
export function useOptionalAlfakit(): AlfakitContextValue | null {
  return inject(ALFAKIT_KEY, null)
}

/** Poll a component (`table`, `widget:<id>`); the returned function stops it. */
export function usePollComponent(): NonNullable<AlfakitContextValue['poll']> {
  return inject(ALFAKIT_KEY, null)?.poll ?? pollComponent
}

export function provideAlfakit(value: AlfakitContextValue): void {
  provide(ALFAKIT_KEY, value)
}

export function useAlfakit(): AlfakitContextValue {
  const context = inject(ALFAKIT_KEY, null)

  if (!context) {
    throw new Error('Alfakit components must be rendered inside createAlfakit().')
  }

  return context
}

function pageProps(): ComputedRef<AlfakitPageProps> {
  const page = usePage<AlfakitPageProps>()

  return computed(() => page.props)
}

/** The shared `alfakit` prop (panel, navigation, user, endpoints…). */
export function usePanel(): ComputedRef<PanelSchema> {
  const standalone = inject(STANDALONE_KEY, null)
  const props = pageProps()

  // The navigation structure is a once prop; its active items and badges are merged in here.
  return computed(() =>
    resolvePanelNavigation(
      standalone?.panel.value ?? props.value.alfakit,
      props.value.alfakitNavigationBadges,
    ),
  )
}

export function usePageSchema(): ComputedRef<PageSchema | undefined> {
  const standalone = inject(STANDALONE_KEY, null)
  const props = pageProps()

  return computed(() => standalone?.page.value ?? props.value.page)
}

export function useAlfakitProps(): ComputedRef<AlfakitPageProps> {
  return pageProps()
}

function useTranslator(): Translator {
  // Primitives may render outside createAlfakit() (tests, Storybook); fall back to the
  // shared translator so they still show their English defaults.
  return inject(ALFAKIT_KEY, null)?.translator ?? globalTranslator
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

/** The page's Inertia props; undefined when rendered outside an Inertia app (tests). */
function optionalPageProps(): ComputedRef<AlfakitPageProps | undefined> {
  const page = usePage<AlfakitPageProps>()

  return computed(() => page.props as AlfakitPageProps | undefined)
}

/** The current language, direction, currency, timezone and language list. */
export function useLocalization(): ComputedRef<LocalizationSchema> {
  const standalone = inject(STANDALONE_KEY, null)
  const props = optionalPageProps()

  return computed(
    () => (standalone?.panel.value ?? props.value?.alfakit)?.localization as LocalizationSchema,
  )
}

export function useDirection(): ComputedRef<'ltr' | 'rtl'> {
  const standalone = inject(STANDALONE_KEY, null)
  const props = optionalPageProps()

  return computed(
    () => (standalone?.panel.value ?? props.value?.alfakit)?.localization?.direction ?? 'ltr',
  )
}

/** `Intl` formatting in the user's locale: `format.value.money(12.5)`, `format.value.relative(date)`. */
export function useFormatter(): ComputedRef<LocaleFormatter> {
  const standalone = inject(STANDALONE_KEY, null)
  const props = optionalPageProps()
  const key = computed(() => {
    const localization = (standalone?.panel.value ?? props.value?.alfakit)?.localization

    return [localization?.tag ?? 'en', localization?.currency ?? 'USD', localization?.timezone]
  })
  let cached: { key: string; formatter: LocaleFormatter } | null = null

  return computed(() => {
    const [tag, currency, timezone] = key.value
    const id = `${tag}|${currency}|${timezone ?? ''}`

    if (cached?.key !== id) {
      cached = { key: id, formatter: new LocaleFormatter(tag, currency, timezone) }
    }

    return cached.formatter
  })
}

export function useActionRunner(): ActionRunner {
  return useAlfakit().actions
}

export function useRegistry(): ComponentRegistry<AnyComponent> {
  return useAlfakit().registry
}

/**
 * The component registry when rendered inside `createAlfakit()`, otherwise null (primitives
 * rendered on their own in tests or Storybook).
 */
export function useOptionalRegistry(): ComponentRegistry<AnyComponent> | null {
  return inject(ALFAKIT_KEY, null)?.registry ?? null
}
