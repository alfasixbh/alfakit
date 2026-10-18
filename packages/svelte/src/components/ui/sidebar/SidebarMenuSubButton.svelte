<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Link } from '@inertiajs/svelte'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    isActive = false,
    size = 'md',
    href,
    external = false,
    children,
    ...rest
  }: {
    class?: string
    isActive?: boolean
    size?: 'sm' | 'md'
    /** Without `href` the button is a `<button>` (e.g. a collapsible trigger). */
    href?: string
    external?: boolean
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const classes = $derived(
    cn(
      'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden group-data-[collapsible=icon]:hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 rtl:translate-x-px [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      className,
    ),
  )
</script>

{#if !href}
  <button
    type="button"
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    data-size={size}
    data-active={isActive}
    class={cn('w-full', classes)}
    {...rest}
  >
    {@render children?.()}
  </button>
{:else if external}
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    data-size={size}
    data-active={isActive}
    class={classes}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <Link
    {href}
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    data-size={size}
    data-active={isActive}
    class={classes}
    {...rest}
  >
    {@render children?.()}
  </Link>
{/if}
