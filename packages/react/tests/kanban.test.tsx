import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { HttpError } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { PageActionProvider } from '../src/components/actions/action-context'
import { RenderComponent } from '../src/components/schema/schema-renderer'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper, actions, registry } from './mocks'

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
          description: 'For the plugin',
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

function renderWith(children: React.ReactNode) {
  return render(
    <Wrapper>
      <PageActionProvider value={{ token: 'tok', component: 'page' }}>
        {children}
      </PageActionProvider>
    </Wrapper>,
  )
}

const card = (title: string) =>
  screen.getByText(title).closest('[data-slot="kanban-card-body"]') as HTMLElement

const titles = (column: string) =>
  Array.from(
    document.querySelectorAll(
      `[data-slot="kanban-dropzone"][data-column="${column}"] [data-slot="kanban-card"]`,
    ),
  ).map((element) => element.querySelector('[id]')?.textContent)

describe('kanban', () => {
  it('is registered as kanban and renders a skeleton on the server', () => {
    expect(registry.has('kanban')).toBe(true)

    const html = renderToString(
      <Wrapper>
        <RenderComponent component={board() as never} />
      </Wrapper>,
    )

    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Write docs')
  })

  it('renders columns and cards for a page component and a widget', async () => {
    const widget: KanbanWidgetSchema = {
      type: 'Kanban',
      key: 'tasks',
      id: 'tasks',
      component: 'kanban',
      columnSpan: { default: 'full' },
      kanban: board({ heading: 'Tasks', actionComponent: 'widget:tasks' }),
    }

    renderWith(<WidgetRenderer widget={widget} />)

    const region = await screen.findByRole('region', { name: 'Tasks' })
    const lists = within(region).getAllByRole('list')

    expect(lists).toHaveLength(3)
    expect(lists[0]).toHaveAccessibleName('To do')
    expect(within(lists[0]!).getAllByRole('listitem')).toHaveLength(2)
    expect(within(region).getByText('High')).toBeInTheDocument()
    expect(within(region).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
    expect(within(region).getByText('Assigned to Ada Lovelace')).toBeInTheDocument()
    expect(within(region).getByText('Overdue')).toBeInTheDocument()
    expect(within(region).getByText('0 of 2')).toBeInTheDocument()
    expect(within(region).getAllByText('No cards')).toHaveLength(2)
    expect(region.querySelector('[data-slot="kanban-card-body"]')).toHaveAttribute('tabindex', '0')
  })

  it('says 1 card and 2 cards, and the limit in the singular', async () => {
    renderWith(
      <RenderComponent
        component={
          board({
            columns: [
              {
                key: 'one',
                label: 'One',
                count: 1,
                total: 1,
                cards: [{ key: '1', title: 'Solo' }],
              },
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
          }) as never
        }
      />,
    )

    await screen.findByText('Solo')
    expect(document.body.textContent).toContain('1 card')
    expect(document.body.textContent).not.toContain('1 cards')
    expect(document.body.textContent).toContain('2 cards')
    expect(document.body.textContent).toContain('Over the limit of 1 card')
  })

  it('picks up a card with Space, moves it with the arrows and saves the drop', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
    renderWith(<RenderComponent component={board() as never} />)

    const first = await screen.findByText('Write docs').then(() => card('Write docs'))

    fireEvent.keyDown(first, { key: ' ' })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Write docs picked up in To do, position 1 of 2.',
    )

    fireEvent.keyDown(card('Write docs'), { key: 'ArrowRight' })
    expect(titles('doing')).toEqual(['Write docs'])
    expect(screen.getByRole('status')).toHaveTextContent('Write docs is in Doing, position 1 of 1.')

    fireEvent.keyDown(card('Write docs'), { key: ' ' })

    await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'kanbanMove' }), {
      token: 'tok',
      component: 'kanban',
      record: '1',
      arguments: { kanban: { column: 'doing', position: 'end' } },
    })
    executeJson.mockRestore()
  })

  it('returns a card the server refuses to move', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockRejectedValue(new HttpError(422, { errors: { kanban: ['Doing is full.'] } }))
    renderWith(<RenderComponent component={board() as never} />)

    await screen.findByText('Review PR')
    fireEvent.keyDown(card('Review PR'), { key: ' ' })
    fireEvent.keyDown(card('Review PR'), { key: 'ArrowRight' })
    fireEvent.keyDown(card('Review PR'), { key: 'Enter' })

    await waitFor(() => expect(titles('todo')).toEqual(['Write docs', 'Review PR']))
    expect(screen.getByRole('status')).toHaveTextContent('Doing is full.')
    executeJson.mockRestore()
  })

  it('cancels a keyboard move with Escape', async () => {
    renderWith(<RenderComponent component={board() as never} />)

    await screen.findByText('Write docs')
    fireEvent.keyDown(card('Write docs'), { key: ' ' })
    fireEvent.keyDown(card('Write docs'), { key: 'ArrowDown' })
    expect(titles('todo')).toEqual(['Review PR', 'Write docs'])

    fireEvent.keyDown(card('Write docs'), { key: 'Escape' })
    expect(titles('todo')).toEqual(['Write docs', 'Review PR'])
  })

  it('opens cards, quick-creates in a column and collapses columns', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    renderWith(<RenderComponent component={board() as never} />)

    fireEvent.click(await screen.findByText('Review PR'))
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'view' }), {
      token: 'tok',
      component: 'kanban',
      record: '2',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add a card to To do' }))
    expect(trigger).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'create' }), {
      token: 'tok',
      component: 'kanban',
      arguments: { column: 'todo' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Done' }))
    expect(screen.getByRole('button', { name: 'Expand Done' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    trigger.mockRestore()
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
    renderWith(<RenderComponent component={board() as never} />)

    fireEvent.change(await screen.findByRole('searchbox', { name: 'Search cards' }), {
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
    renderWith(
      <RenderComponent
        component={
          board({
            movable: true,
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
          }) as never
        }
      />,
    )

    expect(await screen.findByRole('list', { name: 'To do Ada' })).toBeInTheDocument()
    expect(screen.getByText('Mine').closest('[data-slot="kanban-card"]')).toHaveAttribute(
      'data-movable',
      'false',
    )

    fireEvent.keyDown(card('Mine'), { key: ' ' })
    expect(screen.getByRole('status')).toHaveTextContent('Mine cannot be moved to To do.')

    fireEvent.click(screen.getByRole('button', { name: 'Collapse row Ada' }))
    expect(screen.queryByText('Mine')).not.toBeInTheDocument()
  })
})
