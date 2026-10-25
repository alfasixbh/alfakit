import { openDatabaseNotifications, pwaStore, resetPwa } from '@alfakit/core'
import { h } from 'vue'
import NotificationsMenu from '../src/components/notifications/NotificationsMenu.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

/*
 * W-V1-10: in a starter kit the app's user menu has no AlfaKit entries, so the bell's menu
 * offers turning Web Push on for `pwa(push: true)` panels.
 */
const pwa = { serviceWorker: '/admin/sw.js', scope: '/admin', push: { publicKey: 'k' } }

async function openMenu(alfakit: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ notifications: [], unreadCount: 0, hasMore: false, page: 1 }),
        ),
    ),
  )
  setPageProps({
    alfakit: { ...panel, databaseNotifications: { unreadCount: 0 }, ...alfakit } as never,
  })
  const wrapper = mountWithAlfakit(() => h(NotificationsMenu))
  await flush()
  pwaStore.update({ push: 'default' })
  openDatabaseNotifications()
  await flush()
  await new Promise((resolve) => setTimeout(resolve, 20))

  return wrapper
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  resetPwa()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('Web Push in the notifications menu', () => {
  it('offers turning notifications on in a starter kit', async () => {
    const wrapper = await openMenu({ starterKit: true, pwa })

    expect(document.body.querySelector('[data-slot="pwa-push"]')?.getAttribute('aria-label')).toBe(
      'Turn on notifications',
    )
    wrapper.unmount()
  })

  it('leaves it to the user menu in an AlfaKit panel', async () => {
    const wrapper = await openMenu({ pwa })

    expect(document.body.querySelector('[data-slot="pwa-push"]')).toBeNull()
    wrapper.unmount()
  })
})
