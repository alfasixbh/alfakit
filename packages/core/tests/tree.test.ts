import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/http'
import type { TreeNodeSchema, TreeSchema } from '../src/schema/tree'
import {
  TreeController,
  dropTreeNode,
  flattenTreeStructure,
  moveTreeNode,
  visibleTreeRows,
} from '../src/tree'

const node = (key: string, children: TreeNodeSchema[] = []): TreeNodeSchema => ({
  key,
  title: key.toUpperCase(),
  children,
})

// a > (b > d), c ; e
const nodes = (): TreeNodeSchema[] => [node('a', [node('b', [node('d')]), node('c')]), node('e')]

const shape = (tree: TreeNodeSchema[] | null): unknown =>
  tree?.map((item) => (item.children.length ? { [item.key]: shape(item.children) } : item.key))

const schema = (extra: Partial<TreeSchema> = {}): TreeSchema => ({
  type: 'tree',
  key: 'tree',
  actionComponent: 'tree',
  reorderable: true,
  reorderAction: 'treeReorder',
  maxDepth: 3,
  nodes: nodes(),
  ...extra,
})

describe('tree operations', () => {
  it('moves nodes up, down, in and out', () => {
    expect(shape(moveTreeNode(nodes(), 'c', 'up'))).toEqual([{ a: ['c', { b: ['d'] }] }, 'e'])
    expect(shape(moveTreeNode(nodes(), 'a', 'down'))).toEqual(['e', { a: [{ b: ['d'] }, 'c'] }])
    expect(shape(moveTreeNode(nodes(), 'c', 'indent'))).toEqual([{ a: [{ b: ['d', 'c'] }] }, 'e'])
    expect(shape(moveTreeNode(nodes(), 'b', 'outdent'))).toEqual([{ a: ['c'] }, { b: ['d'] }, 'e'])
    expect(moveTreeNode(nodes(), 'a', 'up')).toBeNull()
    expect(moveTreeNode(nodes(), 'a', 'outdent')).toBeNull()
    expect(moveTreeNode(nodes(), 'a', 'indent')).toBeNull()
  })

  it('respects the maximum depth', () => {
    // c into b would be level 3: fine with 3 levels, refused with 2.
    expect(moveTreeNode(nodes(), 'c', 'indent', 3)).not.toBeNull()
    expect(moveTreeNode(nodes(), 'c', 'indent', 2)).toBeNull()
    // e (a leaf) into a is level 2; a's whole subtree into e would be 4 levels.
    expect(dropTreeNode(nodes(), 'a', 'e', 'inside', 3)).toBeNull()
    expect(shape(dropTreeNode(nodes(), 'e', 'a', 'inside', 3))).toEqual([
      { a: [{ b: ['d'] }, 'c', 'e'] },
    ])
  })

  it('never drops a node inside itself', () => {
    expect(dropTreeNode(nodes(), 'a', 'd', 'inside')).toBeNull()
    expect(dropTreeNode(nodes(), 'a', 'a', 'before')).toBeNull()
    expect(shape(dropTreeNode(nodes(), 'd', 'a', 'before'))).toEqual(['d', { a: ['b', 'c'] }, 'e'])
    expect(shape(dropTreeNode(nodes(), 'a', 'e', 'after'))).toEqual([
      'e',
      { a: [{ b: ['d'] }, 'c'] },
    ])
  })

  it('flattens the structure in display order', () => {
    expect(flattenTreeStructure(nodes())).toEqual([
      { key: 'a', parent: null },
      { key: 'b', parent: 'a' },
      { key: 'd', parent: 'b' },
      { key: 'c', parent: 'a' },
      { key: 'e', parent: null },
    ])
  })

  it('lists the visible rows with their level and position', () => {
    const rows = visibleTreeRows(nodes(), new Set(['a']))

    expect(
      rows.map((row) => [row.node.key, row.level, row.index, row.siblings, row.expanded]),
    ).toEqual([
      ['a', 1, 0, 2, true],
      ['b', 2, 0, 2, false],
      ['c', 2, 1, 2, false],
      ['e', 1, 1, 2, false],
    ])
  })
})

