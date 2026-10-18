import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { HttpError, Translator } from '@alfakit/core'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

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

const card = (title: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="kanban-card-body"]')].find((element) =>
    element.textContent?.includes(title),
  )!

const titles = (column: string) =>
  [
    ...document.querySelectorAll(
      `[data-slot="kanban-dropzone"][data-column="${column}"] [data-slot="kanban-card"]`,
    ),
  ].map((element) => element.querySelector('[id]')?.textContent)

const button = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) =>
      element.getAttribute('aria-label') === name || element.textContent?.trim() === name,
  )

const status = () => document.querySelector('[aria-live="polite"]')?.textContent

const key = async (element: HTMLElement, name: string) => {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  )
  await flush()
}

async function settle() {
  await vi.waitFor(() => {
    if (!document.querySelector('[data-slot="kanban-card-body"], [data-slot="kanban-empty"]')) {
      throw new Error('Not loaded yet')
    }
  })
  await flush()
}

afterEach(() => {
  document.body.innerHTML = ''
})

beforeEach(() => {
  setPageProps({ page: { token: 'tok' } as never })
})

describe('kanban', () => {
  it('is registered as kanban and renders a skeleton on the server', async () => {
    expect(registry.has('kanban')).toBe(true)

    const app = createSSRApp({ render: () => h(RenderComponent, { component: board() as never }) })
    app.provide(ALFAKIT_KEY, {
      registry,
      pages: {},
      actions,
      translator: new Translator(panel.translations),
    })
    const html = await renderToString(app)

    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Write docs')
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
    const wrapper = mountWithAlfakit(() => h(WidgetRenderer, { widget }))
    await settle()

    const region = document.querySelector('[role="region"]')!
    const lists = [...region.querySelectorAll('[role="list"]')]

    expect(document.getElementById(region.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Tasks',
    )
    expect(lists).toHaveLength(3)
    expect(document.getElementById(lists[0]!.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'To do',
    )
    expect(region.textContent).toContain('High')
    expect(region.textContent).toContain('Assigned to Ada Lovelace')
    expect(region.textContent).toContain('Overdue')
    expect(region.textContent).toContain('0 of 2')
    expect(region.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40')
    expect(card('Write docs').getAttribute('tabindex')).toBe('0')
    wrapper.unmount()
  })

  it('picks up a card with Space, moves it with the arrows and saves the drop', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({ ok: true })
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: board() as never }))
    await settle()

    await key(card('Write docs'), ' ')
    expect(status()).toBe('Write docs picked up in To do, position 1 of 2.')

    await key(card('Write docs'), 'ArrowRight')
    expect(titles('doing')).toEqual(['Write docs'])

    await key(card('Write docs'), ' ')
    await vi.waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))

    expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'kanbanMove' }), {
      token: 'tok',
      component: 'kanban',
      record: '1',
      arguments: { kanban: { column: 'doing', position: 'end' } },
    })
    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('returns a card the server refuses and cancels with Escape', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockRejectedValue(new HttpError(422, { errors: { kanban: ['Doing is full.'] } }))
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: board() as never }))
    await settle()

    await key(card('Review PR'), ' ')
    await key(card('Review PR'), 'ArrowRight')
    await key(card('Review PR'), 'Enter')

    await vi.waitFor(() => expect(titles('todo')).toEqual(['Write docs', 'Review PR']))
    expect(status()).toBe('Doing is full.')

    await key(card('Write docs'), ' ')
    await key(card('Write docs'), 'ArrowDown')
    expect(titles('todo')).toEqual(['Review PR', 'Write docs'])
    await key(card('Write docs'), 'Escape')
    expect(titles('todo')).toEqual(['Write docs', 'Review PR'])
    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('opens cards, quick-creates in a column and collapses columns', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: board() as never }))
    await settle()

    card('Review PR').click()
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'view' }), {
      token: 'tok',
      component: 'kanban',
      record: '2',
    })

    button('Add a card to To do')!.click()
    expect(trigger).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'create' }), {
      token: 'tok',
      component: 'kanban',
      arguments: { column: 'todo' },
    })

    button('Collapse Done')!.click()
    await flush()
    expect(button('Expand Done')?.getAttribute('aria-expanded')).toBe('false')
    trigger.mockRestore()
    wrapper.unmount()
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
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: board() as never }))
    await settle()

    const input = document.querySelector<HTMLInputElement>('input[type="search"]')!
    input.value = 'review'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'kanbanFetch' }), {
        token: 'tok',
        component: 'kanban',
        arguments: { kanban: { search: 'review' } },
      }),
    )
    await vi.waitFor(() => expect(document.body.textContent).not.toContain('Write docs'))
    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('draws swimlanes and locks cards the user may not move', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(RenderComponent, {
        component: board({
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
        }) as never,
      }),
    )
    await settle()

    const zone = document.querySelector('[data-slot="kanban-dropzone"][data-lane="7"]')!
    const label = zone
      .getAttribute('aria-labelledby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)

    expect(label).toEqual(['To do', 'Ada'])
    expect(card('Mine').closest('[data-slot="kanban-card"]')?.getAttribute('data-movable')).toBe(
      'false',
    )

    await key(card('Mine'), ' ')
    expect(status()).toBe('Mine cannot be moved to To do.')

    button('Collapse row Ada')!.click()
    await flush()
    expect(card('Mine')).toBeUndefined()
    expect(card('Nobody')).toBeDefined()
    wrapper.unmount()
  })
})
