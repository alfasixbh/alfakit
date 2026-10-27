import { router } from '@inertiajs/core'
import { applyDocumentLocale } from './i18n'
import type { StarterKitDocumentSchema } from './schema/panel'

/**
 * `<html lang dir>` in a starter kit app. The server shares `alfakitDocument` with every
 * Inertia page while a `starterKit()` panel exists: in a right-to-left panel language the
 * whole page (the kit's sidebar, header and own pages too) is laid out right to left. The
 * kit's root view renders the same `dir` (`StarterKitDocument::direction()`), so these keep
 * it in step after visits and language switches.
 *
 * Its own small module: the host's sidebar and header call it on every page, without the
 * panel runtime.
 */

/** The shared `alfakitDocument` prop of a page, or null (pages of other panels, older servers). */
export function starterKitDocument(props: unknown): StarterKitDocumentSchema | null {
  const value = (props as { alfakitDocument?: unknown } | null | undefined)?.alfakitDocument

  if (!value || typeof value !== 'object') return null

  const { tag, direction } = value as Partial<StarterKitDocumentSchema>

  return typeof tag === 'string' && (direction === 'ltr' || direction === 'rtl')
    ? { tag, direction }
    : null
}

/** The page's reading direction in a starter kit app: `rtl` in a right-to-left panel language. */
export function starterKitDirection(props: unknown): 'ltr' | 'rtl' {
  return starterKitDocument(props)?.direction ?? 'ltr'
}

/**
 * Which side the kit's shadcn `<Sidebar>` docks on: the end of the line, so the right in a
 * right-to-left language (`side` is physical in shadcn).
 */
export function starterKitSidebarSide(props: unknown): 'left' | 'right' {
  return starterKitDirection(props) === 'rtl' ? 'right' : 'left'
}

/** Put a page's `alfakitDocument` on `<html lang dir>`; nothing without it. */
export function applyStarterKitDocument(props: unknown): void {
  const document = starterKitDocument(props)

  if (document) applyDocumentLocale(document)
}

let listening = false

/**
 * Apply `props` (the current page's) to `<html lang dir>` and, once per page load, follow
 * every later visit (a language switch is one: it redirects back). Called by the starter
 * kit's entry points (the sidebar navigation and direction hooks, the header components, the
 * dashboard widgets, AlfaKit pages), so whichever renders first starts it. No-op on the server.
 */
export function installStarterKitDocument(props: unknown): void {
  if (typeof window === 'undefined') return

  applyStarterKitDocument(props)

  if (listening) return

  listening = true
  router.on('navigate', (event) => applyStarterKitDocument(event.detail.page.props))
}
