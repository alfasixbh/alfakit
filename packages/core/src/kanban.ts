import type { ActionContext, ActionRunner } from './actions'
import { FormStore } from './form'
import { HttpError } from './http'
import type { Translator } from './i18n'
import { PollScheduler } from './poll'
import type { ActionSchema } from './schema/actions'
import type {
  KanbanCardSchema,
  KanbanColumnSchema,
  KanbanFetchResult,
  KanbanLaneSchema,
  KanbanMoveResult,
  KanbanSchema,
} from './schema/kanban'
import type { NotificationSchema } from './schema/notifications'
import { createStore, type Store } from './store'

/**
 * The framework-agnostic half of the Kanban board (alfasix/alfakit-kanban): pure
 * operations on the columns, a `KanbanController` holding the working copy, the picked-up
 * card, the search and the requests, and `attachKanbanPointer()`, which drives mouse, pen
 * and touch dragging over the DOM every renderer emits. Renderers only draw the state.
 *
 * Moves are optimistic: the card moves at once and returns when the server refuses. The
 * server checks every move again (record, policy, column, transition, WIP limit, lane,
 * tenant); the checks here only keep the UI from offering moves it would refuse.
 */

/** The registry key of the board component. */
export const KANBAN_REGISTRY_KEY = 'kanban'

/** The lane key of cards without a swimlane value (`Swimlane::NONE`). */
export const KANBAN_NO_LANE = '__none'

/** Where a card is, or should go: a column, a lane (null on boards without lanes) and a position in that lane. */
export interface KanbanTarget {
  column: string
  lane: string | null
  /** Position among the lane's cards in the column, from 0. */
  index: number
}

/** Why a move is not offered. */
export type KanbanRefusal = 'locked' | 'transition' | 'wip' | 'lane'

export interface KanbanLocation {
  column: KanbanColumnSchema
  columnIndex: number
  card: KanbanCardSchema
  /** Position in the column's card list. */
  index: number
  lane: string | null
  /** Position among the lane's cards in the column. */
  laneIndex: number
  laneCount: number
}

/** The cards of one lane of a column (every card when `lane` is null). */
export function kanbanCardsIn(column: KanbanColumnSchema, lane: string | null): KanbanCardSchema[] {
  return lane === null
    ? column.cards
    : column.cards.filter((card) => (card.lane ?? KANBAN_NO_LANE) === lane)
}

export function locateKanbanCard(
  columns: KanbanColumnSchema[],
  key: string,
): KanbanLocation | null {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
    const column = columns[columnIndex]!
    const index = column.cards.findIndex((card) => card.key === key)

    if (index >= 0) {
      const card = column.cards[index]!
      const lane = card.lane ?? null
      const laneCards = kanbanCardsIn(column, lane)

      return {
        column,
        columnIndex,
        card,
        index,
        lane,
        laneIndex: laneCards.indexOf(card),
        laneCount: laneCards.length,
      }
    }
  }

  return null
}

/** Where a card is now. */
export function kanbanCardPosition(
  columns: KanbanColumnSchema[],
  key: string,
): KanbanTarget | null {
  const found = locateKanbanCard(columns, key)

  return found ? { column: found.column.key, lane: found.lane, index: found.laneIndex } : null
}

function sameTarget(a: KanbanTarget, b: KanbanTarget): boolean {
  return a.column === b.column && a.lane === b.lane && a.index === b.index
}

/**
 * The columns after moving a card to `target` (counts follow the card), or null when the
 * card or column doesn't exist.
 */
export function moveKanbanCard(
  columns: KanbanColumnSchema[],
  key: string,
  target: KanbanTarget,
): KanbanColumnSchema[] | null {
  const from = locateKanbanCard(columns, key)
  const toIndex = columns.findIndex((column) => column.key === target.column)

  if (!from || toIndex < 0) {
    return null
  }

  const next = columns.map((column) => ({ ...column, cards: [...column.cards] }))
  const card: KanbanCardSchema =
    target.lane === null || target.lane === from.lane
      ? from.card
      : { ...from.card, lane: target.lane }

  next[from.columnIndex]!.cards.splice(from.index, 1)

  const destination = next[toIndex]!
  const laneCards = kanbanCardsIn(destination, target.lane)
  let at: number

  if (laneCards.length === 0) {
    at = target.lane === null ? 0 : destination.cards.length
  } else if (target.index >= laneCards.length) {
    at = destination.cards.indexOf(laneCards[laneCards.length - 1]!) + 1
  } else {
    at = destination.cards.indexOf(laneCards[Math.max(0, target.index)]!)
  }

  destination.cards.splice(at, 0, card)

  if (from.columnIndex !== toIndex) {
    const source = next[from.columnIndex]!
    source.count = Math.max(0, source.count - 1)
    source.total = Math.max(0, source.total - 1)
    destination.count += 1
    destination.total += 1
  }

  return next
}

