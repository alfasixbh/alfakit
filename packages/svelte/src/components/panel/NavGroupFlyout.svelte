<script lang="ts">
  import NavLabel from './NavLabel.svelte'
  import type { NavigationGroupSchema, NavigationItemSchema } from '@alfakit/core'
  import { flattenNavigationItems, hasActiveNavigationItem } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import { useDirection } from '../../context.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar'

  /**
   * In the icon-only (collapsed) sidebar, a group with an icon is one button that opens its
   * items in a flyout menu, like Filament. Hidden while the sidebar is expanded.
   */
  let { group }: { group: NavigationGroupSchema } = $props()

  const direction = $derived(useDirection())
  const items = $derived(flattenNavigationItems(group.items))
  const active = $derived(hasActiveNavigationItem(group.items))

  const open = (item: NavigationItemSchema) => {
    if (!item.url) return

    if (item.openInNewTab) window.open(item.url, '_blank', 'noopener')
    else router.visit(item.url)
  }
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
        {#each items as { item, depth }, index (`${depth}-${item.label}-${index}`)}
          <DropdownMenuItem
            onSelect={() => open(item)}
            data-active={item.active ? 'true' : undefined}
            aria-current={item.active ? 'page' : undefined}
            class={cn(
              'data-[active=true]:bg-accent data-[active=true]:font-medium',
              depth === 1 && 'ps-6',
              depth > 1 && 'ps-9',
            )}
          >
            {#if item.icon}<Icon name={item.icon} />{/if}
            <NavLabel class="truncate" text={item.label} html={item.labelHtml} />
            {#if item.openInNewTab}<NewTabHint />{/if}
            {#if item.badge !== undefined && item.badge !== null}<Badge
                variant="outline"
                class={cn(
                  'ms-auto px-1.5 py-0',
                  colorClass(badgeColorClasses, item.badgeColor, 'gray'),
                )}
                title={item.badgeTooltip}>{item.badge}</Badge
              >{:else if item.badgePending}<span
                data-slot="badge"
                aria-hidden="true"
                class="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
              ></span>{/if}
          </DropdownMenuItem>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</SidebarMenu>
