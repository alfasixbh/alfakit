import type {
  DashboardCustomizeSchema,
  StatsOverviewWidgetSchema,
  WidgetsBlock,
} from '@alfakit/core'
import { router as inertiaCore } from '@inertiajs/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import AlfakitToast from '../src/components/notifications/AlfakitToast.svelte'
import WidgetGrid from '../src/components/widgets/WidgetGrid.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
    cell.getAttribute('aria-label'),
  )

describe('customizable dashboards', () => {
  afterEach(() => {
    setPageProps({ alfakit: panel })
    vi.restoreAllMocks()
  })

  it('enters edit mode, moves widgets with the keyboard and announces it', async () => {
    render(Wrapper, { props: { component: WidgetGrid, props: { block: block() } } })

    expect(screen.getByText('Orders')).toBeInTheDocument()
    // The dashboard editor's code loads lazily.
    await fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))

    expect(order()).toEqual(['Alpha', 'Beta'])
    await fireEvent.keyDown(screen.getByRole('button', { name: 'Move Alpha' }), {
      key: 'ArrowDown',
    })

    expect(order()).toEqual(['Beta', 'Alpha'])
    expect(document.querySelector('[data-slot="dashboard-announcer"]')).toHaveTextContent(
      'Moved Alpha to position 2 of 2',
    )
  })

  it('follows the reading direction for left and right arrows', async () => {
    setPageProps({
      alfakit: { ...panel, localization: { ...panel.localization, direction: 'rtl' } },
    })
    render(Wrapper, { props: { component: WidgetGrid, props: { block: block() } } })

    // The dashboard editor's code loads lazily.
    await fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))
    await fireEvent.keyDown(screen.getByRole('button', { name: 'Move Alpha' }), {
      key: 'ArrowLeft',
    })

    expect(order()).toEqual(['Beta', 'Alpha'])
  })

  it('hides, adds and saves, then reloads the page', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          layout: [
            { id: 'b', span: 2, hidden: false },
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

    render(Wrapper, { props: { component: WidgetGrid, props: { block: block() } } })

    // The dashboard editor's code loads lazily.
    await fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Hide Alpha' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Add Gamma' }))
    await fireEvent.change(screen.getByRole('combobox', { name: 'Size of Beta' }), {
      target: { value: '2' },
    })

    expect(order()).toEqual(['Beta', 'Gamma'])

    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.reload).toHaveBeenCalled())

    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({
      token: 'ctx',
      layout: [
        { id: 'b', span: 2, hidden: false },
        { id: 'c', span: null, hidden: false },
        { id: 'a', span: null, hidden: true },
      ],
    })
  })
})

describe('undo toasts', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows Undo in the toast, counts down, and undoes once (click or Ctrl+Z)', async () => {
    vi.useFakeTimers()
    const post = vi.spyOn(inertiaCore, 'post').mockImplementation(() => {})

    render(Wrapper, {
      props: {
        component: AlfakitToast,
        props: {
          notification: {
            id: 't1',
            title: 'Deleted',
            status: 'success',
            format: 'alfakit',
            undo: { token: 'tok', seconds: 8, url: '/undo' },
          },
        },
      },
    })
    await vi.advanceTimersByTimeAsync(0)

    const undo = document.querySelector<HTMLButtonElement>('[data-slot="undo-button"]')!
    expect(undo).toHaveAttribute('aria-keyshortcuts', 'Control+Z Meta+Z')
    expect(undo.getAttribute('aria-label')).toContain('Undo (Ctrl+Z)')
    expect(undo).toHaveTextContent('8')

    await vi.advanceTimersByTimeAsync(3000)
    expect(undo).toHaveTextContent('5')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
    await fireEvent.click(undo)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![1]).toEqual({ undo: 'tok' })
  })
})