/**
 * Why the board would refuse moving a card from `origin` (where it was picked up) to
 * `target`, or null when the move is offered. `columns` is the working copy, which may
 * already show the card elsewhere.
 */
export function kanbanRefusal(
  board: Pick<KanbanSchema, 'movable' | 'transitions' | 'laneMovable'>,
  columns: KanbanColumnSchema[],
  key: string,
  origin: KanbanTarget,
  target: KanbanTarget,
): KanbanRefusal | null {
  const found = locateKanbanCard(columns, key)

  if (!board.movable || !found || found.card.movable === false) {
    return 'locked'
  }

  if (target.column !== origin.column) {
    const allowed = board.transitions?.[origin.column]

    if (allowed && !allowed.includes(target.column)) {
      return 'transition'
    }

    const column = columns.find((candidate) => candidate.key === target.column)

    if (column?.wipStrict && column.wipLimit !== undefined) {
      const held = column.count - (found.column.key === column.key ? 1 : 0)

      if (held >= column.wipLimit) {
        return 'wip'
      }
    }
  }

  if (target.lane !== origin.lane && !board.laneMovable) {
    return 'lane'
  }

  return null
}

/**
 * The move as the server's move action reads it: the target column and lane, and the
 * neighbour the card follows (or precedes) in its column.
 */
export function kanbanMovePayload(
  board: Pick<KanbanSchema, 'orderable' | 'lanes'>,
  columns: KanbanColumnSchema[],
  key: string,
): Record<string, unknown> {
  const found = locateKanbanCard(columns, key)

  if (!found) {
    return {}
  }

  const payload: Record<string, unknown> = { column: found.column.key }

  if (board.lanes && found.lane !== null) {
    payload.lane = found.lane
  }

  if (!board.orderable) {
    return payload
  }

  const after = found.column.cards[found.index - 1]
  const before = found.column.cards[found.index + 1]

  if (after) payload.after = after.key
  else if (before) payload.before = before.key
  else payload.position = 'end'

  return payload
}

/** The initials of a name, for avatars without an image. */
export function kanbanInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0]!, parts[parts.length - 1]!] : parts.slice(0, 1)

  return letters
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toUpperCase()
}

/** `count` against `wipLimit`: `over`, `full` or null. */
export function kanbanWipState(column: KanbanColumnSchema): 'over' | 'full' | null {
  if (column.wipLimit === undefined) return null
  if (column.count > column.wipLimit) return 'over'

  return column.count === column.wipLimit ? 'full' : null
}

/** How many filters of a filters form value hold something. */
export function kanbanActiveFilters(values: Record<string, unknown> | null | undefined): number {
  const filled = (value: unknown): boolean =>
    Array.isArray(value)
      ? value.length > 0
      : value !== null && value !== undefined && value !== '' && value !== false

  return Object.values(values ?? {}).filter(
    (state) => state !== null && typeof state === 'object' && Object.values(state).some(filled),
  ).length
}

/**
 * The form store of the board's filters (null without filters). Searchable selects load
 * their options from the schema the server names (pages only).
 */
export function createKanbanFiltersStore(
  board: Pick<KanbanSchema, 'filters' | 'actionComponent'>,
  token: string,
  optionsUrl?: string,
): FormStore | null {
  if (!board.filters) return null

  return new FormStore(
    {
      components: board.filters.components,
      state: board.filters.state,
      columns: board.filters.columns,
    },
    {
      token,
      component: board.filters.component ?? `${board.actionComponent}.kanbanFilters`,
      refreshUrl: undefined,
      optionsUrl: board.filters.component ? optionsUrl : undefined,
    },
  )
}

export interface KanbanPicked {
  key: string
  /** Where the card was picked up (it returns there on cancel or a refused move). */
  origin: KanbanTarget
  /** Where it is shown now. */
  target: KanbanTarget
  via: 'keyboard' | 'pointer'
}

