import type { CalendarWidgetSchema, TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { PageActionProvider } from '../src/components/actions/action-context'
import { RenderComponent } from '../src/components/schema/schema-renderer'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper, actions, registry } from './mocks'

const calendars: Array<{
  element: HTMLElement
  options: Record<string, unknown>
  refetches: number
}> = []

vi.mock('@fullcalendar/core', () => ({
  Calendar: class {
    refetches = 0
    constructor(
      public element: HTMLElement,
      public options: Record<string, unknown>,
    ) {
      calendars.push(this as never)
    }
    render() {
      this.element.setAttribute('data-rendered', 'true')
    }
    refetchEvents() {
      this.refetches++
    }
    destroy() {}
  },
}))
vi.mock('@fullcalendar/daygrid', () => ({ default: { name: 'daygrid' } }))
vi.mock('@fullcalendar/timegrid', () => ({ default: { name: 'timegrid' } }))
vi.mock('@fullcalendar/list', () => ({ default: { name: 'list' } }))
vi.mock('@fullcalendar/interaction', () => ({ default: { name: 'interaction' } }))

const calendar = (extra: Partial<CalendarWidgetSchema> = {}): CalendarWidgetSchema => ({
  type: 'Calendar',
  key: 'meetings',
  id: 'meetings',
  component: 'widget:calendar',
  columnSpan: { default: 'full' },
  heading: 'Meetings',
  views: ['dayGridMonth', 'timeGridWeek'],
  initialView: 'dayGridMonth',
  timezone: 'UTC',
  editable: true,
  eventClickAction: { type: 'Action', name: 'view', hasModal: true },
  headerActions: [{ type: 'Action', name: 'create', label: 'New meeting', hasModal: true }],
  ...extra,
})

const node = (key: string, children: TreeSchema['nodes'] = []) => ({
  key,
  title: `Node ${key}`,
  children,
})

const tree = (extra: Partial<TreeSchema> = {}): TreeSchema => ({
  type: 'tree',
  key: 'tree',
  actionComponent: 'tree',
  reorderable: true,
  reorderAction: 'treeReorder',
  maxDepth: 3,
  nodes: [node('1', [node('2')]), node('3')],
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

describe('calendar widget', () => {
  beforeEach(() => {
    calendars.length = 0
  })

  it('is registered as widget:calendar and renders a skeleton on the server', () => {
    expect(registry.has('widget:calendar')).toBe(true)

    const html = renderToString(
      <Wrapper>
        <WidgetRenderer widget={calendar()} />
      </Wrapper>,
    )

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Loading calendar')
    expect(html).not.toContain('data-rendered')
  })

  it('renders FullCalendar with the panel options and header actions', async () => {
    renderWith(<WidgetRenderer widget={calendar()} />)

    await waitFor(() => expect(calendars).toHaveLength(1))

    expect(screen.getByText('Meetings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New meeting' })).toBeInTheDocument()
    expect(calendars[0]!.element).toHaveAttribute('data-rendered', 'true')
    expect(calendars[0]!.options).toMatchObject({
      timeZone: 'UTC',
      direction: 'ltr',
      editable: true,
      initialView: 'dayGridMonth',
      plugins: [
        { name: 'daygrid' },
        { name: 'timegrid' },
        { name: 'list' },
        { name: 'interaction' },
      ],
    })
  })

  it('opens the event click action for the clicked event', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    renderWith(<WidgetRenderer widget={calendar()} />)
    await waitFor(() => expect(calendars).toHaveLength(1))

    ;(calendars[0]!.options.eventClick as (info: unknown) => void)({
      event: { id: '7', url: '', extendedProps: {} },
      jsEvent: { preventDefault() {} },
    })

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'view' }), {
      token: 'tok',
      component: 'widget:meetings',
      record: '7',
    })
    trigger.mockRestore()
  })

  it('reverts a drop the server refuses and refetches on a new schema', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: false })
    const { rerender } = renderWith(<WidgetRenderer widget={calendar()} />)
    await waitFor(() => expect(calendars).toHaveLength(1))

    const revert = vi.fn()
    const event = {
      id: '7',
      start: new Date('2026-10-13T09:00:00Z'),
      end: null,
      allDay: false,
      url: '',
      extendedProps: {},
    }
    await (calendars[0]!.options.eventDrop as (info: unknown) => Promise<void>)({
      event,
      oldEvent: event,
      revert,
    })

    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'calendarEventDrop' }),
      expect.objectContaining({ record: '7', component: 'widget:meetings' }),
    )
    expect(revert).toHaveBeenCalled()

    rerender(
      <Wrapper>
        <PageActionProvider value={{ token: 'tok', component: 'page' }}>
          <WidgetRenderer widget={calendar({ heading: 'Meetings' })} />
        </PageActionProvider>
      </Wrapper>,
    )

    await waitFor(() =>
      expect((calendars[0] as unknown as { refetches: number }).refetches).toBe(1),
    )
    expect(calendars).toHaveLength(1)
    executeJson.mockRestore()
  })
})

