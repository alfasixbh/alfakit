import { getContext, onMount } from 'svelte'

/**
 * Whether the app has mounted (hydrated), kept per app (set by `createAlfakit()` in the
 * app's context, flipped by `AlfakitRoot`), not per module: loaded icon chunks and lazy
 * components outlive an app, so another app hydrating in the same page would otherwise
 * draw content its server markup does not contain. Like the Vue renderer's
 * `useAppMounted()`.
 */
export const APP_MOUNTED = Symbol('alfakit.app-mounted')

export interface AppMounted {
  current: boolean
}

const ALWAYS: AppMounted = { current: true }

/** A new flag for one app: `false` during the server render and hydration. */
export function createAppMounted(): AppMounted {
  let mounted = $state(false)

  return {
    get current() {
      return mounted
    },
    set current(value: boolean) {
      mounted = value
    },
  }
}

/**
 * `false` until this component's app has mounted (so during the server render and
 * hydration), then `true` for every component in the app (reactive). Outside an Alfakit
 * app (standalone components, tests) there is no hydration to wait for.
 */
export function useAppMounted(): AppMounted {
  return getContext<AppMounted | undefined>(APP_MOUNTED) ?? ALWAYS
}

/** Call in the app's root component: marks the app mounted once it has hydrated. */
export function markAppMounted(): void {
  const flag = getContext<AppMounted | undefined>(APP_MOUNTED)

  onMount(() => {
    if (flag) flag.current = true
  })
}
