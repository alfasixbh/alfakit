import type { AnyActionSchema } from './actions'
import type { IconName } from './common'
import type { BaseWidgetSchema } from './widgets'

/** One node of a tree (alfasix/alfakit-tree). */
export interface TreeNodeSchema {
  /** The record key. */
  key: string
  title: string
  icon?: IconName
  /** Node actions, prepared with the node's record (run with `record: key`). */
  actions?: AnyActionSchema[]
  children: TreeNodeSchema[]
}

/**
 * The tree of a `TreePage` (a schema component of type `tree`) or a `TreeWidget` (its
 * `tree` prop), rendered by the `tree` registry component.
 */
export interface TreeSchema {
  type: 'tree'
  key: string
  /** The action context of node actions and of saving (`tree` or `widget:<id>`). */
  actionComponent: string
  heading?: string
  /** Levels allowed (1 = a flat list); absent for no limit. */
  maxDepth?: number | null
  /** The user may rearrange the tree. */
  reorderable: boolean
  /** Nodes start collapsed. */
  collapsed?: boolean
  /** The JSON action that saves a new structure (`{ tree: [{ key, parent }] }`). */
  reorderAction: string
  nodes: TreeNodeSchema[]
}

/** `TreeWidget`: the tree under `tree`. */
export interface TreeWidgetSchema extends BaseWidgetSchema {
  type: 'Tree'
  component: 'tree' | (string & {})
  tree: TreeSchema
}

/** What a saved structure looks like on the wire, in display order. */
export interface TreeStructureItem {
  key: string
  parent: string | null
}
