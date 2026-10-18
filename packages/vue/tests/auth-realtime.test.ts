import { router } from '@inertiajs/vue3'
import { h, nextTick } from 'vue'
import * as toasts from '../src/components/notifications/flash-toasts'
import RealtimeNotifications from '../src/components/notifications/RealtimeNotifications.vue'
import ImpersonationBanner from '../src/components/panel/ImpersonationBanner.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

type Callback = (payload: Record<string, unknown>) => void

describe('ImpersonationBanner', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it('renders nothing when not impersonating', () => {
    const wrapper = mountWithAlfakit(() => h(ImpersonationBanner))

    expect(wrapper.find('[data-slot="impersonation-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows who you are signed in as and posts to leave', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        impersonation: {
          label: 'You are signed in as Ada.',
          leaveLabel: 'Leave',
          leaveUrl: '/admin/impersonation/leave',
        },
      },
    })

    const wrapper = mountWithAlfakit(() => h(ImpersonationBanner))
    const banner = wrapper.find('[data-slot="impersonation-banner"]')

    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('You are signed in as Ada.')

    await wrapper.find('button').trigger('click')

    expect(router.post).toHaveBeenCalledWith('/admin/impersonation/leave', {}, expect.anything())
    wrapper.unmount()
  })
})

describe('RealtimeNotifications', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
    setPageProps({ alfakit: panel })
    vi.restoreAllMocks()
  })

  function installEcho() {
    const callbacks: Callback[] = []
    const channels: string[] = []

    ;(window as unknown as { Echo: unknown }).Echo = {
      private: (channel: string) => {
        channels.push(channel)

        return {
          notification: (callback: Callback) => callbacks.push(callback),
          stopListeningForNotification: (callback: Callback) =>
            callbacks.splice(callbacks.indexOf(callback), 1),
        }
      },
    }

    return { callbacks, channels }
  }

  it('does not subscribe unless the panel opts in', () => {
    const echo = installEcho()
    const wrapper = mountWithAlfakit(() => h(RealtimeNotifications))

    expect(echo.channels).toEqual([])
    wrapper.unmount()
  })

  it('toasts broadcast notifications and announces stored ones', async () => {
    const echo = installEcho()
    const show = vi.spyOn(toasts, 'showToast').mockImplementation(() => {})
    const announced = vi.fn()
    window.addEventListener('alfakit:database-notifications-sent', announced)
    setPageProps({ alfakit: { ...panel, realtime: { channel: 'App.Models.User.7' } } })

    const wrapper = mountWithAlfakit(() => h(RealtimeNotifications))
    await nextTick()

    expect(echo.channels).toContain('App.Models.User.7')

    echo.callbacks.forEach((callback) =>
      callback({ id: 'n1', type: 'alfakit.notification', format: 'alfakit', title: 'Deployed' }),
    )
    echo.callbacks.forEach((callback) => callback({ type: 'alfakit.database-notifications.sent' }))

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', title: 'Deployed' }),
      undefined,
    )
    expect(announced).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    expect(echo.callbacks).toHaveLength(0)
    window.removeEventListener('alfakit:database-notifications-sent', announced)
  })
})
