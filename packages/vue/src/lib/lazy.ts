import { defineAsyncComponent, defineComponent, h, onMounted, ref, type Component } from 'vue'

/**
 * A component whose code (and heavy dependencies such as Tiptap or Chart.js) loads on
 * first use. The server render and hydration show `fallback` and never start the import;
 * once loaded, later renders show the component straight away.
 */
export function lazyComponent(
  name: string,
  load: () => Promise<Component>,
  fallback: Component,
): Component {
  let loaded: Component | null = null
  const Async = defineAsyncComponent({
    loader: () =>
      load().then((component) => {
        loaded = component

        return component
      }),
    loadingComponent: fallback,
    delay: 0,
    suspensible: false,
  })

  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs }) {
      const mounted = ref(false)

      onMounted(() => (mounted.value = true))

      return () => h(loaded ?? (mounted.value ? Async : fallback), attrs)
    },
  })
}
