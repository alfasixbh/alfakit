<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import { useDirection, usePanel, useT } from '../../context.svelte'
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
  } from '../ui/sidebar'
  import NotificationsMenu from '../notifications/NotificationsMenu.svelte'
  import Brand from './Brand.svelte'
  import GlobalSearch from './GlobalSearch.svelte'
  import NavGroup from './NavGroup.svelte'
  import Slot from './Slot.svelte'
  import TenantMenu from './TenantMenu.svelte'
  import UserMenu from './UserMenu.svelte'

  const panel = $derived(usePanel())
  const t = useT()
  const direction = $derived(useDirection())
</script>

<Sidebar
  side={direction === 'rtl' ? 'right' : 'left'}
  collapsible={panel.theme?.design?.layout === 'rail'
    ? 'icon'
    : panel.sidebarFullyCollapsibleOnDesktop
      ? 'offcanvas'
      : panel.sidebarCollapsibleOnDesktop
        ? 'icon'
        : 'none'}
  variant={panel.theme?.sidebar === 'flush' ? 'sidebar' : (panel.theme?.sidebar ?? 'inset')}
>
  <SidebarHeader>
    <Slot name="sidebar.start" />
    <Slot name="sidebar.logo.before" />
    <SidebarMenu>
      <SidebarMenuItem>
        {#if panel.tenancy?.current}
          <Slot name="tenant-menu.before" />
          <TenantMenu />
          <Slot name="tenant-menu.after" />
        {:else}
          <SidebarMenuButton size="lg" as="div"><Brand /></SidebarMenuButton>
        {/if}
      </SidebarMenuItem>
    </SidebarMenu>
    <Slot name="sidebar.logo.after" />
    <!-- `databaseNotifications(position: 'sidebar')` or `topbar(false)`. -->
    {#if panel.databaseNotifications?.position === 'sidebar'}
      <SidebarMenu>
        <SidebarMenuItem>
          <NotificationsMenu variant="sidebar" />
        </SidebarMenuItem>
      </SidebarMenu>
    {/if}
    <!-- `globalSearch(position: GlobalSearchPosition::Sidebar)` or `topbar(false)`. -->
    {#if panel.globalSearch?.position === 'sidebar'}
      <SidebarMenu>
        <SidebarMenuItem>
          <GlobalSearch variant="sidebar" />
        </SidebarMenuItem>
      </SidebarMenu>
    {/if}
    <Slot name="sidebar.header" />
  </SidebarHeader>
  <SidebarContent>
    <Slot name="sidebar.nav.start" />
    <nav aria-label={t('sidebar', {}, 'Sidebar')} class="contents">
      {#each panel.navigation as group, index (uniqueKey(panel.navigation, index, (item) => item.label ?? ''))}
        <NavGroup {group} />
      {/each}
    </nav>
    <Slot name="sidebar.nav.end" />
  </SidebarContent>
  <SidebarFooter>
    <Slot name="sidebar.footer" />
    <!-- `userMenu(position: UserMenuPosition::Topbar)` shows it in the top bar instead. -->
    {#if panel.userMenu?.position !== 'topbar'}
      <SidebarMenu>
        <SidebarMenuItem><UserMenu /></SidebarMenuItem>
      </SidebarMenu>
    {/if}
    <Slot name="sidebar.end" />
  </SidebarFooter>
  <SidebarRail />
</Sidebar>
