import { router } from '@inertiajs/core'
import type { PanelSchema } from './schema/panel'

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whether `url` matches `pattern`, where `*` matches anything (`https://app.test/reports/*`).
 * Relative patterns and URLs are resolved against `base`.
 */
export function matchesUrlPattern(url: string, pattern: string, base?: string): boolean {
  const absolute = (value: string): string => {
    try {
      return new URL(value, base).href
    } catch {
      return value
    }
  }

  const target = absolute(url)
  const normalizedPattern = pattern.includes('*') ? pattern : absolute(pattern)
  const expression = new RegExp(`^${normalizedPattern.split('*').map(escapeRegExp).join('.*')}/?$`)

  return expression.test(target) || expression.test(target.replace(/[?#].*$/, ''))
}

/**
 * Whether navigating to `url` must load a full page: the panel has `spa(false)`, or the
 * URL matches one of `spaUrlExceptions()`.
 */
export function requiresFullPageLoad(
  url: string,
  panel: Pick<PanelSchema, 'spa' | 'spaUrlExceptions'> | null | undefined,
  base?: string,
): boolean {
  if (!panel) return false

  if (panel.spa === false) return true

  return (panel.spaUrlExceptions ?? []).some((pattern) => matchesUrlPattern(url, pattern, base))
}

/**
 * Turn Inertia visits to SPA exception URLs into full page loads. Visits that stay on the
 * same path (table paging, polling, partial reloads) are left alone. Browser only; returns
 * a function that removes the listener.
 */
export function installSpaUrlExceptions(
  getPanel: () => Pick<PanelSchema, 'spa' | 'spaUrlExceptions'> | null | undefined,
): () => void {
  if (typeof window === 'undefined') return () => {}

  return router.on('before', (event) => {
    const visit = event.detail.visit

    if (visit.method !== 'get' || visit.prefetch || visit.only.length > 0) return

    const target = visit.url

    if (target.origin === window.location.origin && target.pathname === window.location.pathname) {
      return
    }

    if (!requiresFullPageLoad(target.href, getPanel(), window.location.href)) return

    event.preventDefault()
    window.location.href = target.href
  })
}
