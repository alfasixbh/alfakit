<script setup lang="ts">
import { TOPBAR_END_SLOT_CLASS, type BreadcrumbSchema } from '@alfakit/core'
import { usePanel } from '../../context'
import NotificationsMenu from '../notifications/NotificationsMenu.vue'
import Separator from '../ui/Separator.vue'
import SidebarTrigger from '../ui/SidebarTrigger.vue'
import Breadcrumbs from './Breadcrumbs.vue'
import DebugPanelSlot from './DebugPanelSlot.vue'
import GlobalSearch from './GlobalSearch.vue'
import Slot from './Slot.vue'
import ThemeToggle from './ThemeToggle.vue'
import TopbarLocaleSwitcher from './TopbarLocaleSwitcher.vue'
import UserMenu from './UserMenu.vue'

const props = defineProps<{ breadcrumbs?: BreadcrumbSchema[] }>()
const panel = usePanel()
</script>

<template>
  <header
    data-slot="topbar"
    class="bg-background/80 supports-[backdrop-filter]:bg-background/60 @container/topbar sticky top-0 z-20 flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-x-clip border-b px-4 backdrop-blur"
  >
    <!-- `@container/topbar`: the search field folds into an icon button when the bar is narrow.
         `overflow-x-clip`: whatever apps add to the bar never makes the page scroll sideways. -->
    <SidebarTrigger class="-ms-1" />
    <Separator orientation="vertical" class="me-2 h-4" />
    <Breadcrumbs v-if="panel.breadcrumbs && props.breadcrumbs" :items="props.breadcrumbs" />
    <Slot name="topbar.start" />
    <div class="ms-auto flex min-w-0 items-center gap-1">
      <Slot name="topbar.end" :class="TOPBAR_END_SLOT_CLASS" />
      <!-- `globalSearch(position: Sidebar)` moves the field to the sidebar header. -->
      <GlobalSearch v-if="panel.topNavigation || panel.globalSearch?.position !== 'sidebar'" />
      <NotificationsMenu v-if="panel.databaseNotifications?.position !== 'sidebar'" />
      <TopbarLocaleSwitcher />
      <ThemeToggle />
      <DebugPanelSlot />
      <!-- `userMenu(position: Topbar)` moves the menu out of the sidebar footer. -->
      <UserMenu
        v-if="panel.topNavigation || panel.userMenu?.position === 'topbar'"
        variant="topbar"
      />
    </div>
  </header>
</template>