export interface KanbanState {
  /** The working copy of the columns. */
  columns: KanbanColumnSchema[]
  collapsed: ReadonlySet<string>
  collapsedLanes: ReadonlySet<string>
  picked: KanbanPicked | null
  /** The column the picked card may not enter, and why (for styling a refused target). */
  refused: { column: string; reason: KanbanRefusal } | null
  /** Cards whose move is being saved. */
  saving: ReadonlySet<string>
  search: string
  /** The filters form values the board was last asked for; null for the defaults. */
  filters: Record<string, unknown> | null
  loading: boolean
  /** For a polite live region. */
  announcement: string
}

export interface KanbanEnvironment {
  runner: Pick<ActionRunner, 'executeJson' | 'trigger'>
  token: string
  t: Translator['t']
  notify(notifications: NotificationSchema[]): void
  error(message: string): void
  /** Follow a card's URL (an Inertia visit). */
  visit?(url: string): void
}

export interface KanbanKeyResult {
  handled: boolean
  /** The card to focus next. */
  focus?: string
  /** Open the card (Enter). */
  open?: boolean
}

type Direction = 'up' | 'down' | 'previous' | 'next'

/**
 * The state of one rendered board. `setBoard()` takes a fresh schema from the server
 * (after an action ran or a poll); collapsed columns and the search are kept.
 */
export class KanbanController {
  public readonly store: Store<KanbanState>

  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private pendingBoard: KanbanSchema | null = null
  private refreshAfterMove = false
  private fetchId = 0

  constructor(
    private board: KanbanSchema,
    private env: KanbanEnvironment,
  ) {
    this.store = createStore<KanbanState>({
      columns: board.columns,
      collapsed: new Set(board.columns.filter((column) => column.collapsed).map((c) => c.key)),
      collapsedLanes: new Set(
        (board.lanes ?? []).filter((lane) => lane.collapsed).map((l) => l.key),
      ),
      picked: null,
      refused: null,
      saving: new Set(),
      search: board.search ?? '',
      filters: null,
      loading: false,
      announcement: '',
    })
  }

  get state(): KanbanState {
    return this.store.get()
  }

  get schema(): KanbanSchema {
    return this.board
  }

  /** The renderer's latest runner, token and translator. */
  setEnvironment(env: KanbanEnvironment): void {
    this.env = env
  }

  /** The rows to draw: the board's lanes, or one row (null) without swimlanes. */
  lanes(): Array<KanbanLaneSchema | null> {
    return this.board.lanes && this.board.lanes.length > 0 ? this.board.lanes : [null]
  }

  /** The schema changed on the server (an action ran): show it, keeping the user's view. */
  setBoard(board: KanbanSchema): void {
    if (this.state.picked || this.state.saving.size > 0) {
      this.pendingBoard = board
      return
    }

    // The server draws the default view; ask again for the user's search and filters.
    if (this.isQueried()) {
      this.board = { ...board, columns: this.board.columns, lanes: this.board.lanes }
      void this.refresh()
      return
    }

    this.applyBoard(board)
  }

  private isQueried(): boolean {
    return this.state.search !== (this.board.search ?? '') || this.state.filters !== null
  }

  private applyBoard(board: KanbanSchema): void {
    const known = new Set(this.board.columns.map((column) => column.key))
    const collapsed = new Set(
      [...this.state.collapsed].filter((key) => board.columns.some((c) => c.key === key)),
    )

    for (const column of board.columns) {
      if (!known.has(column.key) && column.collapsed) collapsed.add(column.key)
    }

    this.board = board
    this.store.update({ columns: board.columns, collapsed })
  }

  // ------------------------------------------------------------- Columns and lanes

  isCollapsed(column: string): boolean {
    return this.state.collapsed.has(column)
  }

  toggleColumn(column: string, collapsed = !this.isCollapsed(column)): void {
    const next = new Set(this.state.collapsed)

    if (collapsed) next.add(column)
    else next.delete(column)

    this.store.update({ collapsed: next })
  }

  toggleLane(lane: string, collapsed = !this.state.collapsedLanes.has(lane)): void {
    const next = new Set(this.state.collapsedLanes)

    if (collapsed) next.add(lane)
    else next.delete(lane)

    this.store.update({ collapsedLanes: next })
  }

  // ------------------------------------------------------------- Moving

  canPick(key: string): boolean {
    const found = locateKanbanCard(this.state.columns, key)

    return Boolean(this.board.movable && found && found.card.movable !== false)
  }

