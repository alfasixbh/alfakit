<script lang="ts">
  import { PREFETCH_CACHE_FOR } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { Link } from '@inertiajs/svelte'
  import { cn } from '../../../lib/utils'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
  import { useSidebar } from './context.svelte'
  import {
    sidebarMenuButtonVariants,
    type SidebarMenuButtonSize,
    type SidebarMenuButtonVariant,
  } from './sidebar-menu-button'

  type Props = HTMLButtonAttributes & {
    isActive?: boolean
    variant?: SidebarMenuButtonVariant
    size?: SidebarMenuButtonSize
    tooltip?: string
    /** Render as an Inertia link. */
    href?: string | null
    /** Plain anchor (new tab). */
    external?: boolean
    prefetch?: boolean
    /** Render a non-interactive wrapper (e.g. around a brand link). */
    as?: 'button' | 'div'
    children?: Snippet
  }

  let {
    class: className,
    isActive = false,
    variant = 'default',
    size = 'default',
    tooltip,
    href,
    external = false,
    prefetch = false,
    as = 'button',
    children,
    ...rest
  }: Props = $props()

  const sidebar = useSidebar()
  const classes = $derived(cn(sidebarMenuButtonVariants({ variant, size }), className))
  const loose = $derived(rest as Record<string, unknown>)
</script>

{#snippet button(extra: Record<string, unknown> = {})}
  {#if href && external}
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      class={classes}
      {...loose}
      {...extra}
    >
      {@render children?.()}
    </a>
  {:else if href}
    <Link
      {href}
      prefetch={prefetch || undefined}
      cacheFor={prefetch ? PREFETCH_CACHE_FOR : undefined}
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      class={classes}
      {...loose}
      {...extra}
    >
      {@render children?.()}
    </Link>
  {:else if as === 'div'}
    <div
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      class={classes}
      {...loose}
      {...extra}
    >
      {@render children?.()}
    </div>
  {:else}
    <button
      type="button"
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      class={classes}
      {...rest}
      {...extra}
    >
      {@render children?.()}
    </button>
  {/if}
{/snippet}

{#if tooltip}
  <Tooltip disabled={sidebar.state !== 'collapsed' || sidebar.isMobile.current}>
    <TooltipTrigger>
      {#snippet child({ props })}
        {@render button(props)}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent side="right" align="center">{tooltip}</TooltipContent>
  </Tooltip>
{:else}
  {@render button()}
{/if}
