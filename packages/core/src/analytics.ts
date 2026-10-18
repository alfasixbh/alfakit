import type { AnalyticsBreakdownWidgetSchema } from './schema/analytics'

/**
 * The tab an analytics top list opens on: `activeTab` when it exists, else the first.
 */
export function analyticsInitialTab(widget: AnalyticsBreakdownWidgetSchema): string {
  return widget.tabs.find((tab) => tab.key === widget.activeTab)?.key ?? widget.tabs[0]?.key ?? ''
}

/**
 * The colour of a row's change: `success` up, `danger` down, null when flat or unknown.
 */
export function analyticsChangeColor(
  change: number | null | undefined,
): 'success' | 'danger' | null {
  if (change === null || change === undefined || change === 0) return null

  return change > 0 ? 'success' : 'danger'
}

/** Options of the public-site tracker (`<AlfakitAnalytics />` components). */
export interface AnalyticsTrackerOptions {
  /** The site's public key. */
  siteKey: string
  /** The collection endpoint (default `/alfakit-analytics/event`). */
  endpoint?: string
  /** Count `localhost` too (off by default, like the snippet). */
  trackLocalhost?: boolean
}

export interface AnalyticsTracker {
  /** Whether this browser may be tracked (no Do Not Track / GPC, not automated). */
  readonly enabled: boolean
  /** Record a page view of the current URL, unless its path was the last one recorded. */
  pageview(): void
  /** Record a custom event with scalar properties. */
  track(name: string, properties?: Record<string, string | number | boolean | null>): void
}

interface NavigatorPrivacy {
  doNotTrack?: string | null
  msDoNotTrack?: string | null
  globalPrivacyControl?: boolean
  webdriver?: boolean
}

/**
 * Whether the visitor's browser lets itself be counted: no `navigator.doNotTrack`, no
 * Global Privacy Control, not a WebDriver session. False on the server.
 */
export function analyticsAllowed(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const nav = navigator as Navigator & NavigatorPrivacy
  const win = window as Window & { doNotTrack?: string | null }

  return !(
    nav.doNotTrack === '1' ||
    win.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    nav.globalPrivacyControl === true ||
    nav.webdriver === true
  )
}

/**
 * A cookieless tracker for the app's public pages: it never reads or writes cookies or
 * storage and sends `{k, n, u, r, p}` to the collection endpoint with `sendBeacon` (as
 * `text/plain`, so no CORS preflight). The server hashes the visitor with a daily salt.
 */
export function createAnalyticsTracker(options: AnalyticsTrackerOptions): AnalyticsTracker {
  const endpoint = options.endpoint ?? '/alfakit-analytics/event'
  const local =
    typeof location !== 'undefined' && /^(localhost|127\.|\[::1\])/.test(location.hostname)
  const enabled =
    analyticsAllowed() && options.siteKey !== '' && (!local || !!options.trackLocalhost)
  let last: string | null = null

  const send = (name: string, properties: Record<string, unknown> | null) => {
    if (!enabled) return

    const body = JSON.stringify({
      k: options.siteKey,
      n: name,
      u: location.href,
      r: document.referrer || null,
      p: properties,
    })

    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) return

    if (typeof fetch === 'function') {
      fetch(endpoint, { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(
        () => undefined,
      )
    }
  }

  return {
    enabled,
    pageview() {
      if (!enabled || last === location.pathname) return

      last = location.pathname
      send('pageview', null)
    },
    track(name, properties) {
      send(name, properties ?? null)
    },
  }
}

let activeTracker: AnalyticsTracker | null = null

/**
 * Start tracking the public pages of an Inertia app: records the current page view and
 * returns `{pageview, stop}`; call `pageview()` after each client-side navigation (the
 * renderers' `<AlfakitAnalytics />` components do this on Inertia's `navigate` event).
 */
export function startAnalytics(options: AnalyticsTrackerOptions): {
  tracker: AnalyticsTracker
  stop: () => void
} {
  const tracker = createAnalyticsTracker(options)
  activeTracker = tracker
  tracker.pageview()

  return {
    tracker,
    stop: () => {
      if (activeTracker === tracker) activeTracker = null
    },
  }
}

/**
 * Record a custom event with the tracker started by `<AlfakitAnalytics />` (a no-op before
 * it mounts, on the server, or when the visitor opted out).
 *
 * ```ts
 * trackAnalyticsEvent('Signup', { plan: 'pro' })
 * ```
 */
export function trackAnalyticsEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  activeTracker?.track(name, properties)
}
