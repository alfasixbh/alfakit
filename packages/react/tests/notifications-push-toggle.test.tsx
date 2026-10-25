import { openDatabaseNotifications, pwaStore, resetPwa } from '@alfakit/core'
import { act, render, screen } from '@testing-library/react'
import { NotificationsMenu } from '../src/components/notifications/notifications-menu'
import { Wrapper, panel, setPageProps } from './mocks'

// W-V1-10: in a starter kit the bell's menu offers turning Web Push on.
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
  render(
    <Wrapper>
      <NotificationsMenu />
    </Wrapper>,
  )
  act(() => {
    pwaStore.update({ push: 'default' })
    openDatabaseNotifications()
  })
  await screen.findByText('You have no notifications.')
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  resetPwa()
  vi.unstubAllGlobals()
})

describe('Web Push in the notifications menu', () => {
  it('offers turning notifications on in a starter kit', async () => {
    await openMenu({ starterKit: true, pwa })

    expect(screen.getByRole('button', { name: 'Turn on notifications' })).toHaveAttribute(
      'data-slot',
      'pwa-push',
    )
  })

  it('leaves it to the user menu in an AlfaKit panel', async () => {
    await openMenu({ pwa })

    expect(document.querySelector('[data-slot="pwa-push"]')).toBeNull()
  })
})
