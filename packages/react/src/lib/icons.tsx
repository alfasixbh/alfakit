import { iconAlias, iconAliasOverride, iconSource, isIconAlias } from '@alfakit/core'
import type { LucideProps } from 'lucide-react'
import type { DynamicIcon, IconName as LucideIconName } from 'lucide-react/dynamic.mjs'
import {
  createElement,
  useEffect,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useOptionalRegistry } from '../context'
import { useHydrated } from '../hooks/use-hydrated'
import { cn } from './utils'

type DynamicIconComponent = typeof DynamicIcon
type LucideGlyph = ComponentType<LucideProps>
type IconImports = Record<string, () => Promise<{ default: LucideGlyph }>>

/**
 * `lucide-react/dynamic` carries a lazy import for every Lucide icon (~2,000 entries), so it
 * is not part of any entry chunk: panels (`createAlfakit()`, starter kit pages) start loading
 * it while they boot, since every page draws named icons, and elsewhere (a host's sidebar)
 * it loads with the first icon.
 */
let pendingImports: Promise<IconImports> | undefined

function loadIconImports(): Promise<IconImports> {
  pendingImports ??= import('lucide-react/dynamic.mjs').then(
    (module) => module.dynamicIconImports as unknown as IconImports,
    (error: unknown) => {
      pendingImports = undefined

      throw error
    },
  )

  return pendingImports
}

/**
 * Loaded icons by name (`null`: not a Lucide icon), shared by every `<Icon>`: an icon that
 * loaded once draws synchronously in every later mount (the page after a visit, new table
 * rows), instead of rendering empty for a frame on each mount as `DynamicIcon` does.
 */
const loadedIcons = new Map<string, LucideGlyph | null>()
const pendingIcons = new Map<string, Promise<LucideGlyph | null>>()

function loadIcon(name: string): Promise<LucideGlyph | null> {
  const loaded = loadedIcons.get(name)

  if (loaded !== undefined) return Promise.resolve(loaded)

  let pending = pendingIcons.get(name)

  if (!pending) {
    pending = loadIconImports()
      .then((imports) => {
        const load = Object.prototype.hasOwnProperty.call(imports, name) ? imports[name] : undefined

        return load ? load().then((module) => module.default) : null
      })
      .then(
        (icon) => {
          loadedIcons.set(name, icon)
          pendingIcons.delete(name)

          return icon
        },
        (error: unknown) => {
          // A failed chunk is tried again by the next mount.
          pendingIcons.delete(name)

          throw error
        },
      )
    pendingIcons.set(name, pending)
  }

  return pending
}

/** Start loading `lucide-react/dynamic` ahead of the first named icon (browser only). */
export function preloadIcons(): void {
  if (typeof window !== 'undefined') loadIconImports().catch(() => undefined)
}

type LucideIconProps = Omit<ComponentProps<DynamicIconComponent>, 'name' | 'fallback'> & {
  name: string
  fallback?: () => ReactNode
}

/**
 * A Lucide icon by name, rendering `fallback` (or nothing) while it loads and for unknown
 * names. An icon that has loaded renders at once, except during the server render and
 * hydration: the server draws no named icons, so the hydrated markup matches it.
 */
function LucideIcon({ name, fallback, ...props }: LucideIconProps) {
  const hydrated = useHydrated()
  const [, setLoaded] = useState(0)
  const Loaded = hydrated ? loadedIcons.get(name) : undefined

  useEffect(() => {
    if (loadedIcons.has(name)) return

    let active = true

    loadIcon(name).then(
      () => {
        if (active) setLoaded((count) => count + 1)
      },
      (error: unknown) => console.error(error),
    )

    return () => {
      active = false
    }
  }, [name])

  // A module-level cache entry (one component per icon name), not created during render.
  if (Loaded) return createElement(Loaded, props as LucideProps)

  return fallback ? fallback() : null
}

/** A statically imported glyph (`SearchIcon` from `lucide-react`). */
export type IconGlyph = ComponentType<LucideProps>

export type IconProps = Omit<ComponentProps<DynamicIconComponent>, 'name' | 'fallback'> & {
  name?: string | null
  fallback?: LucideIconName | IconGlyph
}

/**
 * Renders an icon resolved by the server (`Icons::resolve()`): a Lucide name (`users`,
 * `shopping-cart`), an image URL or sanitised `<svg>` markup. `alfakit::` aliases use the
 * app's replacement (`Icons::register()`) or `fallback`. Unknown Lucide names fall back to
 * `fallback`, if any. `fallback` may also be a statically imported glyph
 * (`fallback={SearchIcon}`): renderer chrome uses it so an unreplaced alias draws at once,
 * without loading anything. Named icons load on demand; once loaded, later mounts draw them
 * synchronously. Register a `panel:icon` component
 * (`createAlfakit({ components: { 'panel:icon': MyIcon } })`) to render every named icon
 * with another icon set; it receives `name`, `fallback` and `className`.
 */
export function Icon({ name, fallback: fallbackProp, className, ...props }: IconProps) {
  const Custom = useOptionalRegistry()?.resolve('panel:icon')

  if (!name) {
    return null
  }

  const classes = cn('size-4 shrink-0', className)
  const Glyph = typeof fallbackProp === 'string' ? undefined : fallbackProp
  const fallback = typeof fallbackProp === 'string' ? fallbackProp : undefined

  // Chrome icons (`<Icon name="alfakit::…" fallback={SearchIcon} />`) draw their bundled
  // glyph synchronously unless the app replaced the alias with `Icons::register()`.
  if (Glyph && isIconAlias(name) && iconAliasOverride(name) === undefined) {
    return <Glyph className={classes} {...props} />
  }

  const source = iconSource(iconAlias(name, fallback))

  if (source.type === 'svg') {
    return (
      <span
        aria-hidden="true"
        data-slot="icon"
        className={cn('inline-flex [&>svg]:size-full', classes)}
        // Sanitised on the server (SvgSanitizer): drawing elements only.
        dangerouslySetInnerHTML={{ __html: source.svg }}
      />
    )
  }

  if (source.type === 'url') {
    return (
      <img
        src={source.url}
        alt=""
        aria-hidden="true"
        data-slot="icon"
        className={cn('object-contain', classes)}
      />
    )
  }

  if (Custom) {
    return createElement(Custom, {
      name: source.name,
      fallback,
      className: classes,
      ...props,
    })
  }

  return (
    <LucideIcon
      name={source.name}
      className={classes}
      fallback={
        Glyph
          ? () => <Glyph className={classes} />
          : fallback
            ? () => <LucideIcon name={fallback} className={classes} />
            : undefined
      }
      {...props}
    />
  )
}
