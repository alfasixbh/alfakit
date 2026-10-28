<script lang="ts">
  import { extraProps } from '../../lib/attributes'
  import NavLabel from './NavLabel.svelte'
  import type { NavigationItemSchema } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'

  let { item, tab }: { item: NavigationItemSchema; tab: boolean } = $props()

  const classes = $derived(
    cn(
      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
      tab ? 'shrink-0 whitespace-nowrap' : 'shrink-0 whitespace-nowrap @2xl:w-full @2xl:shrink',
      item.active
        ? 'bg-accent text-accent-foreground font-medium'
        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    ),
  )
</script>

{#snippet content()}
  {#if item.icon}<Icon name={item.icon} />{/if}
  <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
  {#if item.badge !== undefined && item.badge !== null}
    <Badge variant="secondary" class="ms-auto px-1.5 py-0" title={item.badgeTooltip}>
      {item.badge}
    </Badge>
  {/if}
{/snippet}

{#if !item.url}
  <span {...extraProps(item.extraAttributes, classes)}>{@render content()}</span>
{:else if item.openInNewTab}
  <a
    {...extraProps(item.extraAttributes, classes)}
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    {@render content()}
  </a>
{:else}
  <Link
    {...extraProps(item.extraAttributes, classes)}
    href={item.url}
    aria-current={item.active ? 'page' : undefined}
  >
    {@render content()}
  </Link>
{/if}
