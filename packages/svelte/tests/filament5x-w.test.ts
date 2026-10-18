import type { PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import GlobalSearch from '../src/components/panel/GlobalSearch.svelte'
import TenantMenu from '../src/components/panel/TenantMenu.svelte'
import ChromeHarness from './ChromeHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({ alfakit: { ...panel, ...overrides } })

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  setPageProps({ alfakit: panel })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('navigation items (Filament 5.1, 5.10.2)', () => {
  it('renders Htmlable labels as markup and merges extra attributes', () => {
    const { container } = render(ChromeHarness, {
      props: {
        kind: 'nav-group',
        group: {
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
      },
    })

    const link = container.querySelector('[data-tour="inbox"]')!
    expect(link.getAttribute('href')).toBe('/inbox')
    expect(link.className).toContain('inbox-link')
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

    const { container } = render(Wrapper, {
      props: { component: TenantMenu, props: { variant: 'topbar' } },
    })

    expect(container.querySelector('strong')?.textContent).toBe('Pro')
  })
})

describe('global search (Filament 5.10)', () => {
  it('announces the result count and starts over after navigating', async () => {
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

    render(Wrapper, { props: { component: GlobalSearch } })

    const input = () => document.querySelector<HTMLInputElement>('[role="dialog"] input')

    await fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    await waitFor(() => expect(input()).not.toBeNull())
    await fireEvent.input(input()!, { target: { value: 'hel' } })

    await waitFor(() =>
      expect(document.querySelector('[role="status"][aria-live]')).toHaveTextContent(
        '1 result available.',
      ),
    )

    handlers.forEach((handler) => handler())
    await waitFor(() => expect(input()).toBeNull())

    await fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    await waitFor(() => expect(input()).not.toBeNull())
    expect(input()!.value).toBe('')
    expect(screen.queryByText('Hello')).toBeNull()
  })
})
