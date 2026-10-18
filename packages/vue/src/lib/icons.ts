import { defineAsyncComponent, ref, shallowRef, type Component } from 'vue'
import type * as IconModules from './icon-modules'

/**
 * Lazily loaded Lucide icons keyed by kebab-case name (`users`, `shopping-cart`). Each icon
 * becomes its own chunk, like `lucide-react/dynamic`, so the main bundle stays small.
 *
 * The name → chunk map (~2,000 entries, `./icon-modules`) is not part of any entry chunk
 * either: panels (`createAlfakit()`, starter kit pages) start loading it while they boot,
 * and elsewhere (a host's sidebar) it loads with the first icon. As in the other renderers,
 * named icons are drawn in the browser only: the server render and hydration show none.
 */
export type IconMap = typeof IconModules

const loadedMap = shallowRef<IconMap | null>(null)
const mounted = ref(false)
let pending: Promise<IconMap> | undefined

const cache = new Map<string, Component | null>()

function loadIconMap(): void {
  if (typeof window === 'undefined') return

  pending ??= import('./icon-modules').then(
    (module) => (loadedMap.value = module),
    (error: unknown) => {
      pending = undefined

      throw error
    },
  )
  pending.catch(() => undefined)
}

/** Start loading the icon map ahead of the first named icon (browser only). */
export function preloadIcons(): void {
  loadIconMap()
}

/** `<Icon>`s call this once mounted: from then on named icons render (after hydration). */
export function markIconsMounted(): void {
  mounted.value = true
}

/**
 * The icon map once it has loaded in the browser and the page has hydrated, else `null`
 * (reactive). Starts loading it.
 */
export function iconMap(): IconMap | null {
  if (!loadedMap.value) loadIconMap()

  return mounted.value ? loadedMap.value : null
}

/**
 * The icon component for `name`, or `null` for unknown names (and while the icon map
 * loads; the result is reactive).
 */
export function resolveIcon(name: string, map?: IconMap | null): Component | null {
  if (map === undefined) loadIconMap()

  const icons = map === undefined ? loadedMap.value : map

  if (!icons) return null

  const cached = cache.get(name)

  if (cached !== undefined) {
    return cached
  }

  const loader = icons.iconModules[icons.iconPath(name, icons.iconModules)]
  const component = loader
    ? defineAsyncComponent({
        loader: () => loader().then((module) => module.default),
        suspensible: false,
      })
    : null
  cache.set(name, component)

  return component
}

export { hasIcon } from './icon-catalog'
export { default as Icon } from './Icon.vue'
