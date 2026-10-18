<script lang="ts">
  import { uniqueKey, navigationKey } from '../../lib/keys'
  import type { NavigationGroupSchema } from '@alfakit/core'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { untrack } from 'svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
  import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from '../ui/sidebar'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import NavGroupFlyout from './NavGroupFlyout.svelte'
  import NavItem from './NavItem.svelte'

  let { group }: { group: NavigationGroupSchema } = $props()

  // `NavigationGroup::extraSidebarAttributes()`; `class` is merged with the group's own.
  const attributes = $derived(extraProps(group.extraSidebarAttributes))

  // A labelled group with an icon collapses into a flyout in the icon-only sidebar.
  const flyout = $derived(Boolean(group.label && group.icon))

  let open = $state(untrack(() => !group.collapsed || group.items.some((item) => item.active)))
</script>

{#snippet content()}
  <SidebarGroupContent class={cn(flyout && 'group-data-[collapsible=icon]:hidden')}>
    <SidebarMenu>
      {#each group.items as item, itemIndex (uniqueKey(group.items, itemIndex, navigationKey))}
        <NavItem {item} />
      {/each}
    </SidebarMenu>
  </SidebarGroupContent>
{/snippet}

{#if !group.label}
  <SidebarGroup {...attributes}>{@render content()}</SidebarGroup>
{:else if !group.collapsible}
  <SidebarGroup {...attributes}>
    <SidebarGroupLabel>
      {#if group.icon}<Icon name={group.icon} class="me-1.5" />{/if}
      {group.label}
    </SidebarGroupLabel>
    {@render content()}
    {#if flyout}<NavGroupFlyout {group} />{/if}
  </SidebarGroup>
{:else}
  <Collapsible bind:open class="group/nav-group">
    <SidebarGroup {...attributes}>
      <CollapsibleTrigger>
        {#snippet child({ props })}
          <SidebarGroupLabel
            as="button"
            type="button"
            class="hover:bg-sidebar-accent w-full cursor-pointer justify-between"
            {...props}
          >
            <span class="flex items-center gap-1.5">
              {#if group.icon}<Icon name={group.icon} />{/if}
              {group.label}
            </span>
            <Icon
              name="alfakit::panels.sidebar.group.collapse-button"
              fallback={ChevronRightIcon}
              class="size-3.5 transition-transform group-data-[state=open]/nav-group:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nav-group:rotate-90"
            />
          </SidebarGroupLabel>
        {/snippet}
      </CollapsibleTrigger>
      <CollapsibleContent>{@render content()}</CollapsibleContent>
      {#if flyout}<NavGroupFlyout {group} />{/if}
    </SidebarGroup>
  </Collapsible>
{/if}
