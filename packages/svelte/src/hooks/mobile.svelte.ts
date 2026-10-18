const MOBILE_BREAKPOINT = 768

/**
 * Reactive "is the viewport narrower than md" flag. It starts `false` (desktop) so
 * server-rendered markup hydrates without a mismatch; the browser value applies on mount.
 */
export function useIsMobile(): { readonly current: boolean } {
  let isMobile = $state(false)

  $effect(() => {
    const onChange = () => {
      isMobile = window.innerWidth < MOBILE_BREAKPOINT
    }

    onChange()

    // Environments without matchMedia (some test runners) keep the mounted value.
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    media.addEventListener('change', onChange)

    return () => media.removeEventListener('change', onChange)
  })

  return {
    get current() {
      return isMobile
    },
  }
}
