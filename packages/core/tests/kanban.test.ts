import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/http'
import {
  KANBAN_NO_LANE,
  KanbanController,
  type KanbanEnvironment,
  attachKanbanPointer,
  kanbanInitials,
  kanbanMovePayload,
  kanbanRefusal,
  kanbanWipState,
  moveKanbanCard,
} from '../src/kanban'
import type { KanbanCardSchema, KanbanColumnSchema, KanbanSchema } from '../src/schema/kanban'

const card = (key: string, extra: Partial<KanbanCardSchema> = {}): KanbanCardSchema => ({
  key,
  title: `Card ${key}`,
  ...extra,
})

const column = (
  key: string,
  cards: KanbanCardSchema[],
  extra: Partial<KanbanColumnSchema> = {},
) => ({
  key,
  label: key.toUpperCase(),
  count: cards.length,
  total: cards.length,
  cards,
  ...extra,
})

const board = (extra: Partial<KanbanSchema> = {}): KanbanSchema => ({
  type: 'kanban',
  key: 'kanban',
  actionComponent: 'kanban',
  movable: true,
  orderable: true,
  moveAction: 'kanbanMove',
  fetchAction: 'kanbanFetch',
  argumentsKey: 'kanban',
  columns: [
    column('todo', [card('1'), card('2')]),
    column('doing', [card('3')], { wipLimit: 2, wipStrict: true }),
    column('done', []),
  ],
  ...extra,
})

const keys = (columns: KanbanColumnSchema[] | null) =>
  Object.fromEntries((columns ?? []).map((c) => [c.key, c.cards.map((x) => x.key)]))

function environment(executeJson = vi.fn().mockResolvedValue({ ok: true })) {
  const env = {
    runner: { executeJson, trigger: vi.fn().mockResolvedValue(undefined) },
    token: 'tok',
    t: (_key: string, replacements: Record<string, string | number> = {}, fallback = '') =>
      Object.entries(replacements).reduce(
        (text, [name, value]) => text.replace(`:${name}`, String(value)),
        fallback,
      ),
    notify: vi.fn(),
    error: vi.fn(),
    visit: vi.fn(),
  } satisfies KanbanEnvironment

  return env
}

afterEach(() => {
  vi.useRealTimers()
})

describe('kanban operations', () => {
  it('moves cards between and within columns, with the counts', () => {
    const moved = moveKanbanCard(board().columns, '1', { column: 'doing', lane: null, index: 1 })

    expect(keys(moved)).toEqual({ todo: ['2'], doing: ['3', '1'], done: [] })
    expect(moved?.map((c) => c.count)).toEqual([1, 2, 0])
    expect(
      keys(moveKanbanCard(board().columns, '2', { column: 'todo', lane: null, index: 0 })),
    ).toEqual({
      todo: ['2', '1'],
      doing: ['3'],
      done: [],
    })
    expect(
      moveKanbanCard(board().columns, 'x', { column: 'done', lane: null, index: 0 }),
    ).toBeNull()
  })

  it('moves cards between swimlanes', () => {
    const columns = [
      column('todo', [
        card('1', { lane: 'a' }),
        card('2', { lane: 'b' }),
        card('3', { lane: 'a' }),
      ]),
    ]
    const moved = moveKanbanCard(columns, '2', { column: 'todo', lane: 'a', index: 1 })

    expect(keys(moved)).toEqual({ todo: ['1', '2', '3'] })
    expect(moved?.[0]?.cards[1]?.lane).toBe('a')
    expect(
      keys(moveKanbanCard(columns, '1', { column: 'todo', lane: KANBAN_NO_LANE, index: 0 })),
    ).toEqual({
      todo: ['2', '3', '1'],
    })
  })

  it('refuses locked cards, forbidden transitions, full columns and lane changes', () => {
    const origin = { column: 'todo', lane: null, index: 0 }
    const columns = board().columns

    expect(
      kanbanRefusal(board(), columns, '1', origin, { column: 'done', lane: null, index: 0 }),
    ).toBeNull()
    expect(
      kanbanRefusal(board({ movable: false }), columns, '1', origin, {
        column: 'done',
        lane: null,
        index: 0,
      }),
    ).toBe('locked')
    expect(
      kanbanRefusal(board({ transitions: { todo: ['todo', 'doing'] } }), columns, '1', origin, {
        column: 'done',
        lane: null,
        index: 0,
      }),
    ).toBe('transition')

    const full = columns.map((c) => (c.key === 'doing' ? { ...c, count: 2 } : c))

    expect(
      kanbanRefusal(board(), full, '1', origin, { column: 'doing', lane: null, index: 0 }),
    ).toBe('wip')
    expect(
      kanbanRefusal(board(), columns, '1', origin, { column: 'todo', lane: 'b', index: 0 }),
    ).toBe('lane')
    expect(
      kanbanRefusal(
        board(),
        [column('todo', [card('1', { movable: false })])],
        '1',
        origin,
        origin,
      ),
    ).toBe('locked')
  })

  it('describes a move by its neighbours', () => {
    const columns = moveKanbanCard(board().columns, '3', { column: 'todo', lane: null, index: 1 })!

    expect(kanbanMovePayload(board(), columns, '3')).toEqual({ column: 'todo', after: '1' })
    expect(kanbanMovePayload(board(), columns, '1')).toEqual({ column: 'todo', before: '3' })
    expect(
      kanbanMovePayload(
        board(),
        moveKanbanCard(columns, '1', { column: 'done', lane: null, index: 0 })!,
        '1',
      ),
    ).toEqual({
      column: 'done',
      position: 'end',
    })
    expect(kanbanMovePayload(board({ orderable: false }), columns, '3')).toEqual({ column: 'todo' })
  })

  it('works out initials and WIP states', () => {
    expect(kanbanInitials('Ada Lovelace')).toBe('AL')
    expect(kanbanInitials('  grace  ')).toBe('G')
    expect(kanbanWipState(column('x', [card('1'), card('2')], { wipLimit: 2 }))).toBe('full')
    expect(kanbanWipState(column('x', [card('1'), card('2')], { wipLimit: 1 }))).toBe('over')
    expect(kanbanWipState(column('x', []))).toBeNull()
  })
})

