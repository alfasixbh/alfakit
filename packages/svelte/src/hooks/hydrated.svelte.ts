import { onMount } from 'svelte'

/**
 * False during server rendering and hydration, true once mounted. Gate browser-dependent
 * output on it, such as platform-specific shortcut hints, so server-rendered markup
 * hydrates without a mismatch. Call during component initialisation.
 */
export function useHydrated(): { readonly current: boolean } {
  let hydrated = $state(false)

  onMount(() => {
    hydrated = true
  })

  return {
    get current() {
      return hydrated
    },
  }
}
