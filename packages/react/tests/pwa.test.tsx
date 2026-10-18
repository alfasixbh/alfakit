import { pwaStore, resetPwa, type PanelSchema } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { PwaManager } from '../src/components/panel/pwa'
import { UserMenu } from '../src/components/panel/user-menu'
import { Toaster } from '../src/components/ui/sonner'
import { Wrapper, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { post: vi.fn(), visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({
    alfakit: {
      ...panel,
      user: { id: 1, name: 'Ann' },
      userMenu: { items: [], logoutUrl: '/admin/logout' },
      ...overrides,
    },
  })

const openMenu = () =>
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Ann' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  })

const renderMenu = () =>
  render(
    <Wrapper>
      <UserMenu variant="topbar" />
    </Wrapper>,
  )

afterEach(() => {
  act(() => resetPwa())
  setPageProps({ alfakit: panel })
  vi.restoreAllMocks()
})

describe('pwa', () => {
  it('shows nothing without pwa()', () => {
    withPanel({})
    act(() => pwaStore.update({ installable: true }))
    renderMenu()
    openMenu()

    expect(screen.queryByRole('menuitem', { name: 'Install app' })).toBeNull()
  })

  it('offers "Install app" once the browser can install it', () => {
    withPanel({ pwa: { serviceWorker: '/admin/sw.js', scope: '/admin' } })
    renderMenu()
    openMenu()

    expect(screen.queryByRole('menuitem', { name: 'Install app' })).toBeNull()

    act(() => pwaStore.update({ installable: true }))

    expect(screen.getByRole('menuitem', { name: 'Install app' })).toHaveAttribute(
      'data-slot',
      'pwa-install',
    )
  })

  it('explains "Add to Home Screen" on iOS Safari', async () => {
    const info = vi.spyOn(toast, 'info')
    withPanel({ pwa: { serviceWorker: '/admin/sw.js', scope: '/admin' } })
    act(() => pwaStore.update({ iosHint: true }))
    renderMenu()
    openMenu()

    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Install app' }))
    })

    expect(info).toHaveBeenCalledWith(expect.stringContaining('Add to Home Screen'), {
      duration: 10000,
    })
  })

  it('turns notifications on when push is configured', () => {
    withPanel({
      pwa: {
        serviceWorker: '/admin/sw.js',
        scope: '/admin',
        push: { publicKey: 'AQID', endpoint: '/admin/_alfakit/pwa/push' },
      },
    })
    act(() => pwaStore.update({ push: 'default' }))
    renderMenu()
    openMenu()

    expect(screen.getByRole('menuitem', { name: 'Turn on notifications' })).toBeInTheDocument()

    act(() => pwaStore.update({ push: 'subscribed' }))

    expect(screen.getByRole('menuitem', { name: 'Turn off notifications' })).toBeInTheDocument()
  })

  it('offers "Reload" when a new version waits', async () => {
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
    withPanel({})

    render(
      <Wrapper>
        <PwaManager />
        <Toaster />
      </Wrapper>,
    )

    expect(screen.queryByText('A new version is available')).toBeNull()

    act(() => pwaStore.update({ updateAvailable: true }))

    expect(await screen.findByText('A new version is available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})
