import type {
  DashboardCustomizeSchema,
  StatsOverviewWidgetSchema,
  WidgetsBlock,
} from '@alfakit/core'
import { router as inertiaCore } from '@inertiajs/core'
import { router } from '@inertiajs/vue3'
import { h } from 'vue'
import UndoButton from '../src/components/notifications/UndoButton.vue'
import WidgetGrid from '../src/components/widgets/WidgetGrid.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

function stat(id: string, label: string): StatsOverviewWidgetSchema {
  return {
    type: 'StatsOverviewWidget',
    key: id,
    id,
    columnSpan: { default: 1 },
    stats: [{ label, value: 1 }],
  }
}

function block(): WidgetsBlock {
  const spans = [
    { value: 1, label: '1 column', columnSpan: { default: 'full' as const, lg: 1 } },
    {
      value: 2,
      label: 'Full width',
      columnSpan: { default: 'full' as const, lg: 'full' as const },
    },
  ]
  const customize: DashboardCustomizeSchema = {
    endpoint: '/_alfakit/dashboard/layout',
    token: 'ctx',
    customized: false,
    layout: [
      { id: 'a', span: null, hidden: false },
      { id: 'b', span: null, hidden: false },
    ],
    defaultLayout: [
      { id: 'a', span: null, hidden: false },
      { id: 'b', span: null, hidden: false },
    ],
    library: [
      { id: 'a', label: 'Alpha', default: true, span: 1, spans },
      { id: 'b', label: 'Beta', default: true, span: 1, spans },
      { id: 'c', label: 'Gamma', default: false, span: 1, spans },
    ],
  }

  return {
    type: 'Widgets',
    key: 'widgets',
    columns: { default: 1, lg: 2 },
    widgets: [stat('a', 'Orders'), stat('b', 'Sales')],
    customize,
  }
}

const order = () =>
  Array.from(document.querySelectorAll('[data-slot="dashboard-widget"]')).map((cell) =>
    cell.querySelector('[data-slot="dashboard-widget-controls"] span')?.textContent?.trim(),
  )

const button = (name: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (element) =>
      element.getAttribute('aria-label') === name || element.textContent?.trim() === name,
  )!

describe('customizable dashboards', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    setPageProps({ alfakit: panel })
    vi.restoreAllMocks()
  })

  it('enters edit mode, moves widgets with the keyboard (RTL-aware) and announces it', async () => {
    const wrapper = mountWithAlfakit(() => h(WidgetGrid, { block: block() }))

    expect(document.body.textContent).toContain('Orders')
    // The dashboard editor's code loads lazily.
    await vi.waitFor(() => expect(button('Edit dashboard')).toBeDefined())
    button('Edit dashboard').click()
    await flush()

    expect(order()).toEqual(['Alpha', 'Beta'])
    button('Move Alpha').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    await flush()

    expect(order()).toEqual(['Beta', 'Alpha'])
    expect(document.querySelector('[data-slot="dashboard-announcer"]')?.textContent).toContain(
      'Moved Alpha to position 2 of 2',
    )
    wrapper.unmount()

    setPageProps({
      alfakit: { ...panel, localization: { ...panel.localization, direction: 'rtl' } },
    })
    mountWithAlfakit(() => h(WidgetGrid, { block: block() }))
    // The dashboard editor's code loads lazily.
    await vi.waitFor(() => expect(button('Edit dashboard')).toBeDefined())
    button('Edit dashboard').click()
    await flush()
    button('Move Alpha').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    )
    await flush()

    expect(order()).toEqual(['Beta', 'Alpha'])
  })

  it('hides, adds and saves, then reloads the page', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          layout: [
            { id: 'b', span: null, hidden: false },
            { id: 'c', span: null, hidden: false },
            { id: 'a', span: null, hidden: true },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    mountWithAlfakit(() => h(WidgetGrid, { block: block() }))
    // The dashboard editor's code loads lazily.
    await vi.waitFor(() => expect(button('Edit dashboard')).toBeDefined())
    button('Edit dashboard').click()
    await flush()
    button('Hide Alpha').click()
    await flush()
    button('Add Gamma').click()
    await flush()

    expect(order()).toEqual(['Beta', 'Gamma'])
    expect(document.querySelector('[data-slot="dashboard-library"]')).not.toBeNull()

    button('Save').click()
    await flush()
    await flush()

    expect(router.reload).toHaveBeenCalled()
    expect(
      JSON.parse(String(fetch.mock.calls[0]![1]!.body)).layout.map(
        (entry: { id: string }) => entry.id,
      ),
    ).toEqual(['b', 'c', 'a'])
  })
})

describe('undo toasts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('counts down, undoes once, and answers Ctrl+Z outside fields', async () => {
    vi.useFakeTimers()
    const post = vi.spyOn(inertiaCore, 'post').mockImplementation(() => {})

    mountWithAlfakit(() =>
      h('div', [
        h('input', { 'aria-label': 'Search' }),
        h(UndoButton, { undo: { token: 'tok', seconds: 8, url: '/undo' }, toastId: 't1' }),
      ]),
    )
    await vi.advanceTimersByTimeAsync(0)

    const undo = document.querySelector<HTMLButtonElement>('[data-slot="undo-button"]')!
    expect(undo.getAttribute('aria-keyshortcuts')).toBe('Control+Z Meta+Z')
    expect(undo.getAttribute('aria-label')).toContain('Undo (Ctrl+Z)')
    expect(undo.textContent).toContain('8')

    await vi.advanceTimersByTimeAsync(2000)
    expect(undo.textContent).toContain('6')

    document
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(post).not.toHaveBeenCalled()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    undo.click()

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![1]).toEqual({ undo: 'tok' })
  })
})
