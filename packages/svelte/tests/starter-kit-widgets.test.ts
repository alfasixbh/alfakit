import {
  resetStarterKitPanels,
  shortcuts,
  type PanelSchema,
  type StarterKitNavigationSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import {
  AlfakitCopilot,
  AlfakitNotifications,
  AlfakitSearch,
  AlfakitTenantSwitcher,
} from '../src/starter-kit'
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
  translations: { notifications: 'Notifications' },
}

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

let fetchMock: ReturnType<typeof vi.fn>

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
  it('shows the impersonation banner once on host pages, with Leave', async () => {
    const post = vi.spyOn(router, 'post').mockImplementation(() => {})
    const impersonation = {
      label: 'Signed in as Dana',
      leaveLabel: 'Leave',
      leaveUrl: '/admin/impersonation/leave',
    }
    setPageProps({
      alfakit: undefined,
      page: undefined,
      alfakitNavigation: [{ ...navigation, widgets: { ...navigation.widgets!, impersonation } }],
    })

    render(AlfakitSearch)
    render(AlfakitNotifications)

    await waitFor(() =>
      expect(document.querySelectorAll('[data-slot="impersonation-banner"]')).toHaveLength(1),
    )
    const banner = document.querySelector<HTMLElement>('[data-slot="impersonation-banner"]')!
    expect(banner).toHaveTextContent('Signed in as Dana')
    await fireEvent.click(within(banner).getByRole('button', { name: 'Leave' }))
    expect(post).toHaveBeenCalledWith('/admin/impersonation/leave', {}, expect.anything())
  })

  it('render nothing for guests', () => {
    setPageProps({ alfakitNavigation: undefined })

    const search = render(AlfakitSearch)
    const bell = render(AlfakitNotifications)
    const tenants = render(AlfakitTenantSwitcher)

    for (const { container } of [search, bell, tenants]) {
      expect(container.querySelector('[data-slot^="starter-kit"]')).toBeNull()
    }
  })

  it('opens the palette with the key bindings pressed before it loaded and visits a result', async () => {
    render(AlfakitSearch)

    expect(document.querySelector('[data-slot="starter-kit-search"]')).not.toBeNull()
    await waitFor(() => expect(shortcuts.has('palette.open')).toBe(true))

    await fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', ctrlKey: true })

    const dialog = await screen.findByRole('dialog')
    expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything())
    // The shared navigation is listed; panel commands need an Alfakit page, theme items the panel's chrome.
    expect(within(dialog).getByText('Posts')).toBeInTheDocument()
    expect(within(dialog).queryByText('Clear cache')).toBeNull()
    expect(within(dialog).queryByText('Dark theme')).toBeNull()

    await fireEvent.input(within(dialog).getByRole('combobox'), { target: { value: 'hello' } })
    await fireEvent.click(await screen.findByText('Hello world'))

    expect(router.visit).toHaveBeenCalledWith('/admin/posts/1')
  })

  it('shows the unread count straight away and the notifications once loaded', async () => {
    render(AlfakitNotifications)

    expect(
      within(screen.getByRole('button', { name: 'Notifications' })).getByText('2'),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Notifications' })).toHaveAttribute(
        'aria-haspopup',
        'dialog',
      ),
    )
    expect(screen.getByText('2')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))

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
    fetchMock.mockImplementation(async () =>
      respond({ ...loaded, tenancy: { current: null, tenants: [] } }),
    )

    render(AlfakitTenantSwitcher)

    expect(await screen.findByRole('button', { name: 'Choose a tenant' })).toBeInTheDocument()
  })

  it('shows the team menu of a second starterKit() panel without a panel prop', async () => {
    setPageProps({
      alfakitNavigation: [
        navigation,
        {
          ...navigation,
          id: 'app',
          url: '/app',
          widgets: {
            endpoint: '/app/_alfakit/starter-kit',
            tenancy: { current: null, tenants: [{ id: 1, name: 'Acme', url: '/app/1' }] },
          },
        },
      ],
    })
    fetchMock.mockImplementation(async () =>
      respond({ ...loaded, tenancy: { current: null, tenants: [] } }),
    )

    render(AlfakitTenantSwitcher)

    expect(await screen.findByRole('button', { name: 'Choose a tenant' })).toBeInTheDocument()
  })

  it('opens the AI copilot with mod+j pressed before its code loaded', async () => {
    const copilot = {
      type: 'ai:copilot',
      key: 'ai-copilot',
      endpoints: {
        conversations: '/admin/_ai/copilot/conversations',
        conversation: '/admin/_ai/copilot/conversations/__ID__',
        send: '/admin/_ai/copilot/messages',
        confirm: '/admin/_ai/copilot/actions/__ID__/confirm',
        reject: '/admin/_ai/copilot/actions/__ID__/reject',
        delete: '/admin/_ai/copilot/conversations/__ID__',
      },
      placeholder: '__ID__',
      keyBindings: ['mod+j'],
      canUse: true,
      notice: { status: 'warning', heading: "AI isn't set up yet" },
    }
    setPageProps({
      alfakitNavigation: [
        {
          ...navigation,
          widgets: {
            ...navigation.widgets!,
            copilot: { label: 'Open AI copilot', keyBindings: ['mod+j'] },
          },
        },
      ],
    })
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith('/admin/_alfakit/starter-kit')
        ? respond({
            ...loaded,
            slots: { 'topbar.end': [{ type: 'component', component: copilot }] },
          })
        : respond({ conversations: [] }),
    )

    render(AlfakitCopilot)

    expect(document.querySelector('[data-slot="starter-kit-copilot"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Open AI copilot' })).toBeInTheDocument()
    await waitFor(() => expect(shortcuts.has('ai.copilot')).toBe(true))

    await fireEvent.keyDown(document.body, { key: 'j', code: 'KeyJ', ctrlKey: true })

    const dialog = await screen.findByRole('dialog')
    expect(fetchMock).toHaveBeenCalledWith('/admin/_alfakit/starter-kit', expect.anything())
    expect(await within(dialog).findByText("AI isn't set up yet")).toBeInTheDocument()
  })

  it('renders no copilot without the AI plugin', () => {
    const { container } = render(AlfakitCopilot)

    expect(container.querySelector('[data-slot^="starter-kit"]')).toBeNull()
  })
})
