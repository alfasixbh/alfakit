import type { ActionContext, ActionRunner } from './actions'
import { HttpError } from './http'
import type { ActionSchema } from './schema/actions'
import type { NotificationSchema } from './schema/notifications'
import type { TreeNodeSchema, TreeSchema, TreeStructureItem } from './schema/tree'
import { createStore, type Store } from './store'

/**
 * The framework-agnostic half of the tree component (alfasix/alfakit-tree): pure
 * operations on the nested nodes and a `TreeController` holding the working copy, the
 * expanded nodes and the save request. Renderers draw `rows()` and wire buttons, native
 * drag and drop and the keyboard to it. The server validates every saved structure again
 * (records, cycles, depth, tenant); these checks only keep the UI from offering moves it
 * would reject.
 */

/** The registry key of the tree component. */
export const TREE_REGISTRY_KEY = 'tree'

export type TreeMove = 'up' | 'down' | 'indent' | 'outdent'

export type TreeDropPosition = 'before' | 'after' | 'inside'

/** A visible row: a node with its place in the tree. */
export interface TreeRow {
  node: TreeNodeSchema
  /** 1 for roots. */
  level: number
  parent: string | null
  /** Position among its siblings, from 0. */
  index: number
  siblings: number
  hasChildren: boolean
  expanded: boolean
}

interface Located {
  node: TreeNodeSchema
  siblings: TreeNodeSchema[]
  index: number
  parent: TreeNodeSchema | null
  level: number
}

function locate(
  nodes: TreeNodeSchema[],
  key: string,
  parent: TreeNodeSchema | null = null,
  level = 1,
): Located | null {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!

    if (node.key === key) {
      return { node, siblings: nodes, index, parent, level }
    }

    const found = locate(node.children, key, node, level + 1)

    if (found) {
      return found
    }
  }

  return null
}

/** Deep copy of the nodes (children arrays only; the node data is shared). */
export function cloneTreeNodes(nodes: TreeNodeSchema[]): TreeNodeSchema[] {
  return nodes.map((node) => ({ ...node, children: cloneTreeNodes(node.children) }))
}

/** Levels of a node's subtree, the node included (a leaf is 1). */
export function treeSubtreeHeight(node: TreeNodeSchema): number {
  return 1 + Math.max(0, ...node.children.map(treeSubtreeHeight))
}

function fitsDepth(level: number, node: TreeNodeSchema, maxDepth: number | null | undefined) {
  return !maxDepth || level + treeSubtreeHeight(node) - 1 <= maxDepth
}

function contains(node: TreeNodeSchema, key: string): boolean {
  return node.children.some((child) => child.key === key || contains(child, key))
}

/**
 * The tree after moving a node one step (`up`/`down` among its siblings, `indent` into
 * the sibling above, `outdent` to after its parent), or null when the move isn't possible
 * (first/last sibling, root, or deeper than `maxDepth`).
 */
export function moveTreeNode(
  nodes: TreeNodeSchema[],
  key: string,
  move: TreeMove,
  maxDepth?: number | null,
): TreeNodeSchema[] | null {
  const tree = cloneTreeNodes(nodes)
  const found = locate(tree, key)

  if (!found) {
    return null
  }

  const { node, siblings, index, parent, level } = found

  switch (move) {
    case 'up':
    case 'down': {
      const target = move === 'up' ? index - 1 : index + 1

      if (target < 0 || target >= siblings.length) {
        return null
      }

      siblings.splice(index, 1)
      siblings.splice(target, 0, node)

      return tree
    }
    case 'indent': {
      const above = siblings[index - 1]

      if (!above || !fitsDepth(level + 1, node, maxDepth)) {
        return null
      }

      siblings.splice(index, 1)
      above.children.push(node)

      return tree
    }
    case 'outdent': {
      if (!parent) {
        return null
      }

      const grand = locate(tree, parent.key)

      if (!grand) {
        return null
      }

      siblings.splice(index, 1)
      grand.siblings.splice(grand.index + 1, 0, node)

      return tree
    }
  }
}

/**
 * The tree after dropping `key` before, after or inside `target`, or null when that would
 * put a node inside itself or exceed `maxDepth`.
 */
export function dropTreeNode(
  nodes: TreeNodeSchema[],
  key: string,
  target: string,
  position: TreeDropPosition,
  maxDepth?: number | null,
): TreeNodeSchema[] | null {
  if (key === target) {
    return null
  }

  const tree = cloneTreeNodes(nodes)
  const dragged = locate(tree, key)
  const destination = locate(tree, target)

  if (!dragged || !destination || contains(dragged.node, target)) {
    return null
  }

  const level = position === 'inside' ? destination.level + 1 : destination.level

  if (!fitsDepth(level, dragged.node, maxDepth)) {
    return null
  }

  dragged.siblings.splice(dragged.index, 1)

  // The destination may have shifted when the dragged node was its earlier sibling.
  const again = locate(tree, target)!

  if (position === 'inside') {
    again.node.children.push(dragged.node)
  } else {
    again.siblings.splice(position === 'before' ? again.index : again.index + 1, 0, dragged.node)
  }

  return tree
}