describe('TreeController', () => {
  const env = () => ({
    runner: {
      executeJson: vi.fn(async () => ({
        ok: true,
        notifications: [{ id: 'saved', format: 'alfakit' as const }],
      })),
    },
    token: 'tok',
    t: (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
      (fallback ?? key).replace(/:(\w+)/g, (_, name: string) => String(replacements[name] ?? '')),
    notify: vi.fn(),
    error: vi.fn(),
  })

  it('expands, collapses and moves with an announcement', () => {
    const tree = new TreeController(schema(), env())

    expect(tree.rows().map((row) => row.node.key)).toEqual(['a', 'b', 'd', 'c', 'e'])

    tree.collapseAll()
    expect(tree.rows().map((row) => row.node.key)).toEqual(['a', 'e'])

    tree.expandAll()
    expect(tree.move('c', 'up')).toBe(true)
    expect(tree.state.dirty).toBe(true)
    expect(tree.state.announcement).toBe('C moved to position 1 of 2, level 2.')

    tree.reset()
    expect(tree.state.dirty).toBe(false)
    expect(shape(tree.state.nodes)).toEqual(shape(nodes()))
  })

  it('saves the structure in one request through the reorder action', async () => {
    const environment = env()
    const tree = new TreeController(schema({ actionComponent: 'widget:menu' }), environment)

    tree.drop('e', 'a', 'before')
    expect(await tree.save()).toBe(true)

    expect(environment.runner.executeJson).toHaveBeenCalledTimes(1)
    expect(environment.runner.executeJson).toHaveBeenCalledWith(
      { type: 'Action', name: 'treeReorder', hasAction: true },
      {
        token: 'tok',
        component: 'widget:menu',
        arguments: { tree: flattenTreeStructure(tree.state.nodes) },
      },
    )
    expect(environment.notify).toHaveBeenCalledWith([{ id: 'saved', format: 'alfakit' }])
    expect(tree.state.dirty).toBe(false)
  })

  it('shows the server validation message and keeps the changes when saving fails', async () => {
    const environment = env()
    environment.runner.executeJson.mockRejectedValueOnce(
      new HttpError(422, { errors: { tree: ['A record cannot be moved inside itself.'] } }),
    )
    const tree = new TreeController(schema(), environment)

    tree.move('e', 'up')
    expect(await tree.save()).toBe(false)
    expect(environment.error).toHaveBeenCalledWith('A record cannot be moved inside itself.')
    expect(tree.state.dirty).toBe(true)
  })

  it('does not move read-only trees', () => {
    const tree = new TreeController(schema({ reorderable: false }), env())

    expect(tree.canMove('c', 'up')).toBe(false)
    expect(tree.move('c', 'up')).toBe(false)
  })

  it('handles arrow keys, mirrored for right-to-left trees', () => {
    const tree = new TreeController(schema(), env())

    expect(tree.handleKey('a', { key: 'ArrowDown' }).focus).toBe('b')
    expect(tree.handleKey('b', { key: 'ArrowLeft' })).toEqual({ handled: true, focus: 'b' })
    expect(tree.isExpanded('b')).toBe(false)
    expect(tree.handleKey('b', { key: 'ArrowLeft' }).focus).toBe('a')
    // In RTL, ArrowLeft opens.
    expect(tree.handleKey('b', { key: 'ArrowLeft' }, 'rtl')).toEqual({ handled: true, focus: 'b' })
    expect(tree.isExpanded('b')).toBe(true)
    expect(tree.handleKey('c', { key: 'ArrowUp', altKey: true }).handled).toBe(true)
    expect(shape(tree.state.nodes)).toEqual([{ a: ['c', { b: ['d'] }] }, 'e'])
    expect(tree.handleKey('a', { key: 'x' }).handled).toBe(false)
  })
})
