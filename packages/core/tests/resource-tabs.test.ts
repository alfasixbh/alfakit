import { describe, expect, it } from 'vitest'
import {
  hasRelationManagerTabs,
  listTabUrl,
  RELATION_MANAGERS_CONTENT_TAB,
  relationManagerTabs,
} from '../src/resource-tabs'
import type { RelationManagersBlock, RelationManagerSchema } from '../src/schema/table'

const manager = (name: string): RelationManagerSchema => ({
  type: 'RelationManager',
  key: `relationManager:${name}`,
  component: `relationManager:${name}`,
  title: name,
  table: { columns: [] } as unknown as RelationManagerSchema['table'],
})

describe('listTabUrl', () => {
  it('sets the tab and resets the page, keeping the rest of the query', () => {
    expect(listTabUrl('/admin/posts?page=3&search=x', 'published')).toBe(
      '/admin/posts?search=x&activeTab=published',
    )
    expect(listTabUrl('https://app.test/admin/posts?activeTab=a', 'b')).toBe(
      'https://app.test/admin/posts?activeTab=b',
    )
    expect(listTabUrl('/posts', 'x', 'tab')).toBe('/posts?tab=x')
  })
})

describe('relationManagerTabs', () => {
  it('keeps ungrouped managers as tabs and folds groups into one tab', () => {
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('Notes'), manager('Phones'), manager('Emails'), manager('Tags')],
      groups: [
        {
          key: 'relationGroup:abc',
          title: 'Contacts',
          icon: 'users',
          badge: 2,
          managers: ['relationManager:Emails', 'relationManager:Phones'],
        },
      ],
    }

    const tabs = relationManagerTabs(block)

    expect(tabs.map((tab) => tab.title)).toEqual(['Notes', 'Contacts', 'Tags'])
    expect(tabs[1]).toMatchObject({ group: true, icon: 'users', badge: 2 })
    expect(tabs[1]?.managers.map((item) => item.title)).toEqual(['Emails', 'Phones'])
  })

  it('works without groups', () => {
    const tabs = relationManagerTabs({
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('A')],
    })

    expect(tabs).toHaveLength(1)
    expect(tabs[0]?.group).toBe(false)
  })

  it('adds the combined form / infolist tab before or after the managers', () => {
    const form = { type: 'Form', key: 'form' }
    const block: RelationManagersBlock = {
      type: 'RelationManagers',
      key: 'relationManagers',
      managers: [manager('A')],
      content: { label: 'Edit', icon: 'pencil', position: 'before', block: form },
    }

    const before = relationManagerTabs(block)

    expect(before.map((tab) => tab.title)).toEqual(['Edit', 'A'])
    expect(before[0]).toMatchObject({
      key: RELATION_MANAGERS_CONTENT_TAB,
      icon: 'pencil',
      managers: [],
      content: form,
    })
    expect(hasRelationManagerTabs(block)).toBe(true)

    const after = relationManagerTabs({
      ...block,
      content: { ...block.content!, position: 'after' },
    })

    expect(after.map((tab) => tab.title)).toEqual(['A', 'Edit'])
  })

  it('shows a lone manager without tabs', () => {
    expect(
      hasRelationManagerTabs({ type: 'RelationManagers', key: 'r', managers: [manager('A')] }),
    ).toBe(false)
  })
})
