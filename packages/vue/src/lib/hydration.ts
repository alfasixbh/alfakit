import { getCurrentInstance, onMounted, ref, type AppContext, type Ref } from 'vue'

/**
 * Whether each app has mounted (hydrated). Kept per app, not per module: loaded icon chunks
 * and lazy components outlive an app, so a second app hydrating in the same page would
 * otherwise draw content its server markup does not contain.
 */
const mountedApps = new WeakMap<AppContext, Ref<boolean>>()

/**
 * Call in a component's setup: `false` until the component's app has mounted (so during
 * the server render and hydration), then `true` for every component in that app, so
 * content rendered later draws at once (reactive). Lazily loaded parts (named icons, heavy
 * fields) render their server markup until then, whatever has loaded already.
 */
export function useAppMounted(): Ref<boolean> {
  const context = getCurrentInstance()?.appContext

  // Outside a component there is no hydration to wait for.
  if (!context) return ref(true)

  let mounted = mountedApps.get(context)

  if (!mounted) {
    mounted = ref(false)
    mountedApps.set(context, mounted)
  }

  const flag = mounted
  onMounted(() => {
    flag.value = true
  })

  return flag
}
