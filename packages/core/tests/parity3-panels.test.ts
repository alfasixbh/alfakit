import { describe, expect, it } from 'vitest'
import {
  LazyComponentCache,
  relationManagerBadgeTarget,
  resolveDeferredBadge,
  resolveLazyComponents,
} from '../src/lazy'
import {
  RELATION_MANAGERS_CONTENT_TAB,
  relationManagerTabs,
  relationTabFromQuery,
  relationTabSlug,
} from '../src/resource-tabs'
import type { PageSchema } from '../src/schema/panel'
import type { RelationManagersBlock } from '../src/schema/table'

const manager = (component: string, slug?: string, extra: Record<string, unknown> = {}) => ({
  type: 'RelationManager' as const,
  key: component,
  component,
  title: component,
  slug,
  lazy: true as const,
  ...extra,
})

describe('relation manager tab slugs', () => {
  const keyed: RelationManagersBlock = {
    type: 'RelationManagers',
    key: 'relationManagers',
    managers: [manager('rm:a', 'comments'), manager('rm:b', 'tags')],
    content: {
      label: 'Edit',
      position: 'before',
      block: { type: 'Schema', key: 'form', components: [] },
    },
  }

  it('uses the getRelations() key, else the position (the content tab has none)', () => {
    const tabs = relationManagerTabs(keyed)

    expect(relationTabSlug(tabs, 'rm:b')).toBe('tags')
    expect(relationTabSlug(tabs, RELATION_MANAGERS_CONTENT_TAB)).toBeNull()
    expect(relationTabFromQuery(tabs, 'comments')?.key).toBe('rm:a')
    expect(relationTabFromQuery(tabs, '1')).toBeUndefined()
    expect(relationTabFromQuery(tabs, null)).toBeUndefined()

    const plain = relationManagerTabs({
      ...keyed,
      content: undefined,
      managers: [manager('rm:a'), manager('rm:b')],
    })

    expect(relationTabSlug(plain, 'rm:b')).toBe('1')
    expect(relationTabFromQuery(plain, '1')?.key).toBe('rm:b')
    expect(relationTabFromQuery(plain, '9')).toBeUndefined()
  })
})

describe('deferred relation manager badges', () => {
  it('merges the badge from the deferred prop', () => {
    const target = relationManagerBadgeTarget('relationManager:App\\Tags@tags')

    expect(target).toBe('relationManagerBadge:App\\Tags@tags')

    const waiting = { component: 'relationManager:App\\Tags@tags', badgeDeferred: true }

    expect(resolveDeferredBadge(waiting, undefined)).toBe(waiting)
    expect(
      resolveDeferredBadge(waiting, { [target]: { badge: '3', badgeColor: 'danger' } }),
    ).toEqual({
      component: 'relationManager:App\\Tags@tags',
      badge: '3',
      badgeColor: 'danger',
      badgeDeferred: undefined,
    })
  })

  it('puts the badge into the page through resolveLazyComponents()', () => {
    const page = {
      content: [
        {
          type: 'RelationManagers',
          key: 'relationManagers',
          managers: [
            {
              type: 'RelationManager',
              key: 'rm',
              component: 'relationManager:T',
              title: 'Tags',
              badgeDeferred: true,
              table: {},
            },
          ],
        },
      ],
    } as unknown as PageSchema

    const resolved = resolveLazyComponents(
      page,
      { 'relationManagerBadge:T': { badge: '7' } },
      new LazyComponentCache(),
      '/',
    )
    const block = resolved.content[0] as unknown as { managers: Array<{ badge?: string }> }

    expect(resolved).not.toBe(page)
    expect(block.managers[0]!.badge).toBe('7')
    expect(resolveLazyComponents(page, undefined, new LazyComponentCache(), '/')).toBe(page)
  })
})