describe('tree', () => {
  it('renders an accessible tree for a page component and a widget', async () => {
    const widget: TreeWidgetSchema = {
      type: 'Tree',
      key: 'menu',
      id: 'menu',
      component: 'tree',
      columnSpan: { default: 'full' },
      tree: tree({ heading: 'Menu', actionComponent: 'widget:menu' }),
    }

    renderWith(<WidgetRenderer widget={widget} />)

    const list = await screen.findByRole('tree', { name: 'Menu' })
    const items = within(list).getAllByRole('treeitem')

    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAttribute('aria-level', '1')
    expect(items[0]).toHaveAttribute('aria-expanded', 'true')
    expect(items[1]).toHaveAttribute('aria-level', '2')
    expect(items[2]).toHaveAttribute('aria-posinset', '2')

    renderWith(<RenderComponent component={tree() as never} />)

    expect(await screen.findAllByRole('tree')).toHaveLength(2)
  })

  it('moves with the buttons and saves the structure in one request', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ ok: true, notifications: [] })
    renderWith(<RenderComponent component={tree() as never} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Move Node 3 up' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Node 3 moved to position 1 of 2, level 1.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save order' }))

    await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'treeReorder' }), {
      token: 'tok',
      component: 'tree',
      arguments: {
        tree: [
          { key: '3', parent: null },
          { key: '1', parent: null },
          { key: '2', parent: '1' },
        ],
      },
    })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save order' })).not.toBeInTheDocument(),
    )
    executeJson.mockRestore()
  })

  it('collapses, expands and navigates with the keyboard', async () => {
    renderWith(<RenderComponent component={tree() as never} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Collapse all' }))
    expect(screen.getAllByRole('treeitem')).toHaveLength(2)

    const first = screen.getAllByRole('treeitem')[0]!
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)

    fireEvent.keyDown(first, { key: 'ArrowDown', altKey: true })
    expect(screen.getAllByRole('treeitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Node 3',
      'Node 1',
      'Node 2',
    ])
  })

  it('drops a dragged node inside another', async () => {
    renderWith(<RenderComponent component={tree() as never} />)

    const [, , third] = await screen.findAllByRole('treeitem')
    const first = screen.getAllByRole('treeitem')[0]!
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' }

    fireEvent.dragStart(third!, { dataTransfer })
    fireEvent.dragOver(first, { dataTransfer, clientY: 0 })
    fireEvent.drop(first, { dataTransfer })

    const items = screen.getAllByRole('treeitem')
    expect(
      items.map((item) => [item.getAttribute('aria-label'), item.getAttribute('aria-level')]),
    ).toEqual([
      ['Node 1', '1'],
      ['Node 2', '2'],
      ['Node 3', '2'],
    ])
  })

  it('hides the move buttons of trees the user may not rearrange', async () => {
    renderWith(<RenderComponent component={tree({ reorderable: false }) as never} />)

    await screen.findByRole('tree')
    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')[0]).toHaveAttribute('draggable', 'false')
  })
})
