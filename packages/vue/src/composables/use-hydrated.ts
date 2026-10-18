import { onMounted, ref, type Ref } from 'vue'

/**
 * False during server rendering and hydration, true once mounted. Gate browser-dependent
 * output on it, such as platform-specific shortcut hints, so server-rendered markup
 * hydrates without a mismatch.
 */
export function useHydrated(): Ref<boolean> {
  const hydrated = ref(false)

  onMounted(() => {
    hydrated.value = true
  })

  return hydrated
}
