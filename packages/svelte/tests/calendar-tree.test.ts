import type { CalendarWidgetSchema, TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.svelte'
import { actions, registry, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const calendars: Array<{ element: HTMLElement; options: Record<string, unknown> }> = []

vi.mock('@fullcalendar/core', () => ({
  Calendar: class {
    constructor(
      public element: HTMLElement,
      public options: Record<string, unknown>,
    ) {
      calendars.push(this as never)
    }
    render() {
      this.element.setAttribute('data-rendered', 'true')
    }
    refetchEvents() {}
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

const renderWidget = (widget: unknown) =>
  render(Wrapper, { props: { component: WidgetRenderer, props: { widget } } })
const renderTree = (schema: TreeSchema) =>
  render(Wrapper, { props: { component: RenderComponent, props: { component: schema } } })

beforeEach(() => {
  calendars.length = 0
  setPageProps({ page: { token: 'tok' } as never })
})

describe('calendar widget', () => {
  it('is registered as widget:calendar and shows a skeleton until FullCalendar loads', async () => {
    expect(registry.has('widget:calendar')).toBe(true)

    const { container } = renderWidget(calendar())

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('Loading calendar')).toBeInTheDocument()

    await waitFor(() => expect(calendars).toHaveLength(1))
    expect(container.querySelector('[data-slot="calendar"]')).toHaveAttribute(
      'data-rendered',
      'true',
    )
  })

  it('passes the panel options and opens the event click action', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    renderWidget(calendar())
    await waitFor(() => expect(calendars).toHaveLength(1))

    expect(screen.getByText('Meetings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New meeting' })).toBeInTheDocument()
    expect(calendars[0]!.options).toMatchObject({
      timeZone: 'UTC',
      direction: 'ltr',
      editable: true,
      plugins: [
        { name: 'daygrid' },
        { name: 'timegrid' },
        { name: 'list' },
        { name: 'interaction' },
      ],
    })

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

  it('reverts a drop the server refuses', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: false })
    renderWidget(calendar())
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
    await (calendars[0]!.options.eventResize as (info: unknown) => Promise<void>)({
      event,
      oldEvent: event,
      revert,
    })

    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'calendarEventResize' }),
      expect.objectContaining({ record: '7' }),
    )
    expect(revert).toHaveBeenCalled()
    executeJson.mockRestore()
  })
})

describe('tree', () => {
  it('renders an accessible tree for a widget and a page component', async () => {
    const widget: TreeWidgetSchema = {
      type: 'Tree',
      key: 'menu',
      id: 'menu',
      component: 'tree',
      columnSpan: { default: 'full' },
      tree: tree({ heading: 'Menu', actionComponent: 'widget:menu' }),
    }
    renderWidget(widget)

    const list = await screen.findByRole('tree', { name: 'Menu' })
    const items = within(list).getAllByRole('treeitem')

    expect(items.map((item) => item.getAttribute('aria-level'))).toEqual(['1', '2', '1'])
    expect(items[0]).toHaveAttribute('aria-expanded', 'true')
    expect(items[2]).toHaveAttribute('aria-posinset', '2')

    renderTree(tree())
    expect(await screen.findAllByRole('tree')).toHaveLength(2)
  })

  it('moves with the buttons and saves the structure in one request', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
    renderTree(tree())

    await fireEvent.click(await screen.findByRole('button', { name: 'Move Node 3 up' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Node 3 moved to position 1 of 2, level 1.',
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Save order' }))

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

  it('collapses, expands, navigates with the keyboard and drops inside another node', async () => {
    renderTree(tree())

    await fireEvent.click(await screen.findByRole('button', { name: 'Collapse all' }))
    expect(screen.getAllByRole('treeitem')).toHaveLength(2)

    await fireEvent.keyDown(screen.getAllByRole('treeitem')[0]!, { key: 'ArrowRight' })
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)

    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' }
    const [first, , third] = screen.getAllByRole('treeitem')

    await fireEvent.dragStart(third!, { dataTransfer })
    await fireEvent.dragOver(first!, { dataTransfer, clientY: 0 })
    await fireEvent.drop(first!, { dataTransfer })

    expect(
      screen
        .getAllByRole('treeitem')
        .map((item) => [item.getAttribute('aria-label'), item.getAttribute('aria-level')]),
    ).toEqual([
      ['Node 1', '1'],
      ['Node 2', '2'],
      ['Node 3', '2'],
    ])
  })

  it('hides the move buttons of trees the user may not rearrange', async () => {
    renderTree(tree({ reorderable: false }))

    await screen.findByRole('tree')
    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')[0]).toHaveAttribute('draggable', 'false')
  })
})
