import type { ActionSchema, AnyActionSchema } from './actions'
import type { Color, IconName } from './common'
import type { SchemaComponent } from './components'
import type { FormPayload } from './form'
import type { NotificationSchema } from './notifications'
import type { BaseWidgetSchema } from './widgets'

/** A badge on a card (`CardBadge`). */
export interface KanbanBadgeSchema {
  label: string
  color?: Color
  icon?: IconName
  tooltip?: string
}

/** A person on a card (`CardAssignee`): their avatar, else their initials. */
export interface KanbanAssigneeSchema {
  name: string
  avatar?: string
}

/** One card (alfasix/alfakit-kanban): a record of the board. */
export interface KanbanCardSchema {
  /** The record key. */
  key: string
  title: string
  description?: string
  /** An accent colour on the card's edge. */
  color?: Color
  badges?: KanbanBadgeSchema[]
  assignees?: KanbanAssigneeSchema[]
  /** ISO 8601; format it with the panel's `LocaleFormatter`. */
  dueDate?: string
  /** Computed on the server (a past due date unless the card says otherwise). */
  overdue?: boolean
  /** 0–100. */
  progress?: number
  coverImage?: string
  coverImageAlt?: string
  /** The card's swimlane key on boards with swimlanes. */
  lane?: string
  /** False when the user may not move this card (policy `update`). */
  movable?: false
  /** False when the card action is hidden for this card. */
  clickable?: false
  /** The card action opens this URL (a resource page) instead of a modal. */
  url?: string
  /** `getCardSchema()`: infolist entries filled from the record. */
  schema?: SchemaComponent[]
  /** The card's menu, prepared with its record (run with `record: key`). */
  actions?: AnyActionSchema[]
}

export interface KanbanColumnSchema {
  /** The status value, as a string. */
  key: string
  label: string
  color?: Color
  icon?: IconName
  description?: string
  wipLimit?: number
  /** The server refuses moves into the column once it holds `wipLimit` cards. */
  wipStrict?: boolean
  collapsible?: boolean
  collapsed?: boolean
  /** Text of the empty column (defaults to "No cards"). */
  emptyState?: string
  /** Cards in the column, ignoring search and filters (what WIP limits count). */
  count: number
  /** Cards matching the search and filters (more than `cards.length` with `$cardsPerColumn`). */
  total: number
  /** The column offers the quick-create button (`createAction` with `{ column, lane }`). */
  creatable?: boolean
  cards: KanbanCardSchema[]
}

/** A row of a board with swimlanes. */
export interface KanbanLaneSchema {
  key: string
  label: string
  icon?: IconName
  avatar?: string
  collapsed?: boolean
}

/** The filters form above the board (table filters), keyed by filter name. */
export interface KanbanFiltersSchema extends FormPayload {
  /** The schema searchable selects load their options from (pages only). */
  component?: string | null
}

/**
 * The board of a `KanbanPage` (a schema component of type `kanban`) or a `KanbanWidget`
 * (its `kanban` prop), rendered by the `kanban` registry component.
 */
export interface KanbanSchema {
  type: 'kanban'
  key: string
  /** The action context of card actions, moves and fetches (`kanban` or `widget:<id>`). */
  actionComponent: string
  heading?: string
  columns: KanbanColumnSchema[]
  /** Swimlanes, in order; absent on boards without them. */
  lanes?: KanbanLaneSchema[]
  /** The user may move cards on this board. */
  movable: boolean
  /** Cards keep an order within their column (`$orderAttribute`). */
  orderable: boolean
  /** Cards may move to another swimlane. */
  laneMovable?: boolean
  /** Allowed moves, `{ from: [to…] }`; absent when every move is allowed. */
  transitions?: Record<string, string[]>
  /** The JSON action that moves a card (`record` + `{ [argumentsKey]: { column, lane, after, before } }`). */
  moveAction: string
  /** The JSON action that returns a fresh board (`{ [argumentsKey]: { search, filters } }`). */
  fetchAction: string
  argumentsKey: string
  /** Opened when a card is clicked (run with `record: key`). */
  cardAction?: ActionSchema
  /** The quick-create action (run with `arguments: { column, lane }`). */
  createAction?: ActionSchema
  searchable?: boolean
  search?: string
  filters?: KanbanFiltersSchema
  pollingInterval?: string
}

/** `KanbanWidget`: the board under `kanban`. */
export interface KanbanWidgetSchema extends BaseWidgetSchema {
  type: 'Kanban'
  component: 'kanban' | (string & {})
  kanban: KanbanSchema
}

/** What the move action answers. */
export interface KanbanMoveResult {
  ok: boolean
  /** The moved card as the server now draws it. */
  card?: KanbanCardSchema | null
  /** The `count` of the columns the move touched. */
  counts?: Record<string, number>
  notifications?: NotificationSchema[]
}

/** What the fetch action answers. */
export interface KanbanFetchResult {
  board: KanbanSchema
}