/** The structure as the server's reorder action reads it, in display order. */
export function flattenTreeStructure(
  nodes: TreeNodeSchema[],
  parent: string | null = null,
): TreeStructureItem[] {
  return nodes.flatMap((node) => [
    { key: node.key, parent },
    ...flattenTreeStructure(node.children, node.key),
  ])
}

/** Keys of every node that has children. */
export function treeParentKeys(nodes: TreeNodeSchema[]): string[] {
  return nodes.flatMap((node) =>
    node.children.length > 0 ? [node.key, ...treeParentKeys(node.children)] : [],
  )
}

/** The rows a renderer draws: every node whose ancestors are all expanded. */
export function visibleTreeRows(
  nodes: TreeNodeSchema[],
  expanded: ReadonlySet<string>,
  parent: string | null = null,
  level = 1,
): TreeRow[] {
  return nodes.flatMap((node, index) => {
    const hasChildren = node.children.length > 0
    const isExpanded = hasChildren && expanded.has(node.key)
    const row: TreeRow = {
      node,
      level,
      parent,
      index,
      siblings: nodes.length,
      hasChildren,
      expanded: isExpanded,
    }

    return isExpanded
      ? [row, ...visibleTreeRows(node.children, expanded, node.key, level + 1)]
      : [row]
  })
}

export interface TreeState {
  nodes: TreeNodeSchema[]
  expanded: ReadonlySet<string>
  /** The working copy differs from the saved structure. */
  dirty: boolean
  saving: boolean
  /** The node being dragged. */
  dragging: string | null
  /** The last move, for a live region (`tree.moved`). */
  announcement: string
}

export interface TreeSaveResult {
  ok: boolean
  changed?: number
  notifications?: NotificationSchema[]
}

export interface TreeEnvironment {
  runner: Pick<ActionRunner, 'executeJson'>
  token: string
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string
  notify(notifications: NotificationSchema[]): void
  error(message: string): void
}

/** The keyboard shortcuts of a focused tree item, by `KeyboardEvent.key`. */
export interface TreeKeyResult {
  /** The row to focus next. */
  focus?: string
  /** The event was handled (prevent the default). */
  handled: boolean
}

/**
 * The state of one rendered tree. `setTree()` takes a fresh schema from the server (after
 * an action or a save); the expanded nodes are kept.
 */
export class TreeController {
  public readonly store: Store<TreeState>

  private saved: TreeNodeSchema[]

  constructor(
    private tree: TreeSchema,
    private env: TreeEnvironment,
  ) {
    this.saved = tree.nodes
    this.store = createStore<TreeState>({
      nodes: tree.nodes,
      expanded: new Set(tree.collapsed ? [] : treeParentKeys(tree.nodes)),
      dirty: false,
      saving: false,
      dragging: null,
      announcement: '',
    })
  }

  get state(): TreeState {
    return this.store.get()
  }

  /** The renderer's latest runner, token and translator (they may change between renders). */
  setEnvironment(env: TreeEnvironment): void {
    this.env = env
  }

  get schema(): TreeSchema {
    return this.tree
  }

  /** The schema changed on the server: show it, keeping the expanded nodes. */
  setTree(tree: TreeSchema): void {
    const known = new Set(treeParentKeys(this.tree.nodes))
    this.tree = tree
    this.saved = tree.nodes

    const expanded = new Set(this.state.expanded)

    // Nodes that just got children open, unless the tree starts collapsed.
    for (const key of treeParentKeys(tree.nodes)) {
      if (!known.has(key) && !tree.collapsed) {
        expanded.add(key)
      }
    }

    this.store.update({ nodes: tree.nodes, expanded, dirty: false })
  }

  rows(): TreeRow[] {
    return visibleTreeRows(this.state.nodes, this.state.expanded)
  }

  isExpanded(key: string): boolean {
    return this.state.expanded.has(key)
  }

  toggle(key: string, expanded = !this.isExpanded(key)): void {
    const next = new Set(this.state.expanded)

    if (expanded) {
      next.add(key)
    } else {
      next.delete(key)
    }

    this.store.update({ expanded: next })
  }

  expandAll(): void {
    this.store.update({ expanded: new Set(treeParentKeys(this.state.nodes)) })
  }

  collapseAll(): void {
    this.store.update({ expanded: new Set() })
  }

