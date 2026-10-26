import type { StandaloneComponentSchema } from '@alfakit/core'
import { render, screen, within } from '@testing-library/svelte'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import { showToast } from '../src/components/notifications/toast'
import { configureAlfakit } from '../src/standalone'
import { createStandaloneContext } from '../src/standalone/runtime'
import CustomIcon from './CustomIcon.svelte'
import DualToasterHarness from './DualToasterHarness.svelte'
import LayoutToasterHarness from './LayoutToasterHarness.svelte'
import StandaloneHarness from './StandaloneHarness.svelte'
import StandaloneInPanelHarness from './StandaloneInPanelHarness.svelte'
import StatusBadge from './StatusBadge.svelte'
import TwoFormsHarness from './TwoFormsHarness.svelte'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

const deferredTable = () => {
  const payload = structuredClone(table) as unknown as { content: Array<Record<string, unknown>> }
  payload.content[0] = { ...payload.content[0], deferLoading: true, records: undefined }

  return payload as unknown as StandaloneComponentSchema
}

beforeEach(() => {
  // A host application page: no `alfakit` panel prop, the payloads are plain props.
  globalThis.__alfakitPageProps = { form, posts: table, errors: {} }
})

describe('AlfakitComponent (outside panels)', () => {
  it("loads a deferLoading() table through the component's own prop (W-C-15)", async () => {
    const posts = deferredTable()
    globalThis.__alfakitPageProps = { posts, errors: {} }
    const { router } = await import('@inertiajs/svelte')
    vi.mocked(router.reload).mockClear()

    render(StandaloneHarness, { props: { component: posts } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.reload).toHaveBeenCalledWith({ only: ['posts'] })
  })

  it('keeps the heading beside many header actions instead of squeezing it to nothing (W-V5-03)', () => {
    const toolbar = {
      ...form,
      heading: 'Toolbar',
      headerActions: Array.from({ length: 25 }, (_, index) => ({
        type: 'Action' as const,
        name: `action${index}`,
        label: `Action ${index}`,
        hasAction: true,
      })),
    } as StandaloneComponentSchema

    render(StandaloneHarness, { props: { component: toolbar } })

    const header = document.querySelector('[data-slot="page-header"]') as HTMLElement
    const heading = screen.getByRole('heading', { name: 'Toolbar' }).parentElement as HTMLElement

    // The heading keeps its width (up to half the row); the actions wrap in the rest.
    expect(heading).toHaveClass('sm:shrink-0', 'sm:max-w-[50%]')
    expect(header.lastElementChild).not.toHaveClass('shrink-0')
    expect(header.lastElementChild).toHaveClass('min-w-0')
  })

  it('renders a form from its payload without createAlfakit()', async () => {
    render(StandaloneHarness, { props: { component: form, class: 'max-w-xl' } })

    expect(screen.getByRole('heading', { name: 'Contact us' })).toBeInTheDocument()

    const email = (await screen.findByLabelText(/Email/)) as HTMLInputElement
    expect(email.value).toBe('hi@example.com')
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    const root = document.querySelector('[data-slot="standalone"]') as HTMLElement
    expect(root).toHaveClass('max-w-xl')
    expect(root).toHaveAttribute('data-alfakit-component', form.class)
    expect(root).toHaveAttribute('dir', 'ltr')
  })

  it('renders a table with its records and search', () => {
    render(StandaloneHarness, { props: { component: table } })

    const grid = screen.getByRole('table')
    expect(within(grid).getByText('Title')).toBeInTheDocument()
    expect(within(grid).getByText('Alpha')).toBeInTheDocument()
    expect(within(grid).getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('applies per-instance registry overrides over configureAlfakit() defaults', () => {
    configureAlfakit({ components: { Textarea: StatusBadge } })

    render(StandaloneHarness, {
      props: { component: form, components: { TextInput: CustomIcon } },
    })

    // The overrides render in place of the built-in fields (any component will do here).
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Message/)).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="field"]').length).toBe(0)

    configureAlfakit({ components: {} })
  })

  it('lets the page render the blocks itself next to a layout toaster', () => {
    render(StandaloneHarness, { props: { component: form, withToaster: true, customLayout: true } })

    expect(screen.getByTestId('custom-layout')).toHaveTextContent('1 block')
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument()
  })

  it("routes notifications through the layout's toaster with toaster={false}", async () => {
    render(LayoutToasterHarness)

    showToast({ id: 'n2', title: 'Through yours', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).filter((toast) =>
      toast.textContent?.includes('Through yours'),
    )

    expect(toasts).toHaveLength(1)
    // The app's id-less toaster (sonner's default position, bottom).
    expect(toasts[0]?.closest('[data-sonner-toaster]')?.getAttribute('data-y-position')).toBe(
      'bottom',
    )
  })

  it("shows a toast once although the app's layout mounts its own toaster", async () => {
    render(DualToasterHarness)

    showToast({ id: 'n1', title: 'Saved once', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).filter((toast) =>
      toast.textContent?.includes('Saved once'),
    )

    expect(toasts).toHaveLength(1)
    // In Alfakit's own toaster (top), not the app's id-less one (bottom).
    expect(toasts[0]?.closest('[data-sonner-toaster]')?.getAttribute('data-y-position')).toBe('top')
  })
})

describe('live() outside panels', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
    vi.unstubAllGlobals()
  })

  it('refreshes a live table through its own components endpoint when a record changes', async () => {
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
    const fetchMock = vi.fn().mockImplementation(
      async () =>
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

    render(StandaloneHarness, { props: { component: live } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    listeners.get('private-alfakit.admin._.App-Models-Post|.alfakit.record')?.({
      event: 'updated',
      key: 1,
      model: 'App-Models-Post',
    })
    await new Promise((resolve) => setTimeout(resolve, 60))

    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(
      urls.some(
        (url) => url.startsWith(table.endpoints.components) && url.includes('targets=table'),
      ),
    ).toBe(true)
  })
})

describe('AlfakitComponent inside a panel page', () => {
  it("keeps its own action endpoints, without moving the panel's", () => {
    const panel = createStandaloneContext(
      {
        action: 'http://localhost/admin/_alfakit/actions',
        modal: 'http://localhost/admin/_alfakit/actions/modal',
      },
      undefined,
      () => () => {},
    )

    render(StandaloneInPanelHarness, {
      props: { component: contactForm as unknown as StandaloneComponentSchema, panel },
    })

    const endpoints = (panel.actions as unknown as { options: { endpoints: { action: string } } })
      .options.endpoints
    expect(endpoints.action).toBe('http://localhost/admin/_alfakit/actions')
  })
})

describe('Several standalone forms on one page', () => {
  it('gives two forms with the same fields their own field ids', () => {
    render(TwoFormsHarness, {
      props: { component: contactForm as unknown as StandaloneComponentSchema },
    })

    const ids = [...document.querySelectorAll('input[id], textarea[id]')].map((input) => input.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
