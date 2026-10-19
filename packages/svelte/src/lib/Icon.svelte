<script lang="ts">
  import { iconAlias, iconAliasOverride, iconSource, isIconAlias } from '@alfakit/core'
  import type { LucideProps } from '@lucide/svelte'
  import type { Component } from 'svelte'
  import { useOptionalRegistry } from '../context.svelte'
  import { cn } from './utils'
  import { useAppMounted } from './hydration.svelte'
  import { loadIcon, resolveIcon, resolveRegisteredIcon, type LucideIconComponent } from './icons'

  type Props = LucideProps & {
    /**
     * Icon resolved by the server (`Icons::resolve()`): a Lucide name (`users`), an image
     * URL or sanitised `<svg>` markup. `alfakit::` aliases use the app's replacement.
     */
    name?: string | null
    /**
     * Icon shown when `name` is unknown (and for unreplaced `alfakit::` aliases). Renderer
     * chrome passes its statically imported glyph (`fallback={SearchIcon}`), which draws at
     * once, without loading anything, unless the app replaced the alias.
     */
    fallback?: string | Component<LucideProps>
  }

  let { name, fallback: fallbackProp, class: className, ...rest }: Props = $props()

  const fallback = $derived(typeof fallbackProp === 'string' ? fallbackProp : undefined)
  const Glyph = $derived(
    fallbackProp && typeof fallbackProp !== 'string' ? fallbackProp : undefined,
  )
  const useGlyph = $derived(
    !!Glyph && !!name && isIconAlias(name) && iconAliasOverride(name) === undefined,
  )

  // `createAlfakit({ components: { 'panel:icon': MyIcon } })` renders every named icon with
  // another icon set; it receives `name`, `fallback` and `class`.
  const Custom = useOptionalRegistry()?.resolve('panel:icon')

  const source = $derived(name && !useGlyph ? iconSource(iconAlias(name, fallback)) : null)
  const iconName = $derived(source?.type === 'name' ? source.name : null)

  // Icons load on demand (each is its own chunk); one already loaded renders at once. The
  // server render shows nothing, like `lucide-react/dynamic`.
  // Until this app has hydrated, only registered icons (and the glyph) render, like on the
  // server, even when another app on the page already loaded the icon.
  const mounted = useAppMounted()
  let loaded = $state<{ key: string; icon: LucideIconComponent | undefined }>()
  const key = $derived(`${iconName ?? ''}|${fallback ?? ''}`)
  const resolve = (icon: string) =>
    mounted.current ? resolveIcon(icon) : resolveRegisteredIcon(icon)
  const component = $derived(
    iconName
      ? (resolve(iconName) ??
          (mounted.current && loaded?.key === key ? loaded.icon : undefined) ??
          (fallback ? resolve(fallback) : undefined) ??
          (Glyph as LucideIconComponent | undefined))
      : undefined,
  )

  $effect(() => {
    const current = key
    const [icon, alternative] = [iconName, fallback]

    if (Custom || !icon || resolveIcon(icon)) return

    let active = true
    void loadIcon(icon)
      .then((found) => found ?? (alternative ? loadIcon(alternative) : undefined))
      .then((found) => {
        if (active) loaded = { key: current, icon: found }
      })

    return () => {
      active = false
    }
  })
</script>

{#if useGlyph && Glyph}
  <Glyph class={cn('size-4 shrink-0', className as string)} {...rest} />
{:else if source?.type === 'svg'}
  <!-- Sanitised on the server (SvgSanitizer): drawing elements only. -->
  <span
    aria-hidden="true"
    data-slot="icon"
    class={cn('inline-flex size-4 shrink-0 [&>svg]:size-full', className as string)}
  >
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html source.svg}
  </span>
{:else if source?.type === 'url'}
  <img
    src={source.url}
    alt=""
    aria-hidden="true"
    data-slot="icon"
    class={cn('size-4 shrink-0 object-contain', className as string)}
  />
{:else if iconName && Custom}
  <Custom name={iconName} {fallback} class={cn('size-4 shrink-0', className as string)} {...rest} />
{:else if iconName && component}
  {@const Resolved = component}
  <Resolved class={cn('size-4 shrink-0', className as string)} data-icon={iconName} {...rest} />
{/if}