  canMove(key: string, move: TreeMove): boolean {
    return (
      this.tree.reorderable &&
      moveTreeNode(this.state.nodes, key, move, this.tree.maxDepth) !== null
    )
  }

  move(key: string, move: TreeMove): boolean {
    if (!this.tree.reorderable) {
      return false
    }

    const nodes = moveTreeNode(this.state.nodes, key, move, this.tree.maxDepth)

    return nodes
      ? this.apply(nodes, key, move === 'indent' ? locate(nodes, key)?.parent?.key : null)
      : false
  }

  canDrop(key: string, target: string, position: TreeDropPosition): boolean {
    return (
      this.tree.reorderable &&
      dropTreeNode(this.state.nodes, key, target, position, this.tree.maxDepth) !== null
    )
  }

  drop(key: string, target: string, position: TreeDropPosition): boolean {
    if (!this.tree.reorderable) {
      return false
    }

    const nodes = dropTreeNode(this.state.nodes, key, target, position, this.tree.maxDepth)

    return nodes ? this.apply(nodes, key, position === 'inside' ? target : null) : false
  }

  startDrag(key: string): void {
    this.store.update({ dragging: key })
  }

  endDrag(): void {
    this.store.update({ dragging: null })
  }

  /** Throw away the unsaved changes. */
  reset(): void {
    this.store.update({ nodes: this.saved, dirty: false, announcement: '' })
  }

  /** Save the working copy with the tree's reorder action. */
  async save(): Promise<boolean> {
    if (!this.state.dirty || this.state.saving) {
      return false
    }

    this.store.update({ saving: true })

    const action: ActionSchema = { type: 'Action', name: this.tree.reorderAction, hasAction: true }
    const context: ActionContext = {
      token: this.env.token,
      component: this.tree.actionComponent,
      arguments: { tree: flattenTreeStructure(this.state.nodes) },
    }

    try {
      const result = await this.env.runner.executeJson<TreeSaveResult>(action, context)

      this.saved = this.state.nodes
      this.store.update({ saving: false, dirty: false })
      this.env.notify(result?.notifications ?? [])

      return true
    } catch (error) {
      this.store.update({ saving: false })

      const message =
        error instanceof HttpError && error.status === 422 ? error.errors.tree?.[0] : undefined

      this.env.error(message ?? this.env.t('tree.save_failed', {}, 'The order could not be saved.'))

      return false
    }
  }

  /**
   * Arrow keys move the focus (Up/Down), open and close nodes (Right/Left, mirrored in
   * right-to-left layouts), Home/End jump; with Alt they move the focused node.
   */
  handleKey(
    key: string,
    event: { key: string; altKey?: boolean },
    direction: 'ltr' | 'rtl' = 'ltr',
  ): TreeKeyResult {
    const rows = this.rows()
    const position = rows.findIndex((row) => row.node.key === key)
    const row = rows[position]

    if (!row) {
      return { handled: false }
    }

    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

    if (event.altKey) {
      const move: TreeMove | null =
        event.key === 'ArrowUp'
          ? 'up'
          : event.key === 'ArrowDown'
            ? 'down'
            : event.key === forward
              ? 'indent'
              : event.key === backward
                ? 'outdent'
                : null

      if (!move) {
        return { handled: false }
      }

      this.move(key, move)

      return { handled: true, focus: key }
    }

    switch (event.key) {
      case 'ArrowDown':
        return { handled: true, focus: rows[position + 1]?.node.key ?? key }
      case 'ArrowUp':
        return { handled: true, focus: rows[position - 1]?.node.key ?? key }
      case 'Home':
        return { handled: true, focus: rows[0]?.node.key ?? key }
      case 'End':
        return { handled: true, focus: rows.at(-1)?.node.key ?? key }
      case forward:
        if (row.hasChildren && !row.expanded) {
          this.toggle(key, true)

          return { handled: true, focus: key }
        }

        return { handled: true, focus: row.hasChildren ? rows[position + 1]?.node.key : key }
      case backward:
        if (row.expanded) {
          this.toggle(key, false)

          return { handled: true, focus: key }
        }

        return { handled: true, focus: row.parent ?? key }
      default:
        return { handled: false }
    }
  }

  private apply(nodes: TreeNodeSchema[], key: string, open: string | null | undefined): boolean {
    const expanded = new Set(this.state.expanded)

    if (open) {
      expanded.add(open)
    }

    const found = locate(nodes, key)
    const announcement = found
      ? this.env.t(
          'tree.moved',
          {
            title: found.node.title,
            position: found.index + 1,
            count: found.siblings.length,
            level: found.level,
          },
          ':title moved to position :position of :count, level :level.',
        )
      : ''

    this.store.update({ nodes, expanded, dirty: true, announcement })

    return true
  }
}
