import { requestJson } from './http'
import { isLazyPlaceholder, lazyComponentCache, resolveLazyComponents } from './lazy'
import { currentPageQuery } from './page-query'
import { mergePolledComponents, PollScheduler, widgetPollTarget } from './poll'
import type {
  ContentBlock,
  LocalizationSchema,
  PageSchema,
  PanelSchema,
  PolledComponents,
} from './schema/panel'
import type { StandaloneComponentSchema } from './schema/standalone'
import { isStandaloneComponent } from './schema/standalone'
import type { WidgetsBlock } from './schema/widgets'

export { registerStandaloneProp, resolvePartialProps } from './partial-props'

/**
 * Support for components rendered outside panels (`<AlfakitComponent>`): the panel and
 * page shapes the renderers' hooks expect, partial-reload prop resolution, and fetching
 * lazy or polled components through the standalone endpoint.
 */

/** Defaults used for `AlfakitComponent`s in every renderer (`configureAlfakit()`). */
export interface StandaloneDefaults<TComponent> {
  /** Schema component renderers, keyed by type (`TextInput`) or View name (`map-picker`). */
  components?: Record<string, TComponent>
}

const DEFAULT_THEME: PanelSchema['theme'] = {
  name: 'neutral',
  attribute: 'neutral',
  sidebar: 'inset',
  density: 'comfortable',
  design: {
    layout: 'sidebar',
    nav: 'soft',
    header: 'plain',
    surfaces: 'bordered',
    inputs: 'outline',
    buttons: 'rounded',
    tables: 'lined',
  },
}

/**
 * The `alfakit` panel prop a standalone payload stands for, so every renderer component
 * (`usePanel()`, `useLocalization()`, `useFormatter()`) works unchanged outside panels.
 */
export function standalonePanelSchema(component: StandaloneComponentSchema): PanelSchema {
  return {
    id: 'standalone',
    path: '',
    brandName: '',
    darkMode: { enabled: true, forced: false },
    sidebarCollapsibleOnDesktop: false,
    breadcrumbs: false,
    theme: DEFAULT_THEME,
    navigation: [],
    endpoints: { ...component.endpoints, logout: '' },
    uploadChunkSize: component.uploadChunkSize,
    auth: {},
    flashKey: component.flashKey,
    localization: component.localization,
    csrf: component.csrf,
    translations: component.translations,
  }
}

/** The `page` prop a standalone payload stands for (`usePageSchema()`). */
export function standalonePageSchema(component: StandaloneComponentSchema): PageSchema {
  return {
    class: component.class,
    layout: 'blank',
    title: component.heading ?? '',
    heading: component.heading ?? undefined,
    subheading: component.subheading ?? undefined,
    headerActions: component.headerActions ?? undefined,
    content: component.content,
    token: component.token,
    record: component.record ?? undefined,
  }
}

/** Direction of a standalone component's language. */
export function standaloneDirection(
  localization: Pick<LocalizationSchema, 'direction'> | undefined,
): 'ltr' | 'rtl' {
  return localization?.direction ?? 'ltr'
}

/**
 * The name of the Inertia prop holding `component` (matched by token), so partial reloads
 * can ask for it alone. Undefined when nested in another prop: the page is then reloaded
 * in full.
 */
export function findStandalonePropName(
  props: Record<string, unknown> | undefined,
  component: Pick<StandaloneComponentSchema, 'token'>,
): string | undefined {
  if (!props) return undefined

  for (const [name, value] of Object.entries(props)) {
    if (isStandaloneComponent(value) && value.token === component.token) {
      return name
    }
  }

  return undefined
}

// ---------------------------------------------------------------- Lazy and polled components

/**
 * Fetch fresh schemas of components (`table`, `widget:<id>`) of a standalone component,
 * with the host page's query string so tables keep their sort, search and filters.
 */
export function fetchStandaloneComponents(
  endpoint: string,
  token: string,
  targets: string[],
): Promise<PolledComponents> {
  if (targets.length === 0) return Promise.resolve({})

  return requestJson<PolledComponents>(endpoint, {
    query: { token, targets: targets.join(','), tableQuery: currentPageQuery() },
  })
}

