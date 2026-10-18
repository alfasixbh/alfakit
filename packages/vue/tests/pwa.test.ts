import { pwaStore, resetPwa, type PanelSchema } from '@alfakit/core'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import PwaManager from '../src/components/panel/PwaManager.vue'
import UserMenu from '../src/components/panel/UserMenu.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { post: vi.fn(), visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

vi.mock('vue-sonner', async (importOriginal) => {
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

async function openMenu() {
  document.body
    .querySelector('button[aria-label="Ann"]')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flush()
  await flush()
}

const menuItem = (text: string) =>
  [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
    el.textContent?.includes(text),
  )

afterEach(() => {
  resetPwa()
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
  vi.mocked(toast).mockClear()
})

describe('pwa', () => {
  it('shows nothing without pwa()', async () => {
    withPanel({})
    pwaStore.update({ installable: true })
    mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))
    await openMenu()

    expect(menuItem('Install app')).toBeUndefined()
  })

  it('offers "Install app" once the browser can install it', async () => {
    withPanel({ pwa })
    mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))
    await openMenu()

    expect(menuItem('Install app')).toBeUndefined()

    pwaStore.update({ installable: true })
    await flush()

    expect(menuItem('Install app')?.getAttribute('data-slot')).toBe('pwa-install')
  })

  it('explains "Add to Home Screen" on iOS Safari', async () => {
    withPanel({ pwa })
    pwaStore.update({ iosHint: true })
    mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))
    await openMenu()

    menuItem('Install app')?.click()
    await flush()
    await flush()

    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Add to Home Screen'), {
      duration: 10000,
    })
  })

  it('turns notifications on when push is configured', async () => {
    withPanel({
      pwa: { ...pwa, push: { publicKey: 'AQID', endpoint: '/admin/_alfakit/pwa/push' } },
    })
    pwaStore.update({ push: 'default' })
    mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))
    await openMenu()

    expect(menuItem('Turn on notifications')).toBeDefined()

    pwaStore.update({ push: 'subscribed' })
    await flush()

    expect(menuItem('Turn off notifications')).toBeDefined()
  })

  it('offers "Reload" when a new version waits', async () => {
    withPanel({})
    mountWithAlfakit(() => h(PwaManager))

    expect(toast).not.toHaveBeenCalled()

    pwaStore.update({ updateAvailable: true })
    await flush()

    expect(toast).toHaveBeenCalledWith(
      'A new version is available',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Reload' }) }),
    )
  })
})
