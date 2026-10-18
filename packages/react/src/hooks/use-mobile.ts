import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void): () => void {
  // Environments without matchMedia (some test runners) keep the desktop value.
  if (typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const media = window.matchMedia(QUERY)

  media.addEventListener('change', onChange)

  return () => media.removeEventListener('change', onChange)
}

/**
 * Whether the viewport is below the `md` breakpoint. Server rendering and hydration see
 * `false` (desktop), so the markup matches; the browser value applies right after.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