  /** Pick a card up (Space, or the start of a drag). */
  pick(key: string, via: KanbanPicked['via'] = 'keyboard'): boolean {
    const origin = kanbanCardPosition(this.state.columns, key)

    if (!origin || !this.canPick(key) || this.state.saving.has(key)) {
      return false
    }

    this.store.update({
      picked: { key, origin, target: origin, via },
      refused: null,
      announcement: this.describe(
        'kanban.picked_up',
        key,
        ':title picked up in :column, position :position of :count.',
      ),
    })

    return true
  }

  /** Why the picked card may not go to `target`, or null. */
  refusal(target: KanbanTarget): KanbanRefusal | null {
    const picked = this.state.picked

    if (!picked) return 'locked'

    return kanbanRefusal(this.board, this.state.columns, picked.key, picked.origin, target)
  }

  /** Show the picked card at `target` (a preview until it is dropped). */
  hover(target: KanbanTarget): boolean {
    const picked = this.state.picked

    if (!picked) return false
    if (sameTarget(picked.target, target)) return true

    const reason = this.refusal(target)

    if (reason) {
      this.store.update({
        refused: { column: target.column, reason },
        announcement:
          picked.via === 'keyboard'
            ? this.refusedMessage(picked.key, target.column)
            : this.state.announcement,
      })

      return false
    }

    const columns = moveKanbanCard(this.state.columns, picked.key, target)

    if (!columns) return false

    const position = kanbanCardPosition(columns, picked.key) ?? target

    this.store.update({
      columns,
      picked: { ...picked, target: position },
      refused: null,
    })

    if (picked.via === 'keyboard') {
      this.store.update({
        announcement: this.describe(
          'kanban.moved',
          picked.key,
          ':title is in :column, position :position of :count.',
        ),
      })
    }

    return true
  }

  /** Put the picked card back where it was picked up. */
  cancel(): void {
    const picked = this.state.picked

    if (!picked) return

    const columns =
      moveKanbanCard(this.state.columns, picked.key, picked.origin) ?? this.state.columns
    const column = columns.find((candidate) => candidate.key === picked.origin.column)

    this.store.update({
      columns,
      picked: null,
      refused: null,
      announcement: this.env.t(
        'kanban.cancelled',
        { title: this.title(picked.key), column: column?.label ?? '' },
        'Move cancelled. :title is back in :column.',
      ),
    })
    this.flushPending()
  }

  /** Drop the picked card where it is shown and save the move. */
  async drop(): Promise<boolean> {
    const picked = this.state.picked

    if (!picked) return false

    if (sameTarget(picked.origin, picked.target)) {
      this.store.update({
        picked: null,
        refused: null,
        announcement: this.describe(
          'kanban.dropped',
          picked.key,
          ':title dropped in :column, position :position of :count.',
        ),
      })
      this.flushPending()

      return false
    }

    const saving = new Set(this.state.saving).add(picked.key)

    this.store.update({
      picked: null,
      refused: null,
      saving,
      announcement: this.describe(
        'kanban.dropped',
        picked.key,
        ':title dropped in :column, position :position of :count.',
      ),
    })

    return this.save(picked.key, picked.origin)
  }

  /** Move a card in one step (the keyboard, or a drop the renderer worked out itself). */
  async moveTo(key: string, target: KanbanTarget): Promise<boolean> {
    if (!this.pick(key, 'pointer')) return false
    if (!this.hover(target)) {
      this.cancel()
      return false
    }

    return this.drop()
  }

  private async save(key: string, origin: KanbanTarget): Promise<boolean> {
    const action: ActionSchema = { type: 'Action', name: this.board.moveAction, hasAction: true }
    const context: ActionContext = {
      token: this.env.token,
      component: this.board.actionComponent,
      record: key,
      arguments: {
        [this.board.argumentsKey]: kanbanMovePayload(this.board, this.state.columns, key),
      },
    }

    try {
      const result = await this.env.runner.executeJson<KanbanMoveResult>(action, context)

      if (result && result.ok === false) {
        throw new Error('refused')
      }

      this.applySaved(key, result)
      this.env.notify(result?.notifications ?? [])

      return true
    } catch (error) {
      const columns = moveKanbanCard(this.state.columns, key, origin) ?? this.state.columns
      const message =
        error instanceof HttpError && error.status === 422
          ? // A `ValidationException` from `beforeCardMoved()` under any key (`move`).
            (error.errors[this.board.argumentsKey]?.[0] ??
            Object.values(error.errors).find((messages) => messages?.[0])?.[0])
          : error instanceof HttpError && error.status === 403
            ? this.env.t('kanban.forbidden', {}, 'You are not allowed to move this card.')
            : undefined
      const text = message ?? this.env.t('kanban.move_failed', {}, 'The card could not be moved.')

      this.store.update({ columns, announcement: text })
      this.env.error(text)

      // The board changed under us: show the server's version.
      if (error instanceof HttpError && error.status === 422) this.refreshAfterMove = true

      return false
    } finally {
      const saving = new Set(this.state.saving)
      saving.delete(key)
      this.store.update({ saving })
      this.flushPending()
    }
  }

