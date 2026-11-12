<script lang="ts">
  import type { NavigationItemSchema } from '@alfakit/core'
  import { PREFETCH_CACHE_FOR, flattenNavigationItems } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import { extraProps } from '../../lib/attributes'
  import Icon from '../../lib/Icon.svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'
  import { cn } from '../../lib/utils'
  import NavBadge from './NavBadge.svelte'
  import NavLabel from './NavLabel.svelte'

  /**
   * Navigation items as a vertical list for a sheet (the top-navigation drawer, the bottom
   * bar's "More" sheet): new-tab links, badges and children at any depth, like the sidebar.
   */
  let {
    items,
    itemClass,
    onNavigate,
  }: { items: NavigationItemSchema[]; itemClass?: string; onNavigate: () => void } = $props()

  const entries = $derived(flattenNavigationItems(items))
  const indent = (depth: number) => cn(depth === 1 && 'ps-6', depth > 1 && 'ps-9')
  const linkClass = (depth: number) =>
    cn(
      'hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4',
      itemClass,
      indent(depth),
    )
</script>

{#snippet content(item: NavigationItemSchema)}
  {#if item.icon}<Icon name={item.icon} />{/if}
  <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
  <NavBadge {item} />
{/snippet}

{#each entries as { item, depth }, index (`${depth}-${item.label}-${index}`)}
  {#if item.url && item.openInNewTab}
    <a
      {...extraProps(item.extraAttributes, linkClass(depth))}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      data-active={item.active ? 'true' : undefined}
      aria-current={item.active ? 'page' : undefined}
      onclick={onNavigate}
    >
      {@render content(item)}<NewTabHint />
    </a>
  {:else if item.url}
    <Link
      {...extraProps(item.extraAttributes, linkClass(depth))}
      href={item.url}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
      data-active={item.active ? 'true' : undefined}
      aria-current={item.active ? 'page' : undefined}
      onclick={onNavigate}
    >
      {@render content(item)}
    </Link>
  {:else}
    <p
      class={cn(
        'text-muted-foreground flex items-center gap-2 px-2 py-2 font-medium [&_svg]:size-4',
        itemClass,
        indent(depth),
      )}
    >
      {#if item.icon}<Icon name={item.icon} />{/if}
      <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
    </p>
  {/if}
{/each}