describe('KanbanController', () => {
  it('picks up, moves and drops a card with the keyboard in one request', async () => {
    const env = environment(
      vi.fn().mockResolvedValue({
        ok: true,
        card: card('1', { title: 'Fresh' }),
        counts: { todo: 1, done: 1 },
      }),
    )
    const controller = new KanbanController(board(), env)

    expect(controller.handleKey('1', { key: ' ' })).toEqual({ handled: true, focus: '1' })
    expect(controller.state.picked?.key).toBe('1')
    expect(controller.state.announcement).toBe('Card 1 picked up in TODO, position 1 of 2.')

    // Right goes to "doing" (room for one more), then past it to "done".
    controller.handleKey('1', { key: 'ArrowRight' })
    expect(keys(controller.state.columns).doing).toEqual(['1', '3'])
    controller.handleKey('1', { key: 'ArrowRight' })
    expect(keys(controller.state.columns).done).toEqual(['1'])
    expect(controller.state.announcement).toBe('Card 1 is in DONE, position 1 of 1.')

    controller.handleKey('1', { key: ' ' })
    await vi.waitFor(() => expect(controller.state.saving.size).toBe(0))

    expect(env.runner.executeJson).toHaveBeenCalledTimes(1)
    expect(env.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'kanbanMove' }),
      {
        token: 'tok',
        component: 'kanban',
        record: '1',
        arguments: { kanban: { column: 'done', position: 'end' } },
      },
    )
    expect(controller.state.columns[2]?.cards[0]?.title).toBe('Fresh')
    expect(controller.state.columns.map((c) => c.count)).toEqual([1, 1, 1])
  })

  it('mirrors the arrow keys right to left and cancels with Escape', () => {
    const controller = new KanbanController(board(), environment())

    controller.pick('3')
    controller.handleKey('3', { key: 'ArrowRight' }, 'rtl')
    expect(keys(controller.state.columns).todo).toEqual(['3', '1', '2'])

    controller.handleKey('3', { key: 'Escape' })
    expect(keys(controller.state.columns)).toEqual({ todo: ['1', '2'], doing: ['3'], done: [] })
    expect(controller.state.picked).toBeNull()
    expect(controller.state.announcement).toBe('Move cancelled. Card 3 is back in DOING.')
  })

  it('moves the focus between cards and columns, and opens cards', () => {
    const env = environment()
    const controller = new KanbanController(
      board({ cardAction: { type: 'Action', name: 'view', hasModal: true } }),
      env,
    )

    expect(controller.handleKey('1', { key: 'ArrowDown' }).focus).toBe('2')
    expect(controller.handleKey('2', { key: 'ArrowRight' }).focus).toBe('3')
    expect(controller.handleKey('3', { key: 'ArrowLeft' }).focus).toBe('1')
    expect(controller.handleKey('1', { key: 'End' }).focus).toBe('2')
    expect(controller.handleKey('1', { key: 'Enter' })).toEqual({ handled: true, open: true })

    controller.open('1')
    expect(env.runner.trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'view' }), {
      token: 'tok',
      component: 'kanban',
      record: '1',
    })

    controller.create('done', 'a')
    expect(env.runner.trigger).toHaveBeenCalledTimes(1)
  })

  it('follows card URLs', () => {
    const env = environment()
    const controller = new KanbanController(
      board({ columns: [column('todo', [card('1', { url: '/tasks/1' })])] }),
      env,
    )

    controller.open('1')
    expect(env.visit).toHaveBeenCalledWith('/tasks/1')
  })

  it('rolls a refused move back and shows the server message', async () => {
    const env = environment(
      vi.fn().mockRejectedValue(new HttpError(422, { errors: { kanban: ['DONE is full.'] } })),
    )
    const controller = new KanbanController(board(), env)

    expect(await controller.moveTo('1', { column: 'done', lane: null, index: 0 })).toBe(false)

    expect(keys(controller.state.columns)).toEqual({ todo: ['1', '2'], doing: ['3'], done: [] })
    expect(controller.state.columns.map((c) => c.count)).toEqual([2, 1, 0])
    expect(env.error).toHaveBeenCalledWith('DONE is full.')
  })

  it('shows the message of a refusal keyed by another name (beforeCardMoved())', async () => {
    const env = environment(
      vi
        .fn()
        .mockRejectedValue(
          new HttpError(422, { errors: { move: ['QA refuses to move this card.'] } }),
        ),
    )
    const controller = new KanbanController(board(), env)

    expect(await controller.moveTo('1', { column: 'done', lane: null, index: 0 })).toBe(false)
    expect(env.error).toHaveBeenCalledWith('QA refuses to move this card.')
  })

  it('rolls back on a forbidden move and a refused answer', async () => {
    const env = environment(vi.fn().mockRejectedValue(new HttpError(403, {})))
    const controller = new KanbanController(board(), env)

    await controller.moveTo('2', { column: 'done', lane: null, index: 0 })
    expect(env.error).toHaveBeenCalledWith('You are not allowed to move this card.')

    env.runner.executeJson.mockResolvedValue({ ok: false })
    await controller.moveTo('2', { column: 'done', lane: null, index: 0 })
    expect(env.error).toHaveBeenLastCalledWith('The card could not be moved.')
    expect(keys(controller.state.columns).todo).toEqual(['1', '2'])
  })

  it('does not pick up cards the user may not move', () => {
    const controller = new KanbanController(
      board({ columns: [column('todo', [card('1', { movable: false })])] }),
      environment(),
    )

    controller.handleKey('1', { key: ' ' })
    expect(controller.state.picked).toBeNull()
    expect(controller.state.announcement).toBe('Card 1 cannot be moved to TODO.')
  })

  it('searches and filters through the fetch action, debounced', async () => {
    vi.useFakeTimers()
    const fresh = board({ columns: [column('todo', [card('9')])] })
    const env = environment(vi.fn().mockResolvedValue({ board: fresh }))
    const controller = new KanbanController(board(), env)

    controller.setSearch('inv')
    controller.setSearch('invoice')
    controller.setFilters({ priority: { value: 'high' } })
    await vi.advanceTimersByTimeAsync(300)

    expect(env.runner.executeJson).toHaveBeenCalledTimes(1)
    expect(env.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'kanbanFetch' }),
      {
        token: 'tok',
        component: 'kanban',
        arguments: { kanban: { search: 'invoice', filters: { priority: { value: 'high' } } } },
      },
    )
    expect(keys(controller.state.columns)).toEqual({ todo: ['9'] })

    // A new schema after an action: fetched again with the user's search.
    controller.setBoard(board())
    await vi.advanceTimersByTimeAsync(0)
    expect(env.runner.executeJson).toHaveBeenCalledTimes(2)
  })

  it('keeps a schema that arrives during a move until the move is saved', async () => {
    let resolve: (value: unknown) => void = () => {}
    const env = environment(vi.fn().mockReturnValue(new Promise((done) => (resolve = done))))
    const controller = new KanbanController(board(), env)

    const saving = controller.moveTo('1', { column: 'done', lane: null, index: 0 })
    controller.setBoard(board({ columns: [column('todo', [])] }))

    expect(keys(controller.state.columns).done).toEqual(['1'])

    resolve({ ok: true })
    await saving

    expect(keys(controller.state.columns)).toEqual({ todo: [] })
  })

  it('collapses columns and lanes', () => {
    const controller = new KanbanController(
      board({
        columns: [column('todo', []), column('done', [], { collapsible: true, collapsed: true })],
        lanes: [{ key: 'a', label: 'A', collapsed: true }],
      }),
      environment(),
    )

    expect(controller.isCollapsed('done')).toBe(true)
    controller.toggleColumn('done')
    expect(controller.isCollapsed('done')).toBe(false)
    expect(controller.state.collapsedLanes.has('a')).toBe(true)
    controller.toggleLane('a')
    expect(controller.state.collapsedLanes.has('a')).toBe(false)
    expect(controller.lanes()).toEqual([{ key: 'a', label: 'A', collapsed: true }])
  })
})

