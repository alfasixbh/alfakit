import { describe, expect, it } from 'vitest'
import { LazyComponentCache, isLazyPlaceholder, resolveLazyComponents } from '../src/lazy'
import type { PageSchema, PolledComponents } from '../src/schema'

function pageWith(stats: object, manager: object): PageSchema {
  return {
    class: 'P',
    layout: 'app',
    title: 'P',
    token: 't',
    content: [
      { type: 'Form', key: 'form', components: [] },
      { type: 'Widgets', key: 'widgets', columns: { default: 1 }, widgets: [stats] },
      { type: 'RelationManagers', key: 'relationManagers', managers: [manager] },
    ],
  } as unknown as PageSchema
}

const statsPlaceholder = { type: 'StatsOverviewWidget', key: 'stats', id: 'stats', lazy: true }
const managerPlaceholder = {
  type: 'RelationManager',
  key: 'relationManager:Rm',
  component: 'relationManager:Rm',
  title: 'Comments',
  lazy: true,
}
const placeholders = pageWith(statsPlaceholder, managerPlaceholder)
const loaded = {
  'widget:stats': { type: 'StatsOverviewWidget', key: 'stats', id: 'stats', stats: [{ value: 1 }] },
  'relationManager:Rm': { ...managerPlaceholder, lazy: undefined, table: { records: [] } },
} as unknown as PolledComponents

const widgetsOf = (page: PageSchema) =>
  (page.content[1] as unknown as { widgets: Record<string, unknown>[] }).widgets
const managersOf = (page: PageSchema) =>
  (page.content[2] as unknown as { managers: Record<string, unknown>[] }).managers

describe('resolveLazyComponents', () => {
  it('keeps placeholders (skeletons) until the deferred prop arrives', () => {
    const page = resolveLazyComponents(placeholders, undefined, new LazyComponentCache(), '/a')

    expect(page).toBe(placeholders)
    expect(isLazyPlaceholder(widgetsOf(page)[0] as never)).toBe(true)
  })

  it('puts loaded schemas in place of their placeholders only', () => {
    const page = resolveLazyComponents(placeholders, loaded, new LazyComponentCache(), '/a')

    expect(page.content[0]).toBe(placeholders.content[0])
    expect(widgetsOf(page)[0]).toBe(loaded['widget:stats'])
    expect(managersOf(page)[0]).toBe(loaded['relationManager:Rm'])
  })

  it('keeps components a partial reload sent complete, even when stale lazy data is around', () => {
    const fresh = { type: 'StatsOverviewWidget', key: 'stats', id: 'stats', stats: [{ value: 2 }] }
    const freshManager = {
      ...managerPlaceholder,
      lazy: undefined,
      table: { records: [{ key: 1 }] },
    }
    const reloaded = pageWith(fresh, freshManager)

    const page = resolveLazyComponents(reloaded, loaded, new LazyComponentCache(), '/a')

    expect(page).toBe(reloaded)
  })

  it('shows the last schema seen on the same page while a later visit reloads it', () => {
    const cache = new LazyComponentCache()
    resolveLazyComponents(placeholders, loaded, cache, '/a')

    const revisited = resolveLazyComponents(placeholders, undefined, cache, '/a')
    const elsewhere = resolveLazyComponents(placeholders, undefined, cache, '/b')

    expect(widgetsOf(revisited)[0]).toBe(loaded['widget:stats'])
    expect(elsewhere).toBe(placeholders)
  })
})
