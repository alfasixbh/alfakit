import type { StandaloneComponentSchema } from '@alfakit/core'
import { act, render, screen, within } from '@testing-library/react'
import { Toaster as AppToaster } from 'sonner'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import { showToast } from '../src/components/notifications/flash-toasts'
import { AlfakitComponent, AlfakitToaster, configureAlfakit } from '../src/standalone'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

beforeEach(() => {
  // A host application page: no `alfakit` panel prop, the payloads are plain props.
  globalThis.__alfakitPageProps = { form, posts: table, errors: {} }
  // sonner's <Toaster> reads the colour scheme; jsdom has no matchMedia.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

describe('AlfakitComponent (outside panels)', () => {
  it('renders a form from its payload without createAlfakit()', () => {
    render(<AlfakitComponent component={form} className="max-w-xl" />)

    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument()

    const email = screen.getByLabelText(/Email/) as HTMLInputElement
    expect(email.value).toBe('hi@example.com')
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    const root = document.querySelector('[data-slot="standalone"]') as HTMLElement
    expect(root).toHaveClass('max-w-xl')
    expect(root).toHaveAttribute('data-alfakit-component', form.class)
    expect(root).toHaveAttribute('dir', 'ltr')
  })

  it('renders a table with its records and search', () => {
    render(<AlfakitComponent component={table} />)

    const grid = screen.getByRole('table')
    expect(within(grid).getByText('Title')).toBeInTheDocument()
    expect(within(grid).getByText('Alpha')).toBeInTheDocument()
    expect(within(grid).getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('applies per-instance registry overrides over configureAlfakit() defaults', () => {
    configureAlfakit({
      components: { Textarea: () => <div data-testid="global-textarea" /> },
    })

    render(
      <AlfakitComponent
        component={form}
        components={{ TextInput: () => <div data-testid="custom-input" /> }}
      />,
    )

    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    expect(screen.getByTestId('global-textarea')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()

    configureAlfakit({ components: {} })
  })

  it('lets the page render the blocks itself and mounts a toaster once', () => {
    render(
      <>
        <AlfakitToaster />
        <AlfakitComponent component={form}>
          {(blocks, renderBlock) => (
            <section data-testid="custom-layout">{blocks.map(renderBlock)}</section>
          )}
        </AlfakitComponent>
      </>,
    )

    expect(within(screen.getByTestId('custom-layout')).getByLabelText(/Email/)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-sonner-toaster]').length).toBeLessThanOrEqual(1)
  })

  it("routes notifications through the layout's toaster with toaster={false}", async () => {
    render(
      <>
        <AppToaster />
        <AlfakitToaster toaster={false} />
      </>,
    )

    await act(async () => {
      showToast({ id: 'n2', title: 'Through yours', status: 'success' } as never)
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.getAllByText('Through yours')).toHaveLength(1)
    // The app's id-less toaster (sonner's default position, bottom).
    expect(
      screen
        .getByText('Through yours')
        .closest('[data-sonner-toaster]')
        ?.getAttribute('data-y-position'),
    ).toBe('bottom')
  })

  it("shows a toast once although the app's layout mounts its own toaster", async () => {
    render(
      <>
        <AppToaster />
        <AlfakitToaster />
      </>,
    )

    await act(async () => {
      showToast({ id: 'n1', title: 'Saved once', status: 'success' } as never)
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.getAllByText('Saved once')).toHaveLength(1)
    // In Alfakit's own toaster (top), not the app's id-less one (bottom).
    expect(
      screen
        .getByText('Saved once')
        .closest('[data-sonner-toaster]')
        ?.getAttribute('data-y-position'),
    ).toBe('top')
  })
})

describe('live() outside panels', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
    vi.unstubAllGlobals()
  })

  it('refreshes a live table through its own components endpoint when a record changes', async () => {
    vi.useFakeTimers()
    const listeners = new Map<string, (payload: unknown) => void>()
    ;(window as unknown as { Echo: unknown }).Echo = {
      private: (name: string) => ({
        listen: (event: string, callback: (payload: unknown) => void) =>
          listeners.set(`private-${name}|${event}`, callback),
        stopListening: () => {},
        notification: () => {},
      }),
      leave: () => {},
      socketId: () => '1.2',
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const live = {
      ...table,
      content: [
        {
          ...(table.content[0] as object),
          live: { channels: ['alfakit.admin._.App-Models-Post'], debounce: 10 },
        },
      ],
    } as unknown as StandaloneComponentSchema

    render(<AlfakitComponent component={live} />)

    act(() => {
      listeners.get('private-alfakit.admin._.App-Models-Post|.alfakit.record')?.({
        event: 'updated',
        key: 1,
        model: 'App-Models-Post',
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    vi.useRealTimers()

    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(
      urls.some(
        (url) => url.startsWith(table.endpoints.components) && url.includes('targets=table'),
      ),
    ).toBe(true)
  })
})