describe('attachKanbanPointer', () => {
  function dom() {
    document.body.innerHTML = `
      <div id="root">
        <div data-slot="kanban-scroller">
          <ul data-slot="kanban-dropzone" data-column="todo">
            <li data-slot="kanban-card" data-key="1"><span>One</span><button>Menu</button></li>
            <li data-slot="kanban-card" data-key="2">Two</li>
          </ul>
          <ul data-slot="kanban-dropzone" data-column="done"></ul>
        </div>
      </div>`

    const root = document.getElementById('root')!
    const zones = root.querySelectorAll<HTMLElement>('[data-slot="kanban-dropzone"]')

    return { root, todo: zones[0]!, done: zones[1]! }
  }

  const pointer = (type: string, target: EventTarget, init: Record<string, unknown> = {}) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init })
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: init.pointerType ?? 'mouse' },
    })
    target.dispatchEvent(event)
  }

  it('drags a card to another column with the mouse and saves it', async () => {
    const { root, done } = dom()
    const env = environment()
    const controller = new KanbanController(board(), env)
    const detach = attachKanbanPointer(root, controller, { elementFromPoint: () => done })
    const first = root.querySelector('[data-key="1"] span')!

    pointer('pointerdown', first, { clientX: 10, clientY: 10 })
    pointer('pointermove', document, { clientX: 40, clientY: 40 })

    expect(document.querySelector('[data-slot="kanban-ghost"]')).not.toBeNull()
    expect(keys(controller.state.columns).done).toEqual(['1'])

    pointer('pointerup', document, { clientX: 40, clientY: 40 })
    await vi.waitFor(() => expect(env.runner.executeJson).toHaveBeenCalledTimes(1))

    expect(document.querySelector('[data-slot="kanban-ghost"]')).toBeNull()
    detach()
  })

  it('ignores presses on buttons, cancels with Escape and waits for a long press on touch', () => {
    vi.useFakeTimers()
    const { root, done } = dom()
    const controller = new KanbanController(board(), environment())
    const detach = attachKanbanPointer(root, controller, { elementFromPoint: () => done })

    pointer('pointerdown', root.querySelector('button')!, { clientX: 0, clientY: 0 })
    pointer('pointermove', document, { clientX: 50, clientY: 50 })
    expect(controller.state.picked).toBeNull()
    pointer('pointerup', document)

    pointer('pointerdown', root.querySelector('[data-key="2"]')!, { clientX: 0, clientY: 0 })
    pointer('pointermove', document, { clientX: 30, clientY: 0 })
    expect(controller.state.picked?.key).toBe('2')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(controller.state.picked).toBeNull()
    expect(keys(controller.state.columns).todo).toEqual(['1', '2'])

    // A quick swipe scrolls; a press that rests drags.
    pointer('pointerdown', root.querySelector('[data-key="2"]')!, {
      pointerType: 'touch',
      clientX: 0,
      clientY: 0,
    })
    pointer('pointermove', document, { pointerType: 'touch', clientX: 0, clientY: 30 })
    vi.advanceTimersByTime(500)
    expect(controller.state.picked).toBeNull()

    pointer('pointerdown', root.querySelector('[data-key="2"]')!, {
      pointerType: 'touch',
      clientX: 0,
      clientY: 0,
    })
    vi.advanceTimersByTime(250)
    expect(controller.state.picked?.key).toBe('2')

    detach()
    expect(controller.state.picked).toBeNull()
  })
})