  private applySaved(key: string, result: KanbanMoveResult | null | undefined): void {
    const fresh = result?.card
    const counts = result?.counts ?? {}
    const columns = this.state.columns.map((column) => {
      const count = counts[column.key]
      const index = fresh ? column.cards.findIndex((card) => card.key === key) : -1

      if (count === undefined && index < 0) return column

      const cards =
        index >= 0 && fresh
          ? column.cards.map((card, at) =>
              at === index ? { ...fresh, lane: fresh.lane ?? card.lane } : card,
            )
          : column.cards

      return { ...column, cards, ...(count !== undefined ? { count } : {}) }
    })

    this.store.update({ columns })
  }

  private flushPending(): void {
    if (this.state.picked || this.state.saving.size > 0) return

    const board = this.pendingBoard
    this.pendingBoard = null

    if (board) {
      this.setBoard(board)
    } else if (this.refreshAfterMove) {
      this.refreshAfterMove = false
      void this.refresh()
    }
  }

  /** Move the picked card one step: within its lane, to the next lane or column. */
  step(direction: Direction): boolean {
    const picked = this.state.picked

    if (!picked) return false

    const { column, lane, index } = picked.target
    const columns = this.state.columns
    const current = columns.find((candidate) => candidate.key === column)
    const count = current ? kanbanCardsIn(current, lane).length : 0
    const lanes = this.lanes().map((row) => row?.key ?? null)
    const laneIndex = lanes.indexOf(lane)

    if (direction === 'up' || direction === 'down') {
      const within = direction === 'up' ? index - 1 : index + 1

      if (this.board.orderable && within >= 0 && within < count) {
        return this.hover({ column, lane, index: within })
      }

      const otherLane = lanes[laneIndex + (direction === 'up' ? -1 : 1)]

      if (otherLane === undefined || laneIndex < 0) return false

      const target = columns.find((candidate) => candidate.key === column)!
      const size = kanbanCardsIn(target, otherLane).length

      return this.hover({ column, lane: otherLane, index: direction === 'up' ? size : 0 })
    }

    const start = columns.findIndex((candidate) => candidate.key === column)
    const delta = direction === 'previous' ? -1 : 1
    let first: string | null = null

    for (let at = start + delta; at >= 0 && at < columns.length; at += delta) {
      const candidate = columns[at]!

      if (this.isCollapsed(candidate.key)) continue

      first ??= candidate.key

      const size = kanbanCardsIn(candidate, lane).length
      const target = { column: candidate.key, lane, index: Math.min(index, size) }

      if (!this.refusal(target)) {
        return this.hover(target)
      }
    }

    if (first) {
      this.store.update({ announcement: this.refusedMessage(picked.key, first) })
    }

    return false
  }

  /**
   * Keyboard handling for a focused card. Space picks a card up and drops it, arrow keys
   * move the focus or the picked card (mirrored right to left), Escape cancels, Enter
   * opens the card.
   */
  handleKey(
    key: string,
    event: { key: string },
    direction: 'ltr' | 'rtl' = 'ltr',
  ): KanbanKeyResult {
    const next = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const previous = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const picked = this.state.picked

    if (picked && picked.key === key) {
      switch (event.key) {
        case ' ':
        case 'Spacebar':
        case 'Enter':
          void this.drop()
          return { handled: true, focus: key }
        case 'Escape':
          this.cancel()
          return { handled: true, focus: key }
        case 'ArrowUp':
          this.step('up')
          return { handled: true, focus: key }
        case 'ArrowDown':
          this.step('down')
          return { handled: true, focus: key }
        case next:
          this.step('next')
          return { handled: true, focus: key }
        case previous:
          this.step('previous')
          return { handled: true, focus: key }
        case 'Tab':
          this.cancel()
          return { handled: false }
        default:
          return { handled: true, focus: key }
      }
    }

    switch (event.key) {
      case ' ':
      case 'Spacebar':
        if (!this.pick(key)) {
          this.store.update({
            announcement: this.env.t(
              'kanban.not_allowed',
              {
                title: this.title(key),
                column: locateKanbanCard(this.state.columns, key)?.column.label ?? '',
              },
              ':title cannot be moved to :column.',
            ),
          })
        }
        return { handled: true, focus: key }
      case 'Enter':
        return { handled: true, open: true }
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Home':
      case 'End':
        return { handled: true, focus: this.focusWithin(key, event.key) }
      case next:
      case previous:
        return { handled: true, focus: this.focusAcross(key, event.key === next ? 1 : -1) }
      default:
        return { handled: false }
    }
  }

