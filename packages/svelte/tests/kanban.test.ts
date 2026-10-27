import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { HttpError } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.svelte'
import { actions, registry, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const board = (extra: Partial<KanbanSchema> = {}): KanbanSchema => ({
  type: 'kanban',
  key: 'kanban',
  actionComponent: 'kanban',
  movable: true,
  orderable: true,
  moveAction: 'kanbanMove',
  fetchAction: 'kanbanFetch',
  argumentsKey: 'kanban',
  searchable: true,
  cardAction: { type: 'Action', name: 'view', hasModal: true },
  createAction: { type: 'Action', name: 'create', hasModal: true },
  columns: [
    {
      key: 'todo',
      label: 'To do',
      count: 2,
      total: 2,
      creatable: true,
      cards: [
        {
          key: '1',
          title: 'Write docs',
          badges: [{ label: 'High', color: 'danger' }],
          dueDate: '2020-01-01T00:00:00+00:00',
          overdue: true,
          progress: 40,
          assignees: [{ name: 'Ada Lovelace' }],
        },
        { key: '2', title: 'Review PR' },
      ],
    },
    { key: 'doing', label: 'Doing', count: 0, total: 0, wipLimit: 2, wipStrict: true, cards: [] },
    { key: 'done', label: 'Done', count: 0, total: 0, collapsible: true, cards: [] },
  ],
  ...extra,
})

const renderWidget = (widget: unknown) =>
  render(Wrapper, { props: { component: WidgetRenderer, props: { widget } } })
const renderBoard = (schema: KanbanSchema) =>
  render(Wrapper, { props: { component: RenderComponent, props: { component: schema } } })

const card = (title: string) =>
  screen.getByText(title).closest('[data-slot="kanban-card-body"]') as HTMLElement

const titles = (column: string) =>
  Array.from(
    document.querySelectorAll(
      `[data-slot="kanban-dropzone"][data-column="${column}"] [data-slot="kanban-card"]`,
    ),
  ).map((element) => element.querySelector('[id]')?.textContent)

const announcement = () => document.querySelector('[aria-live="polite"]')

beforeEach(() => {
  setPageProps({ page: { token: 'tok' } as never })
})

// Evaluate the lazily loaded board once up front so its module cost is not counted against the
// first test's `findBy*` timeout; the widget still shows its skeleton until the loader resolves.
beforeAll(async () => {
  await import('../src/components/kanban/Kanban.svelte')
}, 60_000)

describe('kanban', () => {
  it('is registered as kanban and shows a skeleton until the board loads', async () => {
    expect(registry.has('kanban')).toBe(true)

    const { container } = renderBoard(board())

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(await screen.findByText('Write docs')).toBeInTheDocument()
  })

  it('says 1 card and 2 cards, and the limit in the singular', async () => {
    renderBoard(
      board({
        columns: [
          { key: 'one', label: 'One', count: 1, total: 1, cards: [{ key: '1', title: 'Solo' }] },
          {
            key: 'two',
            label: 'Two',
            count: 2,
            total: 2,
            cards: [
              { key: '2', title: 'A' },
              { key: '3', title: 'B' },
            ],
          },
          {
            key: 'over',
            label: 'Over',
            count: 2,
            total: 2,
            wipLimit: 1,
            cards: [
              { key: '4', title: 'C' },
              { key: '5', title: 'D' },
            ],
          },
        ],
      }),
    )

    await screen.findByText('Solo')
    expect(document.body.textContent).toContain('1 card')
    expect(document.body.textContent).not.toContain('1 cards')
    expect(document.body.textContent).toContain('2 cards')
    expect(document.body.textContent).toContain('Over the limit of 1 card')
  })

  it('renders columns and cards for a widget', async () => {
    const widget: KanbanWidgetSchema = {
      type: 'Kanban',
      key: 'tasks',
      id: 'tasks',
      component: 'kanban',
      columnSpan: { default: 'full' },
      kanban: board({ heading: 'Tasks', actionComponent: 'widget:tasks' }),
    }
    renderWidget(widget)

    const region = await screen.findByRole('region', { name: 'Tasks' })
    const lists = within(region).getAllByRole('list')

    expect(lists).toHaveLength(3)
    expect(lists[0]).toHaveAccessibleName('To do')
    expect(within(region).getByText('High')).toBeInTheDocument()
    expect(within(region).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
    expect(within(region).getByText('Assigned to Ada Lovelace')).toBeInTheDocument()
    expect(within(region).getByText('Overdue')).toBeInTheDocument()
    expect(within(region).getByText('0 of 2')).toBeInTheDocument()
    expect(card('Write docs')).toHaveAttribute('tabindex', '0')
  })

  it('picks up a card with Space, moves it with the arrows and saves the drop', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
    renderBoard(board())

    await screen.findByText('Write docs')
    await fireEvent.keyDown(card('Write docs'), { key: ' ' })
    expect(announcement()).toHaveTextContent('Write docs picked up in To do, position 1 of 2.')

    await fireEvent.keyDown(card('Write docs'), { key: 'ArrowRight' })
    expect(titles('doing')).toEqual(['Write docs'])

    await fireEvent.keyDown(card('Write docs'), { key: ' ' })
    await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))

    expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'kanbanMove' }), {
      token: 'tok',
      component: 'kanban',
      record: '1',
      arguments: { kanban: { column: 'doing', position: 'end' } },
    })
    executeJson.mockRestore()
  })

  it('returns a card the server refuses and cancels with Escape', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockRejectedValue(new HttpError(422, { errors: { kanban: ['Doing is full.'] } }))
    renderBoard(board())

    await screen.findByText('Review PR')
    await fireEvent.keyDown(card('Review PR'), { key: ' ' })
    await fireEvent.keyDown(card('Review PR'), { key: 'ArrowRight' })
    await fireEvent.keyDown(card('Review PR'), { key: 'Enter' })

    await waitFor(() => expect(titles('todo')).toEqual(['Write docs', 'Review PR']))
    expect(announcement()).toHaveTextContent('Doing is full.')

    await fireEvent.keyDown(card('Write docs'), { key: ' ' })
    await fireEvent.keyDown(card('Write docs'), { key: 'ArrowDown' })
    expect(titles('todo')).toEqual(['Review PR', 'Write docs'])
    await fireEvent.keyDown(card('Write docs'), { key: 'Escape' })
    expect(titles('todo')).toEqual(['Write docs', 'Review PR'])
    executeJson.mockRestore()
  })

  describe('dragging past a column the card may not enter (UR-02)', () => {
    const transitions = { todo: ['todo', 'doing'], doing: ['doing', 'done'], done: ['done'] }
    const zone = (column: string) =>
      document.querySelector<HTMLElement>(`[data-slot="kanban-dropzone"][data-column="${column}"]`)!
    const pointer = (type: string, target: EventTarget, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x })
      Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
      target.dispatchEvent(event)
    }
    let over: HTMLElement | null = null
    const drag = async (title: string, ...columns: string[]) => {
      pointer('pointerdown', card(title), 0)
      for (const [index, column] of columns.entries()) {
        over = zone(column)
        pointer('pointermove', document, 20 + index * 20)
        await tick()
      }
      pointer('pointerup', document, 100)
      await tick()
      // Let the swallowed release click expire before the next test clicks a card.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    beforeEach(() => {
      over = null
      document.elementFromPoint = () => over
    })

    it('returns the card to its column, says why and saves nothing', async () => {
      const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
      renderBoard(board({ transitions }))

      await screen.findByText('Write docs')
      await drag('Write docs', 'doing', 'done')

      await waitFor(() =>
        expect(announcement()).toHaveTextContent('Write docs cannot be moved to Done.'),
      )
      expect(titles('todo')).toEqual(['Write docs', 'Review PR'])
      expect(titles('doing')).toEqual([])
      expect(titles('done')).toEqual([])
      expect(document.body.textContent).toContain('2 cards')
      expect(executeJson).not.toHaveBeenCalled()
      executeJson.mockRestore()
    })

    it('saves an allowed column and keeps the card there', async () => {
      const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({
        ok: true,
        card: { key: '2', title: 'Review PR' },
        counts: { todo: 1, doing: 1 },
      })
      renderBoard(board({ transitions }))

      await screen.findByText('Review PR')
      await drag('Review PR', 'doing', 'done', 'doing')

      await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
      expect(executeJson.mock.calls[0]![1]).toMatchObject({
        record: '2',
        arguments: { kanban: { column: 'doing' } },
      })
      await waitFor(() => expect(titles('doing')).toEqual(['Review PR']))
      expect(titles('todo')).toEqual(['Write docs'])
      executeJson.mockRestore()
    })
  })

  it('opens cards, quick-creates in a column and collapses columns', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    renderBoard(board())

    await fireEvent.click(await screen.findByText('Review PR'))
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'view' }), {
      token: 'tok',
      component: 'kanban',
      record: '2',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Add a card to To do' }))
    expect(trigger).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'create' }), {
      token: 'tok',
      component: 'kanban',
      arguments: { column: 'todo' },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse Done' }))
    expect(screen.getByRole('button', { name: 'Expand Done' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    trigger.mockRestore()
  })

  it('marks the filters button with its theming hook', async () => {
    renderBoard(
      board({
        filters: {
          components: [
            { type: 'TextInput', key: 'q', name: 'q', statePath: 'q', label: 'Owner' } as never,
          ],
          state: { q: null },
        },
      }),
    )

    const button = await screen.findByRole('button', { name: /Filters/ })

    expect(button).toHaveAttribute('data-slot', 'kanban-filters')
  })

  it('searches through the fetch action', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({
      board: board({
        columns: [
          {
            key: 'todo',
            label: 'To do',
            count: 2,
            total: 1,
            cards: [{ key: '2', title: 'Review PR' }],
          },
        ],
      }),
    })
    renderBoard(board())

    await fireEvent.input(await screen.findByRole('searchbox', { name: 'Search cards' }), {
      target: { value: 'review' },
    })

    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'kanbanFetch' }), {
        token: 'tok',
        component: 'kanban',
        arguments: { kanban: { search: 'review' } },
      }),
    )
    await waitFor(() => expect(screen.queryByText('Write docs')).not.toBeInTheDocument())
    executeJson.mockRestore()
  })

  it('draws swimlanes and locks cards the user may not move', async () => {
    renderBoard(
      board({
        lanes: [
          { key: '7', label: 'Ada' },
          { key: '__none', label: 'Unassigned' },
        ],
        columns: [
          {
            key: 'todo',
            label: 'To do',
            count: 2,
            total: 2,
            cards: [
              { key: '1', title: 'Mine', lane: '7', movable: false },
              { key: '2', title: 'Nobody', lane: '__none' },
            ],
          },
        ],
      }),
    )

    expect(await screen.findByRole('list', { name: 'To do Ada' })).toBeInTheDocument()
    expect(screen.getByText('Mine').closest('[data-slot="kanban-card"]')).toHaveAttribute(
      'data-movable',
      'false',
    )

    await fireEvent.keyDown(card('Mine'), { key: ' ' })
    expect(announcement()).toHaveTextContent('Mine cannot be moved to To do.')

    await fireEvent.click(screen.getByRole('button', { name: 'Collapse row Ada' }))
    expect(screen.queryByText('Mine')).not.toBeInTheDocument()
  })
})
