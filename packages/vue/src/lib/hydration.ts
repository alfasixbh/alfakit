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
 *
 * A component that hydrates server markup after the app mounted (inside an async
 * component whose code arrived later, such as a lazily split built-in) waits for its own
 * mount: its server markup is the fallback too (W-V3-28).
 */
export function useAppMounted(): Ref<boolean> {
  const instance = getCurrentInstance()
  const context = instance?.appContext

  // Outside a component there is no hydration to wait for.
  if (!instance || !context) return ref(true)

  let mounted = mountedApps.get(context)

  if (!mounted) {
    mounted = ref(false)
    mountedApps.set(context, mounted)
  }

  const flag = mounted

  // Hydration hands each component its server element before setup runs.
  if (instance.vnode.el && flag.value) {
    const own = ref(false)

    onMounted(() => {
      own.value = true
    })

    return own
  }

  onMounted(() => {
    flag.value = true
  })

  return flag
}

/**
 * Start a new `useId()` scope at the current component, as Vue does at an async component
 * (its internal `markAsyncBoundary()`): ids below it are numbered from zero under a prefix
 * that counts scopes, not the ids generated before it. So
 * - AlfaKit's ids don't follow the host layout's (a starter kit's sidebar renders a sheet on
 *   phones in the browser but the desktop sidebar on the server), and
 * - a lazily split component renders the same ids whether its code was loaded before
 *   rendering (the server after its first request) or arrives during hydration (an async
 *   component, which starts a scope itself).
 */
export function startIdScope(): void {
  const instance = getCurrentInstance() as { ids?: [string, number, number] } | null
  const ids = instance?.ids

  if (!instance || !Array.isArray(ids) || ids.length !== 3) return

  instance.ids = [`${ids[0]}${ids[2]++}-`, 0, 0]
}