  private focusWithin(key: string, keyName: string): string {
    const found = locateKanbanCard(this.state.columns, key)

    if (!found) return key

    const cards = kanbanCardsIn(found.column, found.lane)

    switch (keyName) {
      case 'Home':
        return cards[0]?.key ?? key
      case 'End':
        return cards[cards.length - 1]?.key ?? key
      case 'ArrowUp':
        return cards[found.laneIndex - 1]?.key ?? key
      default:
        return cards[found.laneIndex + 1]?.key ?? key
    }
  }

  private focusAcross(key: string, delta: number): string {
    const found = locateKanbanCard(this.state.columns, key)

    if (!found) return key

    const columns = this.state.columns

    for (let at = found.columnIndex + delta; at >= 0 && at < columns.length; at += delta) {
      const column = columns[at]!

      if (this.isCollapsed(column.key)) continue

      const cards = kanbanCardsIn(column, found.lane)

      if (cards.length > 0) {
        return cards[Math.min(found.laneIndex, cards.length - 1)]!.key
      }
    }

    return key
  }

  // ------------------------------------------------------------- Actions

  /** Open a card: its URL, else the card action with its record. */
  open(key: string): void {
    const found = locateKanbanCard(this.state.columns, key)

    if (!found || found.card.clickable === false) return

    if (found.card.url) {
      this.env.visit?.(found.card.url)
      return
    }

    if (this.board.cardAction) {
      void this.env.runner.trigger(this.board.cardAction, {
        token: this.env.token,
        component: this.board.actionComponent,
        record: key,
      })
    }
  }

  /** Open the quick-create modal for a column (and lane). */
  create(column: string, lane: string | null = null): void {
    if (!this.board.createAction) return

    void this.env.runner.trigger(this.board.createAction, {
      token: this.env.token,
      component: this.board.actionComponent,
      arguments: lane === null ? { column } : { column, lane },
    })
  }

  // ------------------------------------------------------------- Search, filters, polling

  setSearch(search: string, delay = 300): void {
    this.store.update({ search })
    this.schedule(delay)
  }

  setFilters(filters: Record<string, unknown> | null, delay = 300): void {
    this.store.update({ filters })
    this.schedule(delay)
  }

  private schedule(delay: number): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer)

    this.searchTimer = setTimeout(() => {
      this.searchTimer = null
      void this.refresh()
    }, delay)
  }

  /** Fetch the board again with the search and filters (skipped while a card moves). */
  async refresh(): Promise<void> {
    if (this.state.picked || this.state.saving.size > 0) {
      this.refreshAfterMove = true
      return
    }

    const id = ++this.fetchId
    const action: ActionSchema = { type: 'Action', name: this.board.fetchAction, hasAction: true }
    const state = this.state

    this.store.update({ loading: true })

    try {
      const result = await this.env.runner.executeJson<KanbanFetchResult>(action, {
        token: this.env.token,
        component: this.board.actionComponent,
        arguments: {
          [this.board.argumentsKey]: {
            search: state.search,
            ...(state.filters ? { filters: state.filters } : {}),
          },
        },
      })

      // A newer request or a move started meanwhile: its answer wins.
      if (id !== this.fetchId || !result?.board) return

      if (this.state.picked || this.state.saving.size > 0) {
        this.pendingBoard = null
        this.refreshAfterMove = true
        return
      }

      this.applyBoard({ ...result.board, search: this.state.search })
    } catch {
      if (id === this.fetchId) {
        this.env.error(this.env.t('kanban.load_failed', {}, 'The board could not be loaded.'))
      }
    } finally {
      if (id === this.fetchId) this.store.update({ loading: false })
    }
  }

  /** Poll the board every `pollingInterval`; returns a function that stops. */
  startPolling(): () => void {
    if (!this.board.pollingInterval) return () => {}

    const scheduler = new PollScheduler(() => this.refresh())

    return scheduler.subscribe(this.board.actionComponent, this.board.pollingInterval)
  }

  destroy(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer)
    this.searchTimer = null
  }

  // ------------------------------------------------------------- Announcements

  private title(key: string): string {
    return locateKanbanCard(this.state.columns, key)?.card.title ?? ''
  }

  private describe(translationKey: string, key: string, fallback: string): string {
    const found = locateKanbanCard(this.state.columns, key)

    if (!found) return ''

    return this.env.t(
      translationKey,
      {
        title: found.card.title,
        column: found.column.label,
        position: found.laneIndex + 1,
        count: found.laneCount,
      },
      fallback,
    )
  }

  private refusedMessage(key: string, column: string): string {
    const target = this.state.columns.find((candidate) => candidate.key === column)

    return this.env.t(
      'kanban.not_allowed',
      { title: this.title(key), column: target?.label ?? column },
      ':title cannot be moved to :column.',
    )
  }
}

