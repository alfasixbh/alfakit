import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False during server rendering and hydration, true afterwards (and on a client-only
 * render). Gate browser-dependent output on it, such as platform-specific shortcut hints,
 * so server-rendered markup hydrates without a mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
