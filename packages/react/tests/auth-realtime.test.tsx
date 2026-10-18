import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { RealtimeNotifications } from '../src/components/notifications/realtime-notifications'
import { ImpersonationBanner } from '../src/components/panel/impersonation-banner'
import { Wrapper, panel, setPageProps } from './mocks'

type Callback = (payload: Record<string, unknown>) => void

describe('ImpersonationBanner', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it('renders nothing when not impersonating', () => {
    const { container } = render(
      <Wrapper>
        <ImpersonationBanner />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="impersonation-banner"]')).toBeNull()
  })

  it('shows who you are signed in as and posts to leave', () => {
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

    render(
      <Wrapper>
        <ImpersonationBanner />
      </Wrapper>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('You are signed in as Ada.')

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(router.post).toHaveBeenCalledWith('/admin/impersonation/leave', {}, expect.anything())
  })
})

describe('RealtimeNotifications', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
    setPageProps({ alfakit: panel })
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

    render(
      <Wrapper>
        <RealtimeNotifications />
      </Wrapper>,
    )

    expect(echo.channels).toEqual([])
  })

  it('toasts broadcast notifications and announces stored ones', () => {
    const echo = installEcho()
    const success = vi.spyOn(toast, 'success')
    const announced = vi.fn()
    window.addEventListener('alfakit:database-notifications-sent', announced)
    setPageProps({ alfakit: { ...panel, realtime: { channel: 'App.Models.User.7' } } })

    const { unmount } = render(
      <Wrapper>
        <RealtimeNotifications />
      </Wrapper>,
    )

    expect(echo.channels).toContain('App.Models.User.7')

    act(() => {
      echo.callbacks.forEach((callback) =>
        callback({
          id: 'n1',
          type: 'alfakit.notification',
          format: 'alfakit',
          title: 'Deployed',
          status: 'success',
        }),
      )
      echo.callbacks.forEach((callback) =>
        callback({ type: 'alfakit.database-notifications.sent' }),
      )
    })

    expect(success).toHaveBeenCalledWith('Deployed', expect.objectContaining({ id: 'n1' }))
    expect(announced).toHaveBeenCalledTimes(1)

    unmount()
    expect(echo.callbacks).toHaveLength(0)
    window.removeEventListener('alfakit:database-notifications-sent', announced)
  })
})
