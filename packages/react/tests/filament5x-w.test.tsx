import type { PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppSidebar } from '../src/components/panel/app-sidebar'
import { GlobalSearch } from '../src/components/panel/global-search'
import { TenantMenu } from '../src/components/panel/tenant-menu'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { Wrapper, panel, setPageProps } from './mocks'

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({ alfakit: { ...panel, ...overrides } })

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('navigation items (Filament 5.1, 5.10.2)', () => {
  it('renders Htmlable labels as markup and merges extra attributes', () => {
    withPanel({
      navigation: [
        {
          collapsible: false,
          items: [
            {
              label: 'Inbox <b>new</b>',
              labelHtml: true,
              url: '/inbox',
              extraAttributes: { class: 'inbox-link', 'data-tour': 'inbox' },
            },
            { label: '<i>Plain</i>', url: '/plain' },
          ],
        },
      ],
    })

    const { container } = render(
      <Wrapper>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </Wrapper>,
    )

    const link = container.querySelector('[data-tour="inbox"]')!
    expect(link.getAttribute('href')).toBe('/inbox')
    expect(link.className).toContain('inbox-link')
    expect(link.getAttribute('data-sidebar')).toBe('menu-button')
    expect(link.querySelector('b')?.textContent).toBe('new')
    expect(screen.getByText('<i>Plain</i>')).toBeInTheDocument()
  })

  it('renders Htmlable tenant names as markup', () => {
    withPanel({
      tenancy: {
        current: { id: 1, name: 'Acme <strong>Pro</strong>', nameHtml: true, url: '/acme' },
        tenants: [],
      },
    })

    const { container } = render(
      <Wrapper>
        <TenantMenu variant="topbar" />
      </Wrapper>,
    )

    expect(container.querySelector('strong')?.textContent).toBe('Pro')
  })
})

describe('global search (Filament 5.10)', () => {
  const respond = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  it('announces the result count and starts over after closing or navigating', async () => {
    const handlers: Array<() => void> = []
    vi.spyOn(router, 'on').mockImplementation(((name: string, handler: () => void) => {
      if (name === 'navigate') handlers.push(handler)

      return () => {}
    }) as typeof router.on)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async () =>
          respond({ groups: [{ label: 'Posts', results: [{ title: 'Hello', url: '/posts/1' }] }] }),
        ),
    )
    withPanel({ globalSearch: { keyBindings: [], placeholder: 'Search', debounce: 0 } })

    render(
      <Wrapper>
        <GlobalSearch />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    // The palette's code loads on first open.
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'hel' } })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 result available.'))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(screen.queryByText('Hello')).toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'hel' } })
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument())

    act(() => handlers.forEach((handler) => handler()))

    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('announces when there are no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => respond({ groups: [] })),
    )
    withPanel({ globalSearch: { keyBindings: [], placeholder: 'Search', debounce: 0 } })

    render(
      <Wrapper>
        <GlobalSearch />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    // The palette's code loads on first open.
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'zzz' } })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results.'))
  })
})
