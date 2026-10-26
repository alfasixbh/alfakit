import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DATABASE_NOTIFICATIONS_SENT,
  announceDatabaseNotificationsSent,
  getEcho,
  onDatabaseNotificationsSent,
  overlayPlacementDirection,
  resolveToastPosition,
  subscribeToNotifications,
  type EchoLike,
} from '../src/realtime'

function fakeEcho() {
  const callbacks: Array<(payload: Record<string, unknown>) => void> = []
  const channels: string[] = []
  const stopped: unknown[] = []

  const echo: EchoLike = {
    private(channel) {
      channels.push(channel)

      return {
        notification: (callback) => callbacks.push(callback),
        stopListeningForNotification: (callback) => stopped.push(callback),
      }
    },
  }

  const emit = (payload: Record<string, unknown>) =>
    callbacks.forEach((callback) => callback(payload))

  return { echo, emit, channels, stopped }
}

describe('subscribeToNotifications', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
  })

  it('delivers alfakit toasts once and ignores other notifications', () => {
    const { echo, emit, channels } = fakeEcho()
    const onNotification = vi.fn()

    subscribeToNotifications({ channel: 'App.Models.User.1', echo, onNotification })

    emit({ id: 'n1', type: 'alfakit.notification', format: 'alfakit', title: 'Deployed' })
    emit({ id: 'n1', type: 'alfakit.notification', format: 'alfakit', title: 'Deployed' })
    emit({ id: 'x', type: 'App\\Notifications\\Invoice', amount: 3 })

    expect(channels).toEqual(['App.Models.User.1'])
    expect(onNotification).toHaveBeenCalledTimes(1)
    expect(onNotification).toHaveBeenCalledWith({ id: 'n1', format: 'alfakit', title: 'Deployed' })
  })

  it('reports stored database notifications and stops after unsubscribing', () => {
    const { echo, emit, stopped } = fakeEcho()
    const onNotification = vi.fn()
    const onDatabase = vi.fn()

    const unsubscribe = subscribeToNotifications({
      channel: 'c',
      echo,
      onNotification,
      onDatabaseNotificationsSent: onDatabase,
    })

    emit({ type: DATABASE_NOTIFICATIONS_SENT })
    unsubscribe()
    emit({ type: DATABASE_NOTIFICATIONS_SENT })
    emit({ id: 'n2', format: 'alfakit' })

    expect(onDatabase).toHaveBeenCalledTimes(1)
    expect(onNotification).not.toHaveBeenCalled()
    expect(stopped).toHaveLength(1)
  })

  it('does nothing without Echo', () => {
    expect(getEcho()).toBeNull()
    expect(subscribeToNotifications({ channel: 'c', onNotification: vi.fn() })).toBeTypeOf(
      'function',
    )
  })

  it('finds window.Echo', () => {
    const { echo } = fakeEcho()
    ;(window as unknown as { Echo?: unknown }).Echo = echo

    expect(getEcho()).toBe(echo)
  })
})

describe('database notification announcements', () => {
  it('reaches listeners until they unsubscribe', () => {
    const listener = vi.fn()
    const off = onDatabaseNotificationsSent(listener)

    announceDatabaseNotificationsSent()
    off()
    announceDatabaseNotificationsSent()

    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('resolveToastPosition', () => {
  it('maps logical positions to the reading direction', () => {
    expect(resolveToastPosition(undefined, 'ltr')).toBe('top-right')
    expect(resolveToastPosition(undefined, 'rtl')).toBe('top-left')
    expect(resolveToastPosition('bottom-start', 'ltr')).toBe('bottom-left')
    expect(resolveToastPosition('bottom-start', 'rtl')).toBe('bottom-right')
    expect(resolveToastPosition('top-center', 'rtl')).toBe('top-center')
    expect(resolveToastPosition('bottom-end', 'ltr')).toBe('bottom-right')
  })
})

describe('overlayPlacementDirection', () => {
  it('follows the panel, or the host document in starter kit mode (W-D-03)', () => {
    document.documentElement.dir = 'ltr'
    expect(overlayPlacementDirection('rtl', undefined)).toBe('rtl')
    expect(overlayPlacementDirection('rtl', true)).toBe('ltr')
    expect(resolveToastPosition('top-end', overlayPlacementDirection('rtl', true))).toBe(
      'top-right',
    )

    document.documentElement.dir = 'rtl'
    expect(overlayPlacementDirection('rtl', true)).toBe('rtl')
    document.documentElement.dir = ''
  })
})
