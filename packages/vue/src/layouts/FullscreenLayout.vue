<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { LogOutIcon } from '@lucide/vue'
import { computed } from 'vue'
import NotificationsMenu from '../components/notifications/NotificationsMenu.vue'
import Brand from '../components/panel/Brand.vue'
import DebugPanelSlot from '../components/panel/DebugPanelSlot.vue'
import Slot from '../components/panel/Slot.vue'
import ThemeToggle from '../components/panel/ThemeToggle.vue'
import TopbarLocaleSwitcher from '../components/panel/TopbarLocaleSwitcher.vue'
import UserMenu from '../components/panel/UserMenu.vue'
import Button from '../components/ui/Button.vue'
import Separator from '../components/ui/Separator.vue'
import { useT } from '../context'
import { Icon } from '../lib/icons'

/**
 * `$layout = 'fullscreen'`: the whole viewport for an app screen (point of sale, kiosk,
 * board). No sidebar or topbar; an optional slim header keeps the brand, the page title,
 * notifications, the user menu and a way back to the panel. Toasts, modals and the debug
 * panel work as on every other page. Replace it with `components: { 'layout:fullscreen': … }`.
 */
const props = defineProps<{ page?: PageSchema }>()
const t = useT()
const header = computed(() => props.page?.fullscreen?.header !== false)
const exitUrl = computed(() => props.page?.fullscreen?.exitUrl)
</script>

<template>
  <div data-layout="fullscreen" class="bg-background flex h-svh min-h-0 flex-col">
    <Slot name="body.start" />
    <Slot name="layout.start" />
    <header
      v-if="header"
      data-slot="topbar"
      data-variant="fullscreen"
      class="bg-background flex h-12 shrink-0 items-center gap-3 border-b px-3 md:px-4"
    >
      <Slot name="topbar.logo.before" />
      <Brand class="hidden shrink-0 sm:flex" />
      <Slot name="topbar.logo.after" />
      <Separator orientation="vertical" class="hidden h-4 sm:block" />
      <h1 class="min-w-0 truncate text-sm font-semibold">
        {{ props.page?.heading ?? props.page?.title }}
      </h1>
      <Slot name="topbar.start" />
      <div class="ms-auto flex shrink-0 items-center gap-1">
        <Slot name="topbar.end" />
        <NotificationsMenu />
        <TopbarLocaleSwitcher />
        <ThemeToggle />
        <DebugPanelSlot />
        <UserMenu variant="topbar" />
        <Button v-if="exitUrl" variant="ghost" size="sm" as-child>
          <Link :href="exitUrl" data-slot="fullscreen-exit">
            <Icon
              name="alfakit::panels.widgets.account.logout-button"
              :fallback="LogOutIcon"
              class="rtl:rotate-180"
              aria-hidden="true"
            />
            <span class="hidden sm:inline">{{ t('exit_fullscreen', {}, 'Exit') }}</span>
            <span class="sr-only sm:hidden">{{ t('exit_fullscreen', {}, 'Exit') }}</span>
          </Link>
        </Button>
      </div>
    </header>
    <div v-else class="fixed end-3 bottom-3 z-40">
      <DebugPanelSlot />
    </div>
    <main data-slot="content" class="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <Slot name="content.start" />
      <slot />
      <Slot name="content.end" />
    </main>
    <Slot name="layout.end" />
    <Slot name="body.end" />
  </div>
</template>
