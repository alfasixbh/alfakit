import type { CalendarWidgetSchema, TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { Translator } from '@alfakit/core'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

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

const items = () => [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')]
const button = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) =>
      element.getAttribute('aria-label') === name || element.textContent?.trim() === name,
  )

async function settle() {
  await vi.waitFor(() => {
    if (!document.querySelector('[data-slot="calendar"], [role="treeitem"]')) {
      throw new Error('Not loaded yet')
    }
  })
  await flush()
}

afterEach(() => {
  document.body.innerHTML = ''
})

beforeEach(() => {
  calendars.length = 0
  setPageProps({ page: { token: 'tok' } as never })
})

describe('calendar widget', () => {
  it('is registered as widget:calendar and renders a skeleton on the server', async () => {
    expect(registry.has('widget:calendar')).toBe(true)

    const app = createSSRApp({ render: () => h(WidgetRenderer, { widget: calendar() }) })
    app.provide(ALFAKIT_KEY, {
      registry,
      pages: {},
      actions,
      translator: new Translator(panel.translations),
    })
    const html = await renderToString(app)

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Loading calendar')
    expect(html).not.toContain('data-rendered')
  })

  it('renders FullCalendar with the panel options, header actions and click action', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const wrapper = mountWithAlfakit(() => h(WidgetRenderer, { widget: calendar() }))
    await settle()

    expect(calendars).toHaveLength(1)
    expect(document.body.textContent).toContain('Meetings')
    expect(button('New meeting')).toBeDefined()
    expect(calendars[0]!.element.getAttribute('data-rendered')).toBe('true')
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
    wrapper.unmount()
  })

  it('reverts a refused drop and refetches on a new schema', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: false })
    const wrapper = mountWithAlfakit(() => h(WidgetRenderer, { widget: calendar() }))
    await settle()

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
      expect.objectContaining({ record: '7' }),
    )
    expect(revert).toHaveBeenCalled()

    executeJson.mockRestore()
    wrapper.unmount()
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
    const wrapper = mountWithAlfakit(() => h(WidgetRenderer, { widget }))
    await settle()

    const list = document.querySelector('[role="tree"]')!
    expect(document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe('Menu')
    expect(items().map((item) => item.getAttribute('aria-level'))).toEqual(['1', '2', '1'])
    expect(items()[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(items()[2]!.getAttribute('aria-posinset')).toBe('2')

    wrapper.unmount()

    const page = mountWithAlfakit(() => h(RenderComponent, { component: tree() as never }))
    await settle()
    expect(items()).toHaveLength(3)
    page.unmount()
  })

  it('moves with the buttons and saves the structure in one request', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: tree() as never }))
    await settle()

    button('Move Node 3 up')!.click()
    await flush()

    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      'Node 3 moved to position 1 of 2, level 1.',
    )

    button('Save order')!.click()
    await vi.waitFor(() => expect(button('Save order')).toBeUndefined())

    expect(executeJson).toHaveBeenCalledTimes(1)
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
    expect(button('Save order')).toBeUndefined()

    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('collapses, expands, navigates with the keyboard and drops inside another node', async () => {
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: tree() as never }))
    await settle()

    button('Collapse all')!.click()
    await flush()
    expect(items()).toHaveLength(2)

    items()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flush()
    expect(items()).toHaveLength(3)

    const drag = (type: string, target: HTMLElement) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.assign(event, {
        dataTransfer: { setData: vi.fn(), effectAllowed: '', dropEffect: '' },
        clientY: 0,
      })
      target.dispatchEvent(event)
    }

    drag('dragstart', items()[2]!)
    drag('dragover', items()[0]!)
    drag('drop', items()[0]!)
    await flush()

    expect(
      items().map((item) => [item.getAttribute('aria-label'), item.getAttribute('aria-level')]),
    ).toEqual([
      ['Node 1', '1'],
      ['Node 2', '2'],
      ['Node 3', '2'],
    ])

    wrapper.unmount()
  })

  it('hides the move buttons of trees the user may not rearrange', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(RenderComponent, { component: tree({ reorderable: false }) as never }),
    )
    await settle()

    expect(button('Move Node 3 up')).toBeUndefined()
    expect(items()[0]!.getAttribute('draggable')).toBe('false')

    wrapper.unmount()
  })
})
