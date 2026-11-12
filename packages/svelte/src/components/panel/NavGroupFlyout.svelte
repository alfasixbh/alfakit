<script lang="ts">
  import type { NavigationGroupSchema } from '@alfakit/core'
  import { hasActiveNavigationItem } from '@alfakit/core'
  import { useDirection } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import NavMenuItems from './NavMenuItems.svelte'
  import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar'

  /**
   * In the icon-only (collapsed) sidebar, a group with an icon is one button that opens its
   * items in a flyout menu, like Filament. Hidden while the sidebar is expanded.
   */
  let { group }: { group: NavigationGroupSchema } = $props()

  const direction = $derived(useDirection())
  const active = $derived(hasActiveNavigationItem(group.items))
</script>

<SidebarMenu class="hidden group-data-[collapsible=icon]:flex" data-nav-flyout="">
  <SidebarMenuItem>
    <DropdownMenu dir={direction}>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <SidebarMenuButton isActive={active} {...props}>
            <Icon name={group.icon ?? ''} />
            <span>{group.label}</span>
          </SidebarMenuButton>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={direction === 'rtl' ? 'left' : 'right'}
        align="start"
        class="min-w-56"
      >
        <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
        <NavMenuItems items={group.items} />
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>
