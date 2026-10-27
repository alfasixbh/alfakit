<script lang="ts">
  import { uniqueKey, navigationKey } from '../../lib/keys'
  import type { NavigationItemSchema } from '@alfakit/core'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { untrack } from 'svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
  import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '../ui/sidebar'
  import NavSubItem from './NavSubItem.svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'
  import { extraProps } from '../../lib/attributes'
  import NavLabel from './NavLabel.svelte'
  import { useT } from '../../context.svelte'

  /** A child navigation item (any depth): badge, new-tab link and nested children. */
  let { item }: { item: NavigationItemSchema } = $props()
  const t = useT()

  let open = $state(untrack(() => Boolean(item.active)))

  // The sidebar stays mounted across visits: it keeps what the user opened or closed, and
  // opens again when the item becomes active.
  let wasActive = untrack(() => Boolean(item.active))
  $effect.pre(() => {
    const active = Boolean(item.active)

    if (active && !wasActive) open = true
    wasActive = active
  })

  const hasBadge = $derived(item.badge !== undefined && item.badge !== null)
</script>

{#snippet badge()}
  {#if hasBadge}
    <Badge
      variant="outline"
      class={cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, item.badgeColor, 'gray'))}
      title={item.badgeTooltip}>{item.badge}</Badge
    >
  {:else if item.badgePending}
    <!-- `deferNavigationBadges()`: a placeholder until the deferred badges arrive. -->
    <span
      data-slot="badge"
      aria-busy="true"
      aria-label={t('loading', {}, 'Loading')}
      class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
    ></span>
  {/if}
{/snippet}

<SidebarMenuSubItem>
  {#if item.children && item.children.length > 0}
    <Collapsible bind:open class="group/nav-sub">
      <CollapsibleTrigger>
        {#snippet child({ props })}
          <SidebarMenuSubButton
            isActive={item.active}
            {...extraProps(item.extraAttributes)}
            {...props}
          >
            {#if item.icon}<Icon name={item.icon} />{/if}
            <NavLabel text={item.label} html={item.labelHtml} />
            {@render badge()}
            <ChevronRightIcon
              class="ms-auto transition-transform duration-200 group-data-[state=open]/nav-sub:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nav-sub:rotate-90"
            />
          </SidebarMenuSubButton>
        {/snippet}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {#each item.children ?? [] as child, childIndex (uniqueKey(item.children ?? [], childIndex, navigationKey))}
            <NavSubItem item={child} />
          {/each}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  {:else}
    <SidebarMenuSubButton
      {...extraProps(item.extraAttributes)}
      href={item.url ?? '#'}
      external={item.openInNewTab}
      isActive={item.active}
    >
      {#if item.icon}<Icon name={item.icon} />{/if}
      <NavLabel text={item.label} html={item.labelHtml} />
      {#if item.openInNewTab}<NewTabHint />{/if}
      {@render badge()}
    </SidebarMenuSubButton>
  {/if}
</SidebarMenuSubItem>
