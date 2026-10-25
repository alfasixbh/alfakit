<script setup lang="ts">
import {
  PREFETCH_CACHE_FOR,
  hasMobilePreset,
  type BreadcrumbSchema,
  type NavigationItemSchema,
  type Width,
} from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { MenuIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import NotificationsMenu from '../components/notifications/NotificationsMenu.vue'
import BottomNav from '../components/panel/BottomNav.vue'
import Brand from '../components/panel/Brand.vue'
import TenantMenu from '../components/panel/TenantMenu.vue'
import Breadcrumbs from '../components/panel/Breadcrumbs.vue'
import GlobalSearch from '../components/panel/GlobalSearch.vue'
import NavLabel from '../components/panel/NavLabel.vue'
import Slot from '../components/panel/Slot.vue'
import DebugPanelSlot from '../components/panel/DebugPanelSlot.vue'
import ThemeToggle from '../components/panel/ThemeToggle.vue'
import TopbarLocaleSwitcher from '../components/panel/TopbarLocaleSwitcher.vue'
import UserMenu from '../components/panel/UserMenu.vue'
import Button from '../components/ui/Button.vue'
import Sheet from '../components/ui/Sheet.vue'
import SheetContent from '../components/ui/SheetContent.vue'
import SheetHeader from '../components/ui/SheetHeader.vue'
import SheetTitle from '../components/ui/SheetTitle.vue'
import SheetTrigger from '../components/ui/SheetTrigger.vue'
import { useDirection, usePanel, useRegistry, useT } from '../context'
import { Icon } from '../lib/icons'
import { cn } from '../lib/utils'
import { MAX_WIDTHS } from './max-widths'
import TopNavGroupWrapper from './TopNavGroupWrapper.vue'
import TopNavMenu from './TopNavMenu.vue'
import NewTabHint from '../lib/NewTabHint.vue'

/**
 * Navigation across the top instead of a sidebar (`layout: 'topbar'`). Ungrouped items are
 * links; labelled groups and items with children open as dropdowns.
 */
const props = defineProps<{ breadcrumbs?: BreadcrumbSchema[]; maxContentWidth?: Width | string }>()
const panel = usePanel()
const t = useT()
const direction = useDirection()
const registry = useRegistry()
const open = ref(false)
const Bottom = computed(() => registry.resolve('panel:bottom-nav') ?? BottomNav)
const mobilePreset = computed(() => hasMobilePreset(panel.value))
const width = computed(
  () => MAX_WIDTHS[props.maxContentWidth ?? panel.value.maxContentWidth ?? '7xl'] ?? 'max-w-7xl',
)

const isActive = (item: NavigationItemSchema): boolean =>
  Boolean(item.active || item.children?.some(isActive))

const linkClass =
  'text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors [&_svg]:size-4'
</script>

<template>
  <div data-slot="topnav-layout" class="bg-background flex min-h-svh flex-col">
    <Slot name="body.start" />
    <Slot name="layout.start" />
    <Slot name="topbar.before" />
    <header
      data-slot="topbar"
      class="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur"
    >
      <div :class="cn('mx-auto flex h-14 w-full items-center gap-3 px-4 md:px-6', width)">
        <Sheet :open="open" @update:open="open = $event">
          <SheetTrigger as-child>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="md:hidden"
              :aria-label="t('toggle_sidebar', {}, 'Toggle sidebar')"
            >
              <Icon name="alfakit::panels.topbar.open-sidebar-button" :fallback="MenuIcon" />
            </Button>
          </SheetTrigger>
          <SheetContent :side="direction === 'rtl' ? 'right' : 'left'" class="w-72 p-0">
            <SheetHeader class="border-b">
              <SheetTitle as-child>
                <div><Brand /></div>
              </SheetTitle>
            </SheetHeader>
            <nav class="flex flex-col gap-4 overflow-y-auto p-4 text-sm">
              <div
                v-for="(group, index) in panel.navigation"
                :key="group.label ?? index"
                class="flex flex-col gap-1"
              >
                <p v-if="group.label" class="text-muted-foreground px-2 text-xs font-medium">
                  {{ group.label }}
                </p>
                <Link
                  v-for="item in group.items.flatMap((entry) => [entry, ...(entry.children ?? [])])"
                  :key="item.url ?? item.label"
                  :href="item.url ?? '#'"
                  :data-active="item.active ? 'true' : undefined"
                  class="hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4"
                  @click="open = false"
                >
                  <Icon v-if="item.icon" :name="item.icon" />
                  <NavLabel :text="item.label" :html="item.labelHtml" />
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <Slot name="topbar.logo.before" />
        <Brand class="me-2 shrink-0" />
        <Slot name="topbar.logo.after" />
        <Slot v-if="panel.tenancy?.current" name="tenant-menu.before" />
        <TenantMenu variant="topbar" />
        <Slot v-if="panel.tenancy?.current" name="tenant-menu.after" />
        <nav
          data-slot="topnav"
          :aria-label="t('navigation', {}, 'Navigation')"
          class="hidden min-w-0 flex-1 items-center gap-1 self-stretch overflow-x-auto md:flex"
        >
          <TopNavGroupWrapper
            v-for="(group, index) in panel.navigation"
            :key="group.label ?? `group-${index}`"
            :attributes="group.extraTopbarAttributes"
          >
            <TopNavMenu
              v-if="group.label"
              :label="group.label"
              :icon="group.icon"
              :items="group.items"
              :active="group.items.some(isActive)"
            />
            <template v-for="item in group.items" v-else :key="item.url ?? item.label">
              <TopNavMenu
                v-if="item.children && item.children.length > 0"
                :label="item.label"
                :label-html="item.labelHtml"
                :icon="item.icon"
                :items="item.children"
                :active="isActive(item)"
                :attributes="item.extraAttributes"
              />
              <a
                v-else-if="item.openInNewTab"
                v-bind="item.extraAttributes ?? {}"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                data-slot="topnav-link"
                :class="linkClass"
              >
                <Icon v-if="item.icon" :name="item.icon" />
                <NavLabel :text="item.label" :html="item.labelHtml" />
                <NewTabHint />
              </a>
              <Link
                v-else
                v-bind="item.extraAttributes ?? {}"
                :href="item.url ?? '#'"
                prefetch
                :cache-for="PREFETCH_CACHE_FOR"
                data-slot="topnav-link"
                :data-active="item.active ? 'true' : undefined"
                :class="linkClass"
              >
                <Icon v-if="item.icon" :name="item.icon" />
                <NavLabel :text="item.label" :html="item.labelHtml" />
              </Link>
            </template>
          </TopNavGroupWrapper>
        </nav>
        <Slot name="topbar.start" />
        <div class="ms-auto flex shrink-0 items-center gap-1">
          <Slot name="topbar.end" />
          <GlobalSearch />
          <NotificationsMenu />
          <TopbarLocaleSwitcher />
          <ThemeToggle />
          <DebugPanelSlot />
          <UserMenu variant="topbar" />
        </div>
      </div>
    </header>
    <Slot name="topbar.after" />
    <Slot name="content.before" />
    <main
      data-slot="content"
      :class="cn('mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6', width)"
    >
      <Breadcrumbs
        v-if="panel.breadcrumbs && props.breadcrumbs && props.breadcrumbs.length > 0"
        :items="props.breadcrumbs"
      />
      <Slot name="content.start" />
      <slot />
      <Slot name="content.end" />
    </main>
    <Slot name="content.after" />
    <Slot name="footer" />
    <component :is="Bottom" v-if="mobilePreset" />
    <Slot name="layout.end" />
    <Slot name="body.end" />
  </div>
</template>
