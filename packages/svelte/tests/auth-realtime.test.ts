import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { toast } from 'svelte-sonner'
import RealtimeNotifications from '../src/components/notifications/RealtimeNotifications.svelte'
import ImpersonationBanner from '../src/components/panel/ImpersonationBanner.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

type Callback = (payload: Record<string, unknown>) => void

afterEach(() => {
  delete (window as unknown as { Echo?: unknown }).Echo
  setPageProps({ alfakit: panel })
  vi.restoreAllMocks()
})

describe('ImpersonationBanner', () => {
  it('renders nothing when not impersonating', () => {
    render(Wrapper, { props: { component: ImpersonationBanner } })

    expect(document.querySelector('[data-slot="impersonation-banner"]')).toBeNull()
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

    render(Wrapper, { props: { component: ImpersonationBanner } })

    expect(screen.getByRole('status')).toHaveTextContent('You are signed in as Ada.')

    await fireEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(router.post).toHaveBeenCalledWith('/admin/impersonation/leave', {}, expect.anything())
  })
})

describe('RealtimeNotifications', () => {
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

    render(Wrapper, { props: { component: RealtimeNotifications } })
    flushSync()

    expect(echo.channels).toEqual([])
  })

  it('toasts broadcast notifications and announces stored ones', () => {
    const echo = installEcho()
    const success = vi.spyOn(toast, 'success')
    const announced = vi.fn()
    window.addEventListener('alfakit:database-notifications-sent', announced)
    setPageProps({ alfakit: { ...panel, realtime: { channel: 'App.Models.User.7' } } })

    const { unmount } = render(Wrapper, { props: { component: RealtimeNotifications } })
    flushSync()

    expect(echo.channels).toContain('App.Models.User.7')

    echo.callbacks.forEach((callback) =>
      callback({
        id: 'n1',
        type: 'alfakit.notification',
        format: 'alfakit',
        title: 'Deployed',
        status: 'success',
      }),
    )
    echo.callbacks.forEach((callback) => callback({ type: 'alfakit.database-notifications.sent' }))

    expect(success).toHaveBeenCalled()
    expect(announced).toHaveBeenCalledTimes(1)

    unmount()
    expect(echo.callbacks).toHaveLength(0)
    window.removeEventListener('alfakit:database-notifications-sent', announced)
  })
})