/**
 * Mark the lazy widget placeholders whose request failed (`failed: true`); a page without
 * failures (or whose failed widgets have loaded since) keeps its identity.
 */
export function markFailedLazyWidgets(page: PageSchema, failed: ReadonlySet<string>): PageSchema {
  if (failed.size === 0) return page

  let changed = false
  const content = page.content.map((block) => {
    if (block.type !== 'Widgets') return block

    const widgets = (block as WidgetsBlock).widgets
    const next = widgets.map((widget) =>
      isLazyPlaceholder(widget) && !widget.failed && failed.has(widgetPollTarget(widget))
        ? { ...widget, failed: true as const }
        : widget,
    )

    if (!next.some((widget, index) => widget !== widgets[index])) return block

    changed = true

    return { ...block, widgets: next }
  }) as ContentBlock[]

  return changed ? { ...page, content } : page
}

/**
 * Lazy and polled component state of one `<AlfakitComponent>`: a poll scheduler bound to
 * its token and the schemas fetched so far, merged into the page it renders.
 */
export class StandaloneComponentState {
  public readonly scheduler: PollScheduler

  private fresh: PolledComponents = {}

  /** Targets whose last request failed (lazy widgets then show an error, not a skeleton). */
  private failed = new Set<string>()

  constructor(
    private component: StandaloneComponentSchema,
    private readonly onChange: () => void,
  ) {
    this.scheduler = new PollScheduler((targets) => this.load(targets))
  }

  /** A new payload (page reload) replaces what was polled; lazy schemas stay cached. */
  setComponent(component: StandaloneComponentSchema): void {
    if (component.token !== this.component.token) {
      this.fresh = {}
      this.failed = new Set()
    }

    this.component = component
  }

  get page(): PageSchema {
    const base = standalonePageSchema(this.component)
    const resolved = resolveLazyComponents(base, this.fresh, lazyComponentCache, this.scope())

    return markFailedLazyWidgets(mergePolledComponents(resolved, this.fresh), this.failed)
  }

  /**
   * Load the lazy components named by the payload. Pass the new payload when it arrived
   * (a reload after an action): the load then belongs to it, while one started for the
   * previous payload would be dropped as stale once the page renders the new one (the
   * starter kit dashboard's calendar kept its old events after creating one).
   */
  loadLazy(component?: StandaloneComponentSchema): Promise<void> {
    if (component) this.setComponent(component)

    return this.load(this.component.lazy ?? [])
  }

  /** Fetch fresh schemas of these components now (`live()` refreshes on record changes). */
  refresh(targets: string[]): Promise<void> {
    return this.load(targets)
  }

  /** Poll a component (`table`, `widget:<id>`); returns an unsubscribe. */
  poll(target: string, interval: string | number | null | undefined): () => void {
    return this.scheduler.subscribe(target, interval)
  }

  private async load(targets: string[]): Promise<void> {
    if (targets.length === 0) return

    const token = this.component.token

    try {
      const polled = await fetchStandaloneComponents(
        this.component.endpoints.components,
        token,
        targets,
      )

      // The page re-rendered meanwhile: its new payload is fresher than this response.
      if (token !== this.component.token) return

      this.fresh = { ...this.fresh, ...polled }
      targets.forEach((target) => this.failed.delete(target))
      this.onChange()
    } catch {
      // A failed poll keeps what the page has; the next tick tries again. Lazy widgets
      // still waiting for their schema show an error with a retry instead of a skeleton
      // that never ends (a refused request: W-F-12).
      if (token !== this.component.token) return

      targets.forEach((target) => this.failed.add(target))
      this.onChange()
    }
  }

  /** Lazy schemas are cached per page path and component class, like panel pages. */
  private scope(): string {
    const path = typeof window === 'undefined' ? '' : window.location.pathname

    return `${path}|${this.component.class}`
  }
}
