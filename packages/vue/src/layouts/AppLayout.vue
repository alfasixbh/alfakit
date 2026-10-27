<script setup lang="ts">
import {
  hasMobilePreset,
  hasTopbar,
  sidebarDefaultOpen,
  sidebarWidthStyle,
  type BreadcrumbSchema,
  type PageSchema,
  type Width,
} from '@alfakit/core'
import { computed } from 'vue'
import AppSidebar from '../components/panel/AppSidebar.vue'
import BottomNav from '../components/panel/BottomNav.vue'
import MobileTopbar from '../components/panel/MobileTopbar.vue'
import Slot from '../components/panel/Slot.vue'
import Topbar from '../components/panel/Topbar.vue'
import SidebarInset from '../components/ui/SidebarInset.vue'
import SidebarProvider from '../components/ui/SidebarProvider.vue'
import { CloseMobileSidebarOnVisit } from '../composables/use-persistent-layout'
import { useAlfakitProps, useRegistry } from '../context'
import { cn } from '../lib/utils'
import { MAX_WIDTHS } from './max-widths'
import TopNavLayout from './TopNavLayout.vue'

/** Sidebar + topbar shell used by every authenticated page. */
const props = defineProps<{
  breadcrumbs?: BreadcrumbSchema[]
  maxContentWidth?: Width | string
  page?: PageSchema
}>()
const pageProps = useAlfakitProps()
const registry = useRegistry()
const layout = computed(() => pageProps.value.alfakit.theme?.design?.layout ?? 'sidebar')
// Replace the sidebar or top bar everywhere with createAlfakit({ components: { 'panel:sidebar': … } }).
const Sidebar = computed(() => registry.resolve('panel:sidebar') ?? AppSidebar)
const Bar = computed(() => registry.resolve('panel:topbar') ?? Topbar)
// The mobile preset's bottom bar (`Panel::mobile()`), hidden from `md` up.
const Bottom = computed(() => registry.resolve('panel:bottom-nav') ?? BottomNav)
const mobilePreset = computed(() => hasMobilePreset(pageProps.value.alfakit))
// `topbar(false)`: no top bar, except a slim one with the sidebar toggle on phones.
const showTopbar = computed(() => hasTopbar(pageProps.value.alfakit))
// The rail layout starts as icons only until the user expands it.
const defaultOpen = computed(() =>
  sidebarDefaultOpen(pageProps.value.alfakitSidebarOpen, layout.value),
)
const width = computed(
  () => props.maxContentWidth ?? pageProps.value.alfakit.maxContentWidth ?? '7xl',
)
</script>

<template>
  <TopNavLayout
    v-if="layout === 'topbar'"
    :breadcrumbs="props.breadcrumbs"
    :max-content-width="props.maxContentWidth"
  >
    <slot />
  </TopNavLayout>
  <SidebarProvider v-else :default-open="defaultOpen" :style="sidebarWidthStyle(pageProps.alfakit)">
    <CloseMobileSidebarOnVisit />
    <Slot name="body.start" />
    <Slot name="layout.start" />
    <component :is="Sidebar" />
    <SidebarInset>
      <Slot name="topbar.before" />
      <component :is="Bar" v-if="showTopbar" :breadcrumbs="props.breadcrumbs" />
      <MobileTopbar v-else />
      <Slot name="topbar.after" />
      <Slot name="content.before" />
      <div
        data-slot="content"
        :class="
          cn(
            'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
            MAX_WIDTHS[width] ?? 'max-w-7xl',
          )
        "
      >
        <Slot name="content.start" />
        <slot />
        <Slot name="content.end" />
      </div>
      <Slot name="content.after" />
      <Slot name="footer" />
    </SidebarInset>
    <component :is="Bottom" v-if="mobilePreset" />
    <Slot name="layout.end" />
    <Slot name="body.end" />
  </SidebarProvider>
</template>
