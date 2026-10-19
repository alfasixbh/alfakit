import { defineAsyncComponent, defineComponent, h, type Component } from 'vue'
import { useAppMounted } from './hydration'

/**
 * A component whose code (and heavy dependencies such as Tiptap or Chart.js) loads on
 * first use. The server render and hydration show `fallback` and never start the import;
 * once the app has mounted, a loaded component renders straight away.
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
      const mounted = useAppMounted()

      return () => h(mounted.value ? (loaded ?? Async) : fallback, attrs)
    },
  })
}
