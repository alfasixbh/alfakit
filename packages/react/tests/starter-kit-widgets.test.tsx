import {
  resetStarterKitPanels,
  shortcuts,
  type PanelSchema,
  type StarterKitNavigationSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AlfakitNotifications, AlfakitSearch, AlfakitTenantSwitcher } from '../src/starter-kit'
import { panel, setPageProps } from './mocks'

const navigation: StarterKitNavigationSchema = {
  id: 'admin',
  url: '/admin',
  brandName: 'Admin',
  groups: [{ label: 'Blog', collapsible: true, items: [{ label: 'Posts', url: '/admin/posts' }] }],
  widgets: {
    endpoint: '/admin/_alfakit/starter-kit',
    search: { keyBindings: ['mod+k'], placeholder: 'Search' },
    notifications: { label: 'Notifications', unreadCount: 2 },
  },
}

// What `widgets.endpoint` answers: the `alfakit` prop of the panel's pages.
const loaded: PanelSchema = {
  ...panel,
  starterKit: true,
  globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search' },
  commandPalette: { commands: [{ type: 'Action', name: 'clear', label: 'Clear cache' }] },
  databaseNotifications: { unreadCount: 0 },
  localization: { tag: 'en', direction: 'ltr' } as PanelSchema['localization'],
  translations: { notifications: 'Notifications', no_results: 'No results.' },
}

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

let fetchMock: ReturnType<typeof vi.fn>

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  resetStarterKitPanels()
  // A page of the host application: no `alfakit` prop, only the shared navigation.
  setPageProps({ alfakit: undefined, page: undefined, alfakitNavigation: [navigation] })
  fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (url.startsWith('/admin/_alfakit/starter-kit')) return respond(loaded)
    if (url.startsWith('/g')) {
      return respond({
        groups: [{ label: 'Posts', results: [{ title: 'Hello world', url: '/admin/posts/1' }] }],
      })
    }
    if (url.startsWith('/n')) {
      return respond({
        notifications: [{ id: 'n1', title: 'Order shipped', readAt: null }],
        unreadCount: 2,
        hasMore: false,
        page: 1,
      })
    }

    return respond({})
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: undefined })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('starter kit header components', () => {
  it('render nothing for guests', () => {
    setPageProps({ alfakitNavigation: undefined })

    const { container } = render(
      <>
        <AlfakitSearch />
        <AlfakitNotifications />
        <AlfakitTenantSwitcher />
      </>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('opens the palette with the key bindings pressed before it loaded and visits a result', async () => {
    render(<AlfakitSearch />)

    expect(document.querySelector('[data-slot="starter-kit-search"]')).not.toBeNull()
    expect(shortcuts.has('palette.open')).toBe(true)

    fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', ctrlKey: true })

    const dialog = await screen.findByRole('dialog')
    expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything())

    // The shared navigation is listed; panel commands need an Alfakit page and are not.
    expect(within(dialog).getByText('Posts')).toBeInTheDocument()
    expect(within(dialog).queryByText('Clear cache')).toBeNull()
    // The host owns the colour scheme: no theme items.
    expect(within(dialog).queryByText('Dark theme')).toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'hello' } })
    fireEvent.click(await screen.findByText('Hello world'))

    expect(router.visit).toHaveBeenCalledWith('/admin/posts/1')
  })

  it('shows the unread count straight away and the notifications once loaded', async () => {
    render(<AlfakitNotifications />)

    const bell = screen.getByRole('button', { name: 'Notifications' })
    expect(within(bell).getByText('2')).toBeInTheDocument()

    // The loaded menu keeps the count from the shared prop.
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything()),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notifications' }).getAttribute('aria-haspopup'),
      ).toBe('dialog'),
    )
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(await screen.findByText('Order shipped')).toBeInTheDocument()
  })

  it('lists the tenants to choose from on host pages', async () => {
    setPageProps({
      alfakitNavigation: [
        {
          ...navigation,
          widgets: {
            endpoint: '/admin/_alfakit/starter-kit',
            tenancy: {
              current: null,
              tenants: [
                { id: 1, name: 'Acme', url: '/admin/1' },
                { id: 2, name: 'Globex', url: '/admin/2' },
              ],
            },
          },
        },
      ],
    })
    const tenancy = { current: null, tenants: [], registrationUrl: '/admin/new' }
    fetchMock.mockImplementation(async () => respond({ ...loaded, tenancy }))

    render(<AlfakitTenantSwitcher />)

    const trigger = await screen.findByRole('button', { name: 'Choose a tenant' })
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })

    fireEvent.click(await screen.findByText('Globex'))

    expect(router.visit).toHaveBeenCalledWith('/admin/2')
  })
})
