import { router } from '@inertiajs/core'
import {
  effectiveErrorNotifications,
  errorNotificationOutcome,
  installErrorNotifications,
  reportRequestError,
  resolveErrorNotification,
  resolveRequestErrorNotification,
  setRequestErrorReporter,
} from '../src/error-notifications'
import { FormStore } from '../src/form'
import { HttpError } from '../src/http'
import type { ErrorNotificationsSchema } from '../src/schema/panel'

const config: ErrorNotificationsSchema = {
  default: { title: 'Error', body: null },
  '403': { hidden: true },
  '503': { disabled: true },
}

const t = (key: string, _r?: unknown, fallback?: string) => fallback ?? key

describe('hidden and disabled error notifications', () => {
  it('classifies each status', () => {
    expect(errorNotificationOutcome(403, config)).toBe('hidden')
    expect(errorNotificationOutcome(503, config)).toBe('disabled')
    expect(errorNotificationOutcome(500, config)).toBe('show')
    expect(errorNotificationOutcome(500, undefined)).toBe('none')
    expect(errorNotificationOutcome(500, false)).toBe('none')
  })

  it('shows nothing for a hidden status and the generic toast for a disabled one', () => {
    expect(resolveErrorNotification(403, config)).toBeNull()
    expect(resolveErrorNotification(503, config)).toBeNull()
    expect(resolveRequestErrorNotification(new HttpError(403, null), config, t)).toBeNull()
    expect(resolveRequestErrorNotification(new HttpError(503, null), config, t)).toMatchObject({
      id: 'alfakit-request-error-503',
      title: 'The request failed.',
    })
  })

  it('hides every status without its own entry when default is hidden', () => {
    expect(errorNotificationOutcome(500, { default: { hidden: true } })).toBe('hidden')
  })

  it('catches hidden statuses without a notification and leaves disabled ones to Inertia', () => {
    let listener: ((event: unknown) => void) | undefined
    const spy = vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      callback: (event: unknown) => void,
    ) => {
      if (name === 'httpException') listener = callback

      return () => {}
    }) as never)
    const show = vi.fn()

    installErrorNotifications(() => ({ errorNotifications: config }), show)

    const hidden = vi.fn()
    listener?.({ preventDefault: hidden, detail: { response: { status: 403 } } })
    const disabled = vi.fn()
    listener?.({ preventDefault: disabled, detail: { response: { status: 503 } } })

    expect(hidden).toHaveBeenCalled()
    expect(disabled).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('page error notifications', () => {
  const panel = { errorNotifications: { default: { title: 'Panel' } } }

  it('uses the page override, including turning them off', () => {
    expect(effectiveErrorNotifications(panel, {})).toBe(panel.errorNotifications)
    expect(effectiveErrorNotifications(panel, null)).toBe(panel.errorNotifications)
    expect(effectiveErrorNotifications(panel, { errorNotifications: false })).toBe(false)
    expect(
      effectiveErrorNotifications(panel, { errorNotifications: { default: { title: 'Page' } } }),
    ).toEqual({ default: { title: 'Page' } })
  })

  it('turned off on a page, internal requests fall back to the generic toast', () => {
    expect(resolveRequestErrorNotification(new HttpError(500, null), false, t)).toMatchObject({
      title: 'The request failed.',
    })
  })
})

describe('request error reporter', () => {
  it('receives failed form refreshes without their own onError', async () => {
    const reported = vi.fn()
    const remove = setRequestErrorReporter(reported)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 500 }))

    const store = new FormStore(
      { type: 'form', component: 'form', state: { name: '' }, components: [] } as never,
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    await store.refresh()

    expect(reported).toHaveBeenCalledWith(expect.any(HttpError))

    remove()
    reportRequestError(new Error('ignored'))
    expect(reported).toHaveBeenCalledTimes(1)
    fetchSpy.mockRestore()
    store.destroy()
  })
})
