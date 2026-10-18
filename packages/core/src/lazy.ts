import { widgetPollTarget } from './poll'
import type { ContentBlock, PageSchema, PolledComponents } from './schema/panel'
import type { RelationGroupSchema } from './schema/resources'
import type { LazyRelationManagerSchema, RelationManagerSchema } from './schema/table'
import type { LazyWidgetSchema, WidgetSchema } from './schema/widgets'

/** Deferred Inertia prop that carries lazy components (`Page::LAZY_PROP`). */
export const LAZY_PROP = 'alfakitLazy'

/** Whether a widget or relation manager is a lazy placeholder still waiting for its schema. */
export function isLazyPlaceholder(
  component: WidgetSchema | LazyWidgetSchema,
): component is LazyWidgetSchema
export function isLazyPlaceholder(
  component: RelationManagerSchema | LazyRelationManagerSchema,
): component is LazyRelationManagerSchema
export function isLazyPlaceholder(component: object): boolean {
  return (component as { lazy?: unknown }).lazy === true
}

/**
 * Schemas of lazy components seen on each page, so a later full visit to the same page
 * (e.g. the redirect after an action) shows the last data instead of a skeleton while the
 * deferred prop reloads it.
 */
export class LazyComponentCache {
  private readonly entries = new Map<string, unknown>()

  constructor(private readonly limit = 100) {}

  get(key: string): unknown {
    return this.entries.get(key)
  }

  set(key: string, value: unknown): void {
    this.entries.delete(key)
    this.entries.set(key, value)

    if (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value

      if (oldest !== undefined) this.entries.delete(oldest)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

/** The cache the renderers share. */
export const lazyComponentCache = new LazyComponentCache()

function currentScope(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname
}

/**
 * Put lazy components into the page in place of their placeholders: the deferred schema
 * when it has arrived, else the last one seen on this page, else the placeholder (which
 * renders as a skeleton). Components the server sent complete (partial reloads, polls)
 * are kept as they are. Blocks without placeholders keep their identity.
 */
export function resolveLazyComponents(
  page: PageSchema,
  lazy: PolledComponents | undefined,
  cache: LazyComponentCache = lazyComponentCache,
  scope: string = currentScope(),
): PageSchema {
  let changed = false

  const resolve = <T extends object>(current: T, target: string): T => {
    const key = `${scope}|${target}`

    if (!(current as { lazy?: unknown }).lazy) {
      cache.set(key, current)

      return current
    }

    const next = lazy?.[target] ?? cache.get(key)

    if (!next) return current

    cache.set(key, next)
    changed = true

    return next as T
  }

  const content = page.content.map((block) => {
    switch (block.type) {
      case 'RelationManagers': {
        const managers = (
          block as { managers: Array<RelationManagerSchema | LazyRelationManagerSchema> }
        ).managers
        const next = managers.map((manager) =>
          resolveDeferredBadge(resolve(manager, manager.component), lazy),
        )
        const groups = (block as { groups?: RelationGroupSchema[] }).groups
        const nextGroups = groups?.map((group) => resolveDeferredGroupBadge(group, lazy))
        const groupsChanged = nextGroups?.some((group, index) => group !== groups?.[index]) ?? false

        if (!groupsChanged && !next.some((manager, index) => manager !== managers[index])) {
          return block
        }

        changed = true

        return groupsChanged
          ? { ...block, managers: next, groups: nextGroups }
          : { ...block, managers: next }
      }
      case 'Widgets': {
        const widgets = (block as { widgets: Array<WidgetSchema | LazyWidgetSchema> }).widgets
        const next = widgets.map((widget) => resolve(widget, widgetPollTarget(widget)))

        return next.some((widget, index) => widget !== widgets[index])
          ? { ...block, widgets: next }
          : block
      }
      default:
        return block
    }
  }) as ContentBlock[]

  return changed ? { ...page, content } : page
}

/** Deferred target of a relation manager's badge (`RelationManager::$isBadgeDeferred`). */
export function relationManagerBadgeTarget(component: string): string {
  return component.replace(/^relationManager:/, 'relationManagerBadge:')
}

/** Deferred target of a relation group's badge (`RelationGroup::deferBadge()`). */
export function relationGroupBadgeTarget(key: string): string {
  return `relationGroupBadge:${key}`
}

/**
 * A `deferBadge()` relation group takes its badge from the deferred prop once it arrives;
 * until then its tab shows no badge.
 */
export function resolveDeferredGroupBadge(
  group: RelationGroupSchema,
  lazy: PolledComponents | undefined,
): RelationGroupSchema {
  if (!group.badgeDeferred) return group

  const badge = lazy?.[relationGroupBadgeTarget(group.key)] as
    Pick<RelationGroupSchema, 'badge' | 'badgeColor'> | undefined

  if (!badge) return group

  return { ...group, ...badge, badgeDeferred: undefined }
}

/**
 * A `$isBadgeDeferred` manager (`badgeDeferred: true`) takes its badge from the deferred
 * prop once it arrives; until then the tab shows no badge.
 */
export function resolveDeferredBadge<T extends { component: string; badgeDeferred?: boolean }>(
  manager: T,
  lazy: PolledComponents | undefined,
): T {
  if (!manager.badgeDeferred) return manager

  const badge = lazy?.[relationManagerBadgeTarget(manager.component)] as
    { badge?: string; badgeColor?: string; badgeTooltip?: string } | undefined

  if (!badge) return manager

  return { ...manager, ...badge, badgeDeferred: undefined }
}
