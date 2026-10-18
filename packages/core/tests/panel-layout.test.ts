import { router } from '@inertiajs/core'
import {
  installErrorNotifications,
  resolveErrorNotification,
  resolveRequestErrorNotification,
} from '../src/error-notifications'
import { HttpError } from '../src/http'
import { installSpaUrlExceptions, matchesUrlPattern, requiresFullPageLoad } from '../src/spa'
import {
  containerColumnSpanClasses,
  containerGridColumnsClasses,
  hasContainerBreakpoints,
} from '../src/utils/container-breakpoints'

describe('matchesUrlPattern', () => {
  it('matches exact URLs and ignores a trailing slash', () => {
    expect(
      matchesUrlPattern('https://app.test/admin/reports', 'https://app.test/admin/reports'),
    ).toBe(true)
    expect(
      matchesUrlPattern('https://app.test/admin/reports/', 'https://app.test/admin/reports'),
    ).toBe(true)
    expect(
      matchesUrlPattern('https://app.test/admin/reports/1', 'https://app.test/admin/reports'),
    ).toBe(false)
  })

  it('treats * as a wildcard and escapes everything else', () => {
    expect(matchesUrlPattern('https://app.test/admin/posts/create', '*/posts/create')).toBe(true)
    expect(
      matchesUrlPattern('https://app.test/admin/posts/1/edit', 'https://app.test/admin/posts/*'),
    ).toBe(true)
    expect(matchesUrlPattern('https://appXtest/admin', 'https://app.test/admin')).toBe(false)
  })

  it('resolves relative URLs against the base', () => {
    expect(
      matchesUrlPattern('/admin/live', 'https://app.test/admin/live', 'https://app.test/admin'),
    ).toBe(true)
  })

  it('matches URLs with a query string', () => {
    expect(
      matchesUrlPattern('https://app.test/admin/live?tab=2', 'https://app.test/admin/live'),
    ).toBe(true)
  })
})

describe('requiresFullPageLoad', () => {
  it('follows spa(false) and the exception list', () => {
    expect(requiresFullPageLoad('https://app.test/a', { spa: false })).toBe(true)
    expect(requiresFullPageLoad('https://app.test/a', {})).toBe(false)
    expect(requiresFullPageLoad('https://app.test/a', { spaUrlExceptions: ['*/a'] })).toBe(true)
    expect(requiresFullPageLoad('https://app.test/a', null)).toBe(false)
  })
})

describe('installSpaUrlExceptions', () => {
  it('cancels the Inertia visit and loads the page instead', () => {
    let listener: ((event: unknown) => void) | undefined
    const spy = vi.spyOn(router, 'on').mockImplementation(((
      name: string,
      callback: (event: unknown) => void,
    ) => {
      if (name === 'before') listener = callback

      return () => {}
    }) as never)

    installSpaUrlExceptions(() => ({ spaUrlExceptions: ['*/same-path'] }))

    const preventDefault = vi.fn()
    // Same path as the current location (jsdom: http://localhost:3000/ or about:blank): ignored.
    listener?.({
      preventDefault,
      detail: {
        visit: { method: 'get', prefetch: false, only: [], url: new URL(window.location.href) },
      },
    })
    expect(preventDefault).not.toHaveBeenCalled()

    // Partial reloads are never intercepted.
    listener?.({
      preventDefault,
      detail: {
        visit: {
          method: 'get',
          prefetch: false,
          only: ['table'],
          url: new URL('http://localhost/x/same-path'),
        },
      },
    })
    expect(preventDefault).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})

describe('resolveErrorNotification', () => {
  const config = {
    default: { title: 'Error', body: 'Try <again>', icon: 'circle-x' },
    '403': { title: 'Denied', body: null },
  }

  it('uses the status message, else the default', () => {
    expect(resolveErrorNotification(403, config)).toMatchObject({
      title: 'Denied',
      status: 'danger',
    })
    expect(resolveErrorNotification(500, config)).toMatchObject({
      title: 'Error',
      icon: 'circle-x',
    })
  })

  it('escapes the body because notification bodies render as HTML', () => {
    expect(resolveErrorNotification(500, config)?.body).toBe('Try &lt;again&gt;')
  })

  it('returns null when disabled and for expired pages (those reload)', () => {
    expect(resolveErrorNotification(500, undefined)).toBeNull()
    expect(resolveErrorNotification(419, config)).toBeNull()
  })

  describe('resolveRequestErrorNotification (failed internal requests)', () => {
    const t = (key: string, _r?: unknown, fallback?: string) => `${fallback ?? key}!`

    it('uses the panel text for the status when error notifications are on', () => {
      expect(resolveRequestErrorNotification(new HttpError(403, null), config, t)).toMatchObject({
        title: 'Denied',
        status: 'danger',
      })
    })

    it('falls back to a generic toast with the (escaped) server message, e.g. in debug mode', () => {
      const error = new HttpError(500, { message: 'No column <slug>' }, 'No column <slug>')

      expect(resolveRequestErrorNotification(error, null, t)).toMatchObject({
        id: 'alfakit-request-error-500',
        title: 'The request failed.!',
        body: 'No column &lt;slug&gt;',
        status: 'danger',
      })
      expect(
        resolveRequestErrorNotification(new TypeError('Failed to fetch'), config, t),
      ).toMatchObject({
        title: 'The request failed.!',
      })
      expect(
        resolveRequestErrorNotification(new TypeError('Failed to fetch'), config, t)?.body,
      ).toBeUndefined()
    })

    it('stays silent for validation errors, expired pages and aborted requests', () => {
      const aborted = new Error('aborted')
      aborted.name = 'AbortError'

      expect(
        resolveRequestErrorNotification(new HttpError(422, { errors: {} }), config, t),
      ).toBeNull()
      expect(resolveRequestErrorNotification(new HttpError(419, null), config, t)).toBeNull()
      expect(resolveRequestErrorNotification(aborted, config, t)).toBeNull()
    })
  })

  it('replaces the error modal with the notification', () => {
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

    const preventDefault = vi.fn()
    listener?.({ preventDefault, detail: { response: { status: 403 } } })

    expect(preventDefault).toHaveBeenCalled()
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Denied' }))
    spy.mockRestore()
  })
})

describe('container breakpoints', () => {
  it('detects container keys', () => {
    expect(hasContainerBreakpoints({ default: 1, '@md': 2 })).toBe(true)
    expect(hasContainerBreakpoints({ default: 1, md: 2 })).toBe(false)
    expect(hasContainerBreakpoints(undefined)).toBe(false)
  })

  it('builds container grid and span classes', () => {
    expect(containerGridColumnsClasses({ default: 1, '@md': 2, '@xl': 4 })).toBe(
      '@md:grid-cols-2 @xl:grid-cols-4',
    )
    expect(containerColumnSpanClasses({ '@lg': 'full', '@sm': 2 })).toBe(
      '@sm:col-span-2 @lg:col-span-full',
    )
    expect(containerGridColumnsClasses({ md: 3 })).toBe('')
  })
})
