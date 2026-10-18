import type { Translator } from './i18n'
import { tenantNameText } from './navigation'
import type { PanelSchema, SlotDataValue, SlotItemSchema, TenantSchema } from './schema/panel'

/**
 * The items of a slot to render in one place. Items scoped to components (`for`, from
 * `Panel::slot(…, scopes: [CommentsRelationManager::class])`) render only where the slot
 * is given a matching `scope` (the component key: `relationManager:<class>`,
 * `widget:<id>`; a widget made with properties has a `--hash` suffix that still matches).
 * Items with `when` (`Panel::slot(…, when: ['column' => 'title'])`) render only where the
 * slot's `data` matches every key.
 */
export function slotItems(
  slots: PanelSchema['slots'] | null | undefined,
  name: string,
  scope?: string | null,
  data?: Record<string, unknown> | null,
): SlotItemSchema[] {
  const items = slots?.[name]

  if (!items || items.length === 0) {
    return []
  }

  return items.filter(
    (item) =>
      (!item.for ||
        (!!scope && item.for.some((key) => scope === key || scope.startsWith(`${key}--`)))) &&
      slotDataMatches(item.when, data),
  )
}

/** Whether a slot render's `data` satisfies an item's `when` conditions. */
export function slotDataMatches(
  when: Record<string, SlotDataValue | SlotDataValue[]> | null | undefined,
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!when) return true

  return Object.entries(when).every(([key, expected]) => {
    const actual = data?.[key]

    return Array.isArray(expected)
      ? expected.some((value) => value === actual)
      : expected === actual
  })
}

/** Whether the top bar of sidebar layouts is shown (`Panel::topbar()`). */
export function hasTopbar(panel: Pick<PanelSchema, 'topbar'> | null | undefined): boolean {
  return panel?.topbar !== false
}

/** Whether the light / dark / system switcher is shown (`Panel::themeSwitcher()`). */
export function hasThemeSwitcher(panel: Pick<PanelSchema, 'darkMode'> | null | undefined): boolean {
  return (
    !!panel && panel.darkMode.enabled && !panel.darkMode.forced && panel.darkMode.switcher !== false
  )
}

/** Tenants whose name contains the query (case and accent insensitive). */
export function filterTenants(tenants: TenantSchema[], query: string): TenantSchema[] {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase()
  const needle = normalize(query.trim())

  return needle === ''
    ? tenants
    : tenants.filter((tenant) => normalize(tenantNameText(tenant)).includes(needle))
}

/** Default debounce of the global search field, in milliseconds. */
export const GLOBAL_SEARCH_DEBOUNCE = 250

/** The global search debounce (`Panel::globalSearchDebounce()`), in milliseconds. */
export function globalSearchDebounce(
  config: PanelSchema['globalSearch'] | null | undefined,
): number {
  return typeof config?.debounce === 'number' && config.debounce >= 0
    ? config.debounce
    : GLOBAL_SEARCH_DEBOUNCE
}

/**
 * What the global search field shows at its end: the custom suffix
 * (`globalSearchFieldSuffix()`), the first key binding (default) or nothing.
 */
export function globalSearchSuffix(
  config: PanelSchema['globalSearch'] | null | undefined,
): { type: 'text'; text: string } | { type: 'keyBinding'; keyBinding: string } | null {
  if (!config) return null
  if (config.suffix) return { type: 'text', text: config.suffix }
  if (config.keyBindingSuffix === false || !config.keyBindings[0]) return null

  return { type: 'keyBinding', keyBinding: config.keyBindings[0] }
}

/**
 * What the global search's `aria-live` status region announces once a search has finished:
 * the number of results, or that there are none. Empty while loading or without a query,
 * so screen readers aren't told about every keystroke.
 */
export function globalSearchStatus(
  query: string,
  loading: boolean,
  groups: Array<{ results: unknown[] }>,
  translator: Pick<Translator, 't' | 'choice'>,
): string {
  if (loading || query.trim() === '') return ''

  const count = groups.reduce((total, group) => total + group.results.length, 0)

  return count === 0
    ? translator.t('no_results', {}, 'No results.')
    : translator.choice(
        'global_search.results',
        count,
        { count },
        ':count result available.|:count results available.',
      )
}

/**
 * Set a page's `$extraBodyAttributes` on `<body>` and return a function that undoes it:
 * classes are added to (and later removed from) the body's own, other attributes are
 * restored to their previous value.
 */
export function applyBodyAttributes(
  attributes: Record<string, string> | null | undefined,
): () => void {
  if (typeof document === 'undefined' || !attributes) {
    return () => {}
  }

  const body = document.body
  const addedClasses: string[] = []
  const previous: Array<[string, string | null]> = []

  for (const [name, value] of Object.entries(attributes)) {
    if (/^on/i.test(name)) continue

    if (name === 'class') {
      for (const token of value.split(/\s+/).filter(Boolean)) {
        if (!body.classList.contains(token)) {
          body.classList.add(token)
          addedClasses.push(token)
        }
      }

      continue
    }

    try {
      previous.push([name, body.getAttribute(name)])
      body.setAttribute(name, value)
    } catch {
      // Invalid attribute names are skipped.
    }
  }

  return () => {
    for (const token of addedClasses) body.classList.remove(token)

    for (const [name, value] of previous) {
      if (value === null) body.removeAttribute(name)
      else body.setAttribute(name, value)
    }
  }
}
