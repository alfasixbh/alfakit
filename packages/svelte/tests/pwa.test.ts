import { pwaStore, resetPwa, type PanelSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync, tick } from 'svelte'
import { toast } from 'svelte-sonner'
import PwaHarness from './PwaHarness.svelte'
import { panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { post: vi.fn(), visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

vi.mock('svelte-sonner', async (importOriginal) => {
  const original = await importOriginal<{ toast: object }>()
  const toast = Object.assign(vi.fn(), original.toast, {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  })

  return { ...original, toast }
})

const pwa = { serviceWorker: '/admin/sw.js', scope: '/admin' }

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({
    alfakit: {
      ...panel,
      user: { id: 1, name: 'Ann' },
      userMenu: { items: [], logoutUrl: '/admin/logout' },
      ...overrides,
    },
  })

const openMenu = async () => {
  await fireEvent.pointerDown(screen.getByRole('button', { name: 'Ann' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  })
  await screen.findAllByRole('menuitem')
}

afterEach(() => {
  resetPwa()
  setPageProps({ alfakit: panel })
  vi.mocked(toast).mockClear()
})

describe('pwa', () => {
  it('shows nothing without pwa()', async () => {
    withPanel({})
    pwaStore.update({ installable: true })
    render(PwaHarness, { props: { kind: 'user-menu' } })
    await openMenu()

    expect(screen.queryByRole('menuitem', { name: 'Install app' })).toBeNull()
  })

  it('offers "Install app" once the browser can install it', async () => {
    withPanel({ pwa })
    render(PwaHarness, { props: { kind: 'user-menu' } })
    await openMenu()

    expect(screen.queryByRole('menuitem', { name: 'Install app' })).toBeNull()

    pwaStore.update({ installable: true })
    flushSync()

    expect(screen.getByRole('menuitem', { name: 'Install app' })).toHaveAttribute(
      'data-slot',
      'pwa-install',
    )
  })

  it('explains "Add to Home Screen" on iOS Safari', async () => {
    withPanel({ pwa })
    pwaStore.update({ iosHint: true })
    render(PwaHarness, { props: { kind: 'user-menu' } })
    await openMenu()

    await fireEvent.click(screen.getByRole('menuitem', { name: 'Install app' }))
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Add to Home Screen'), {
      duration: 10000,
    })
  })

  it('turns notifications on when push is configured', async () => {
    withPanel({
      pwa: { ...pwa, push: { publicKey: 'AQID', endpoint: '/admin/_alfakit/pwa/push' } },
    })
    pwaStore.update({ push: 'default' })
    render(PwaHarness, { props: { kind: 'user-menu' } })
    await openMenu()

    expect(screen.getByRole('menuitem', { name: 'Turn on notifications' })).toBeInTheDocument()

    pwaStore.update({ push: 'subscribed' })
    flushSync()

    expect(screen.getByRole('menuitem', { name: 'Turn off notifications' })).toBeInTheDocument()
  })

  it('offers "Reload" when a new version waits', () => {
    withPanel({})
    render(PwaHarness, { props: { kind: 'manager' } })

    expect(toast).not.toHaveBeenCalled()

    pwaStore.update({ updateAvailable: true })
    flushSync()

    expect(toast).toHaveBeenCalledWith(
      'A new version is available',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Reload' }) }),
    )
  })
})
