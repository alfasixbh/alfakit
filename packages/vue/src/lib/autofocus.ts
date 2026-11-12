import { onMounted, useAttrs, type Ref } from 'vue'

/**
 * Focus `element` when it mounts with an `autofocus` attribute. Browsers honour the bare
 * attribute only for the first document load, not for a page Inertia swaps in. Focus the
 * user (or a modal) already placed elsewhere is left alone.
 */
export function useAutofocus(element: Ref<HTMLElement | null>): void {
  const attrs = useAttrs()

  onMounted(() => {
    const autofocus = attrs.autofocus

    if (autofocus === undefined || autofocus === null || autofocus === false) return

    if (document.activeElement && document.activeElement !== document.body) return

    element.value?.focus()
  })
}
