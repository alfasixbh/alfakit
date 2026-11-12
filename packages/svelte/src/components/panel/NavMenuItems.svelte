<script lang="ts">
  import type { NavigationItemSchema } from '@alfakit/core'
  import { PREFETCH_CACHE_FOR, flattenNavigationItems } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import { extraProps } from '../../lib/attributes'
  import Icon from '../../lib/Icon.svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'
  import { cn } from '../../lib/utils'
  import { DropdownMenuItem, DropdownMenuLabel } from '../ui/dropdown-menu'
  import NavBadge from './NavBadge.svelte'
  import NavLabel from './NavLabel.svelte'

  /**
   * Navigation items in a dropdown menu (a sidebar group's flyout, a top-navigation menu),
   * children indented under their parent at any depth. Items are real links, so they open
   * in a new tab with a middle click; a parent without a URL is a heading.
   */
  let { items }: { items: NavigationItemSchema[] } = $props()

  const entries = $derived(flattenNavigationItems(items))
  const indent = (depth: number) => cn(depth === 1 && 'ps-6', depth > 1 && 'ps-9')
</script>

{#snippet content(item: NavigationItemSchema)}
  {#if item.icon}<Icon name={item.icon} />{/if}
  <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
  <NavBadge {item} />
{/snippet}

{#each entries as { item, depth }, index (`${depth}-${item.label}-${index}`)}
  {#if item.url}
    <DropdownMenuItem
      data-active={item.active ? 'true' : undefined}
      aria-current={item.active ? 'page' : undefined}
      class={cn('data-[active=true]:bg-accent data-[active=true]:font-medium', indent(depth))}
    >
      {#snippet child({ props })}
        {#if item.openInNewTab}
          <a
            {...props}
            {...extraProps(item.extraAttributes, props.class as string | undefined)}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {@render content(item)}<NewTabHint />
          </a>
        {:else}
          <Link
            {...props}
            {...extraProps(item.extraAttributes, props.class as string | undefined)}
            href={item.url ?? ''}
            prefetch
            cacheFor={PREFETCH_CACHE_FOR}
          >
            {@render content(item)}
          </Link>
        {/if}
      {/snippet}
    </DropdownMenuItem>
  {:else}
    <DropdownMenuLabel class={cn('flex items-center gap-2 [&_svg]:size-4', indent(depth))}>
      {#if item.icon}<Icon name={item.icon} />{/if}
      <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
    </DropdownMenuLabel>
  {/if}
{/each}
