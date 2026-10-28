<script lang="ts">
  import { TOPBAR_END_SLOT_CLASS, type PageSchema } from '@alfakit/core'
  import LogOutIcon from '@lucide/svelte/icons/log-out'
  import type { Snippet } from 'svelte'
  import NotificationsMenu from '../components/notifications/NotificationsMenu.svelte'
  import Brand from '../components/panel/Brand.svelte'
  import DebugPanelSlot from '../components/panel/DebugPanelSlot.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import ThemeToggle from '../components/panel/ThemeToggle.svelte'
  import TopbarLocaleSwitcher from '../components/panel/TopbarLocaleSwitcher.svelte'
  import UserMenu from '../components/panel/UserMenu.svelte'
  import { Button } from '../components/ui/button'
  import { Separator } from '../components/ui/separator'
  import { useT } from '../context.svelte'
  import Icon from '../lib/Icon.svelte'

  /**
   * `$layout = 'fullscreen'`: the whole viewport for an app screen (point of sale, kiosk,
   * board). No sidebar or topbar; an optional slim header keeps the brand, the page title,
   * notifications, the user menu and a way back to the panel. Toasts, modals and the debug
   * panel work as on every other page. Replace it with `components: { 'layout:fullscreen': … }`.
   */
  let { page, children }: { page?: PageSchema; children?: Snippet } = $props()

  const t = useT()
  const header = $derived(page?.fullscreen?.header !== false)
  const exitUrl = $derived(page?.fullscreen?.exitUrl)
</script>

<div data-layout="fullscreen" class="bg-background flex h-svh min-h-0 flex-col">
  <Slot name="body.start" />
  <Slot name="layout.start" />
  {#if header}
    <header
      data-slot="topbar"
      data-variant="fullscreen"
      class="bg-background flex h-12 shrink-0 items-center gap-3 overflow-x-clip border-b px-3 md:px-4"
    >
      <Slot name="topbar.logo.before" />
      <Brand class="hidden shrink-0 sm:flex" />
      <Slot name="topbar.logo.after" />
      <Separator orientation="vertical" class="hidden h-4 sm:block" />
      <h1 class="min-w-0 truncate text-sm font-semibold">{page?.heading ?? page?.title}</h1>
      <Slot name="topbar.start" />
      <div class="ms-auto flex min-w-0 items-center gap-1">
        <Slot name="topbar.end" class={TOPBAR_END_SLOT_CLASS} />
        <NotificationsMenu />
        <TopbarLocaleSwitcher />
        <ThemeToggle />
        <DebugPanelSlot />
        <UserMenu variant="topbar" />
        {#if exitUrl}
          <Button variant="ghost" size="sm" href={exitUrl} data-slot="fullscreen-exit">
            <Icon
              name="alfakit::panels.widgets.account.logout-button"
              fallback={LogOutIcon}
              class="rtl:rotate-180"
              aria-hidden="true"
            />
            <span class="hidden sm:inline">{t('exit_fullscreen', {}, 'Exit')}</span>
            <span class="sr-only sm:hidden">{t('exit_fullscreen', {}, 'Exit')}</span>
          </Button>
        {/if}
      </div>
    </header>
  {:else}
    <div class="fixed end-3 bottom-3 z-40">
      <DebugPanelSlot />
    </div>
  {/if}
  <main data-slot="content" class="flex min-h-0 w-full min-w-0 flex-1 flex-col">
    <Slot name="content.start" />
    {@render children?.()}
    <Slot name="content.end" />
  </main>
  <Slot name="layout.end" />
  <Slot name="body.end" />
</div>