// ----------------------------------------------------------------- Pointer dragging

export interface KanbanPointerOptions {
  /** `document.elementFromPoint` (injectable for tests). */
  elementFromPoint?: (x: number, y: number) => Element | null
  /** Milliseconds a touch must rest on a card before it drags (shorter moves scroll). */
  touchDelay?: number
}

const CARD = '[data-slot="kanban-card"]'
const DROPZONE = '[data-slot="kanban-dropzone"]'
const SCROLLER = '[data-slot="kanban-scroller"]'
const NO_DRAG =
  'button, a, input, textarea, select, label, [contenteditable], [data-kanban-no-drag]'

/**
 * Drag cards with a mouse, pen or finger. The board root delegates `pointerdown`; cards
 * are `[data-slot="kanban-card"][data-key]` (not `[data-movable="false"]`) inside
 * `[data-slot="kanban-dropzone"][data-column][data-lane]` lists. A touch drags after a
 * short press (a quick swipe scrolls); a mouse after a few pixels. While dragging, a copy
 * of the card follows the pointer, the card itself moves to where it would land, the board
 * scrolls near its edges and Escape cancels. Returns a function that detaches everything.
 */
export function attachKanbanPointer(
  root: HTMLElement,
  controller: KanbanController,
  options: KanbanPointerOptions = {},
): () => void {
  const doc = root.ownerDocument
  const view = doc.defaultView ?? window
  const fromPoint =
    options.elementFromPoint ?? ((x: number, y: number) => doc.elementFromPoint(x, y))
  const touchDelay = options.touchDelay ?? 220

  let pending: {
    id: number
    key: string
    element: HTMLElement
    x: number
    y: number
    touch: boolean
    timer: ReturnType<typeof setTimeout> | null
  } | null = null
  let drag: {
    id: number
    key: string
    ghost: HTMLElement
    offsetX: number
    offsetY: number
    x: number
    y: number
    frame: number | null
  } | null = null

  const preventTouch = (event: Event) => {
    if (drag) event.preventDefault()
  }

  const suppressClick = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const begin = () => {
    if (!pending) return

    const { element, key, x, y, id, touch } = pending
    pending.timer = null

    if (!controller.pick(key, 'pointer')) {
      pending = null
      return
    }

    const box = element.getBoundingClientRect()
    const ghost = element.cloneNode(true) as HTMLElement

    ghost.removeAttribute('id')
    ghost.setAttribute('data-slot', 'kanban-ghost')
    ghost.removeAttribute('data-picked')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'))
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${box.width}px`,
      margin: '0',
      pointerEvents: 'none',
      zIndex: '60',
      transform: `translate(${box.left}px, ${box.top}px)`,
    })
    doc.body.appendChild(ghost)
    doc.body.setAttribute('data-kanban-dragging', '')

    drag = { id, key, ghost, offsetX: x - box.left, offsetY: y - box.top, x, y, frame: null }
    pending = null

    if (touch) (view.navigator as Navigator | undefined)?.vibrate?.(10)

    autoScroll()
  }

  const targetAt = (x: number, y: number) => {
    const zone = fromPoint(x, y)?.closest<HTMLElement>(DROPZONE)

    if (!zone || !root.contains(zone)) return null

    const column = zone.dataset.column

    if (!column) return null

    const lane = zone.dataset.lane ?? null
    const cards = Array.from(zone.querySelectorAll<HTMLElement>(CARD)).filter(
      (card) => card.dataset.key !== drag?.key,
    )
    let index = 0

    for (const card of cards) {
      const box = card.getBoundingClientRect()

      if (y > box.top + box.height / 2) index++
    }

    return { column, lane: lane === '' ? null : lane, index }
  }

  const position = (x: number, y: number) => {
    if (!drag) return

    drag.x = x
    drag.y = y
    drag.ghost.style.transform = `translate(${x - drag.offsetX}px, ${y - drag.offsetY}px) rotate(2deg)`

    const target = targetAt(x, y)

    if (target) controller.hover(target)
  }

  // Scroll the board (and the window) while the pointer rests near an edge.
  const autoScroll = () => {
    if (!drag) return

    const edge = 48
    const speed = 14
    const scroller = root.querySelector<HTMLElement>(SCROLLER)

    if (scroller) {
      const box = scroller.getBoundingClientRect()

      if (drag.x < box.left + edge) scroller.scrollLeft -= speed
      else if (drag.x > box.right - edge) scroller.scrollLeft += speed
    }

    const zone = fromPoint(drag.x, drag.y)?.closest<HTMLElement>(DROPZONE)

    if (zone && zone.scrollHeight > zone.clientHeight) {
      const box = zone.getBoundingClientRect()

      if (drag.y < box.top + edge) zone.scrollTop -= speed
      else if (drag.y > box.bottom - edge) zone.scrollTop += speed
    }

    if (drag.y < edge) view.scrollBy?.(0, -speed)
    else if (drag.y > view.innerHeight - edge) view.scrollBy?.(0, speed)

    drag.frame = view.requestAnimationFrame?.(autoScroll) ?? null
  }

  const finish = (cancelled: boolean) => {
    if (pending?.timer) clearTimeout(pending.timer)
    pending = null

    if (drag) {
      if (drag.frame !== null) view.cancelAnimationFrame?.(drag.frame)
      drag.ghost.remove()
      doc.body.removeAttribute('data-kanban-dragging')
      drag = null

      if (cancelled) {
        controller.cancel()
      } else {
        void controller.drop()
        // The release would also click the card: swallow that one click.
        view.addEventListener('click', suppressClick, { capture: true, once: true })
        setTimeout(() => view.removeEventListener('click', suppressClick, { capture: true }), 0)
      }
    }

    doc.removeEventListener('pointermove', onMove)
    doc.removeEventListener('pointerup', onUp)
    doc.removeEventListener('pointercancel', onCancel)
    doc.removeEventListener('keydown', onKey, true)
    doc.removeEventListener('touchmove', preventTouch)
  }

  const onMove = (event: PointerEvent) => {
    if (drag && event.pointerId === drag.id) {
      event.preventDefault()
      position(event.clientX, event.clientY)
      return
    }

    if (!pending || event.pointerId !== pending.id) return

    const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y)

    if (pending.touch) {
      // Moving before the press settles is a scroll.
      if (distance > 8) finish(true)
      return
    }

    if (distance > 5) {
      begin()
      position(event.clientX, event.clientY)
    }
  }

  const onUp = (event: PointerEvent) => {
    if ((drag && event.pointerId === drag.id) || (pending && event.pointerId === pending.id)) {
      finish(false)
    }
  }

  const onCancel = () => finish(true)

  const onKey = (event: KeyboardEvent) => {
    if (drag && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      finish(true)
    }
  }

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || pending) return

    const target = event.target as Element | null
    const card = target?.closest<HTMLElement>(CARD)

    if (!card || !root.contains(card) || card.dataset.movable === 'false') return

    const blocker = target?.closest(NO_DRAG)

    if (blocker && card.contains(blocker)) return

    const key = card.dataset.key

    if (!key) return

    const touch = event.pointerType === 'touch'

    pending = {
      id: event.pointerId,
      key,
      element: card,
      x: event.clientX,
      y: event.clientY,
      touch,
      timer: null,
    }

    if (touch) pending.timer = setTimeout(begin, touchDelay)

    doc.addEventListener('pointermove', onMove)
    doc.addEventListener('pointerup', onUp)
    doc.addEventListener('pointercancel', onCancel)
    doc.addEventListener('keydown', onKey, true)
    doc.addEventListener('touchmove', preventTouch, { passive: false })
  }

  // Native drag and drop would fight the pointer handling (images, selected text).
  const onNativeDrag = (event: Event) => {
    if ((event.target as Element | null)?.closest?.(CARD)) event.preventDefault()
  }

  root.addEventListener('pointerdown', onDown)
  root.addEventListener('dragstart', onNativeDrag)

  return () => {
    finish(true)
    root.removeEventListener('pointerdown', onDown)
    root.removeEventListener('dragstart', onNativeDrag)
  }
}
