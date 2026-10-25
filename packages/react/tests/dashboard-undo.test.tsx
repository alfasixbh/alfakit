import type {
  DashboardCustomizeSchema,
  StatsOverviewWidgetSchema,
  WidgetsBlock,
} from '@alfakit/core'
import { router as inertiaCore } from '@inertiajs/core'
import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UndoButton } from '../src/components/notifications/undo-button'
import { WidgetGrid } from '../src/components/widgets/widgets-block'
import { panel, setPageProps, Wrapper } from './mocks'

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
  Array.from(document.querySelectorAll('[data-slot="dashboard-widget"]')).map(
    (cell) => cell.querySelector('[data-slot="dashboard-widget-controls"] span')?.textContent,
  )

describe('customizable dashboards', () => {
  afterEach(() => {
    setPageProps({ alfakit: panel })
    vi.restoreAllMocks()
  })

  it('enters edit mode, moves widgets with the keyboard and announces it', async () => {
    render(
      <Wrapper>
        <WidgetGrid block={block()} />
      </Wrapper>,
    )

    expect(screen.getByText('Orders')).toBeInTheDocument()
    // The dashboard editor's code loads lazily.
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))

    expect(order()).toEqual(['Alpha', 'Beta'])
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move Alpha' }), { key: 'ArrowDown' })

    expect(order()).toEqual(['Beta', 'Alpha'])
    expect(document.querySelector('[data-slot="dashboard-announcer"]')).toHaveTextContent(
      'Moved Alpha to position 2 of 2',
    )
  })

  it('follows the reading direction for left and right arrows', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...(panel.localization ?? {}), direction: 'rtl' },
      } as typeof panel,
    })
    render(
      <Wrapper>
        <WidgetGrid block={block()} />
      </Wrapper>,
    )

    // The dashboard editor's code loads lazily.
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move Alpha' }), { key: 'ArrowLeft' })

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

    render(
      <Wrapper>
        <WidgetGrid block={block()} />
      </Wrapper>,
    )

    // The dashboard editor's code loads lazily.
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dashboard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide Alpha' }))

    const library = screen.getByRole('region', { name: 'Widget library' })
    fireEvent.click(within(library).getByRole('button', { name: 'Add Gamma' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Size of Beta' }), {
      target: { value: '2' },
    })

    expect(order()).toEqual(['Beta', 'Gamma'])
    expect(screen.getByText('Gamma appears once you save.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(router.reload).toHaveBeenCalled())

    const body = JSON.parse(String(fetch.mock.calls[0]![1]!.body))
    expect(body).toEqual({
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
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('counts down, undoes once on click and is keyboard reachable', () => {
    const post = vi.spyOn(inertiaCore, 'post').mockImplementation((_url, _data, options) => {
      options?.onFinish?.({} as never)
    })

    render(
      <Wrapper>
        <UndoButton undo={{ token: 'tok', seconds: 8, url: '/undo' }} toastId="t1" />
      </Wrapper>,
    )

    const button = screen.getByRole('button', { name: /Undo \(Ctrl\+Z\)/ })
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+Z Meta+Z')
    expect(button).toHaveAttribute('data-slot', 'undo-button')
    expect(button).toHaveTextContent('8')

    act(() => vi.advanceTimersByTime(2000))
    expect(button).toHaveTextContent('6')

    fireEvent.click(button)
    fireEvent.click(button)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![1]).toEqual({ undo: 'tok' })
  })

  it('undoes with Ctrl+Z outside text fields', () => {
    const post = vi.spyOn(inertiaCore, 'post').mockImplementation(() => {})

    render(
      <Wrapper>
        <input aria-label="Search" />
        {/* Undo tokens are single-use: a used one is never offered again (W-V1-15). */}
        <UndoButton undo={{ token: 'tok2', seconds: 8, url: '/undo' }} toastId="t2" />
      </Wrapper>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search' }), { key: 'z', ctrlKey: true })
    expect(post).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(post).toHaveBeenCalledTimes(1)
  })
})
