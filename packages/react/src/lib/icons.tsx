import { iconAlias, iconAliasOverride, iconSource, isIconAlias } from '@alfakit/core'
import type { LucideProps } from 'lucide-react'
import type { DynamicIcon, IconName as LucideIconName } from 'lucide-react/dynamic.mjs'
import { createElement, useEffect, useState, type ComponentProps, type ComponentType } from 'react'
import { useOptionalRegistry } from '../context'
import { cn } from './utils'

type DynamicIconComponent = typeof DynamicIcon

/**
 * `lucide-react/dynamic` carries a lazy import for every Lucide icon (~2,000 entries), so it
 * is not part of any entry chunk: panels (`createAlfakit()`, starter kit pages) start loading
 * it while they boot, since every page draws named icons, and elsewhere (a host's sidebar)
 * it loads with the first icon. Named icons render asynchronously either way.
 */
let dynamicIcon: DynamicIconComponent | undefined
let pendingDynamicIcon: Promise<DynamicIconComponent> | undefined

function loadDynamicIcon(): Promise<DynamicIconComponent> {
  pendingDynamicIcon ??= import('lucide-react/dynamic.mjs').then(
    (module) => (dynamicIcon = module.DynamicIcon),
    (error: unknown) => {
      pendingDynamicIcon = undefined

      throw error
    },
  )

  return pendingDynamicIcon
}

/** Start loading `lucide-react/dynamic` ahead of the first named icon (browser only). */
export function preloadIcons(): void {
  if (typeof window !== 'undefined') loadDynamicIcon().catch(() => undefined)
}

/** `DynamicIcon`, rendering its `fallback` (or nothing) until `lucide-react/dynamic` loads. */
function LazyDynamicIcon(props: ComponentProps<DynamicIconComponent>) {
  const [Dynamic, setDynamic] = useState(() => dynamicIcon)

  useEffect(() => {
    if (Dynamic) return

    let active = true

    loadDynamicIcon().then(
      (component) => active && setDynamic(() => component),
      () => undefined,
    )

    return () => {
      active = false
    }
  }, [Dynamic])

  if (Dynamic) return <Dynamic {...props} />

  return props.fallback ? createElement(props.fallback) : null
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
 * without loading anything. Register a `panel:icon` component
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
    <LazyDynamicIcon
      name={source.name as LucideIconName}
      className={classes}
      fallback={
        Glyph
          ? () => <Glyph className={classes} />
          : fallback
            ? () => <LazyDynamicIcon name={fallback} className={classes} />
            : undefined
      }
      {...props}
    />
  )
}
