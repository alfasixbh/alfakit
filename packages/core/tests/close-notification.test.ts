import { describe, expect, it, vi } from 'vitest'
import {
  CLOSE_NOTIFICATION_EVENT,
  closeNotification,
  onCloseNotification,
} from '../src/notifications'

describe('closeNotification', () => {
  it('tells listeners which notification to close', () => {
    const callback = vi.fn()
    const off = onCloseNotification(callback)

    closeNotification('greeting')

    expect(callback).toHaveBeenCalledWith('greeting')

    off()
    closeNotification('greeting')

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("also listens to Filament's close-notification event and ignores events without an id", () => {
    const callback = vi.fn()
    const off = onCloseNotification(callback)

    window.dispatchEvent(new CustomEvent('close-notification', { detail: { id: 'a' } }))
    window.dispatchEvent(new CustomEvent(CLOSE_NOTIFICATION_EVENT, { detail: {} }))
    window.dispatchEvent(new CustomEvent(CLOSE_NOTIFICATION_EVENT))
    closeNotification('')

    expect(callback.mock.calls).toEqual([['a']])

    off()
  })
})
