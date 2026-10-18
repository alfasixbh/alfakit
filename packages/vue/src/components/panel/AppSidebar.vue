<script setup lang="ts">
import { useDirection, usePanel, useT } from '../../context'
import NotificationsMenu from '../notifications/NotificationsMenu.vue'
import Sidebar from '../ui/Sidebar.vue'
import SidebarContent from '../ui/SidebarContent.vue'
import SidebarFooter from '../ui/SidebarFooter.vue'
import SidebarHeader from '../ui/SidebarHeader.vue'
import SidebarMenu from '../ui/SidebarMenu.vue'
import SidebarMenuButton from '../ui/SidebarMenuButton.vue'
import SidebarMenuItem from '../ui/SidebarMenuItem.vue'
import SidebarRail from '../ui/SidebarRail.vue'
import Brand from './Brand.vue'
import GlobalSearch from './GlobalSearch.vue'
import NavGroup from './NavGroup.vue'
import Slot from './Slot.vue'
import TenantMenu from './TenantMenu.vue'
import UserMenu from './UserMenu.vue'

const panel = usePanel()
const t = useT()
const direction = useDirection()
</script>

<template>
  <Sidebar
    :side="direction === 'rtl' ? 'right' : 'left'"
    :collapsible="
      panel.theme?.design?.layout === 'rail'
        ? 'icon'
        : panel.sidebarFullyCollapsibleOnDesktop
          ? 'offcanvas'
          : panel.sidebarCollapsibleOnDesktop
            ? 'icon'
            : 'none'
    "
    :variant="panel.theme?.sidebar === 'flush' ? 'sidebar' : (panel.theme?.sidebar ?? 'inset')"
  >
    <SidebarHeader>
      <Slot name="sidebar.start" />
      <Slot name="sidebar.logo.before" />
      <SidebarMenu>
        <SidebarMenuItem>
          <template v-if="panel.tenancy?.current">
            <Slot name="tenant-menu.before" />
            <TenantMenu />
            <Slot name="tenant-menu.after" />
          </template>
          <SidebarMenuButton v-else size="lg" as-child>
            <div><Brand /></div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Slot name="sidebar.logo.after" />
      <!-- `databaseNotifications(position: 'sidebar')` or `topbar(false)`. -->
      <SidebarMenu v-if="panel.databaseNotifications?.position === 'sidebar'">
        <SidebarMenuItem>
          <NotificationsMenu variant="sidebar" />
        </SidebarMenuItem>
      </SidebarMenu>
      <!-- `globalSearch(position: GlobalSearchPosition::Sidebar)` or `topbar(false)`. -->
      <SidebarMenu v-if="panel.globalSearch?.position === 'sidebar'">
        <SidebarMenuItem>
          <GlobalSearch variant="sidebar" />
        </SidebarMenuItem>
      </SidebarMenu>
      <Slot name="sidebar.header" />
    </SidebarHeader>
    <SidebarContent>
      <Slot name="sidebar.nav.start" />
      <nav :aria-label="t('sidebar', {}, 'Sidebar')" class="contents">
        <NavGroup
          v-for="(group, index) in panel.navigation"
          :key="group.label ?? `group-${index}`"
          :group="group"
        />
      </nav>
      <Slot name="sidebar.nav.end" />
    </SidebarContent>
    <SidebarFooter>
      <Slot name="sidebar.footer" />
      <!-- `userMenu(position: UserMenuPosition::Topbar)` shows it in the top bar instead. -->
      <SidebarMenu v-if="panel.userMenu?.position !== 'topbar'">
        <SidebarMenuItem>
          <UserMenu />
        </SidebarMenuItem>
      </SidebarMenu>
      <Slot name="sidebar.end" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
