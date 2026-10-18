import { describe, expect, it } from 'vitest'
import { LazyComponentCache, resolveDeferredGroupBadge, resolveLazyComponents } from '../src/lazy'
import { RELATION_MANAGERS_CONTENT_TAB, relationManagerTabs } from '../src/resource-tabs'
import type { PageSchema, PolledComponents } from '../src/schema'
import type { RelationManagersBlock, RelationManagerSchema } from '../src/schema/table'

const manager = (name: string): RelationManagerSchema => ({
  type: 'RelationManager',
  key: `relationManager:${name}`,
  component: `relationManager:${name}`,
  title: name,
  table: { columns: [] } as unknown as RelationManagerSchema['table'],
})

describe('getCombinedTabComponents() order', () => {
  it('places the content tab where tabOrder says and leaves out unlisted tabs', () => {
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('Comments'), manager('Tags'), manager('Notes')],
      content: { label: 'Edit', position: 'before', block: { type: 'Form', key: 'form' } },
      tabOrder: ['relationManager:Comments', 'content', 'relationManager:Tags'],
    }

    expect(relationManagerTabs(block).map((tab) => tab.key)).toEqual([
      'relationManager:Comments',
      RELATION_MANAGERS_CONTENT_TAB,
      'relationManager:Tags',
    ])
  })
})

describe('RelationGroup::deferBadge()', () => {
  const group = { key: 'relationGroup:abc', title: 'Discussion', managers: [], badgeDeferred: true }

  it('fills the badge in once the deferred prop arrives', () => {
    expect(resolveDeferredGroupBadge(group, undefined)).toBe(group)
    expect(
      resolveDeferredGroupBadge(group, {
        'relationGroupBadge:relationGroup:abc': { badge: 7, badgeColor: 'danger' },
      } as unknown as PolledComponents),
    ).toEqual({ ...group, badge: 7, badgeColor: 'danger', badgeDeferred: undefined })
  })

  it('resolves group badges inside the relation managers block', () => {
    const page = {
      class: 'P',
      layout: 'app',
      title: 'P',
      token: 't',
      content: [
        {
          type: 'RelationManagers',
          key: 'relationManagers',
          managers: [manager('Comments')],
          groups: [{ ...group, managers: ['relationManager:Comments'] }],
        },
      ],
    } as unknown as PageSchema

    const resolved = resolveLazyComponents(
      page,
      { 'relationGroupBadge:relationGroup:abc': { badge: 3 } } as unknown as PolledComponents,
      new LazyComponentCache(),
      '/a',
    )

    const block = resolved.content[0] as unknown as RelationManagersBlock

    expect(block.groups?.[0]?.badge).toBe(3)
    expect(relationManagerTabs(block)[0]?.badge).toBe(3)
  })
})
