import { onMounted, onScopeDispose, ref, type Ref } from 'vue'

const MOBILE_BREAKPOINT = 768

/**
 * Whether the viewport is below the `md` breakpoint. It starts `false` (desktop) so
 * server-rendered markup hydrates without a mismatch; the browser value applies on mount.
 */
export function useIsMobile(): Ref<boolean> {
  const isMobile = ref(false)

  onMounted(() => {
    const onChange = () => {
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
    }

    onChange()

    // Environments without matchMedia (some test runners) keep the mounted value.
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    media.addEventListener('change', onChange)

    onScopeDispose(() => media.removeEventListener('change', onChange))
  })

  return isMobile
}
