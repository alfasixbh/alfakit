<script lang="ts">
  import { TOPBAR_END_SLOT_CLASS, type BreadcrumbSchema } from '@alfakit/core'
  import { usePanel } from '../../context.svelte'
  import NotificationsMenu from '../notifications/NotificationsMenu.svelte'
  import { Separator } from '../ui/separator'
  import { SidebarTrigger } from '../ui/sidebar'
  import Breadcrumbs from './Breadcrumbs.svelte'
  import DebugPanelSlot from './DebugPanelSlot.svelte'
  import GlobalSearch from './GlobalSearch.svelte'
  import Slot from './Slot.svelte'
  import ThemeToggle from './ThemeToggle.svelte'
  import TopbarLocaleSwitcher from './TopbarLocaleSwitcher.svelte'
  import UserMenu from './UserMenu.svelte'

  let { breadcrumbs }: { breadcrumbs?: BreadcrumbSchema[] } = $props()

  const panel = $derived(usePanel())
</script>

<!-- `@container/topbar`: the search field folds into an icon button when the bar is narrow.
     `overflow-x-clip`: whatever apps add to the bar never makes the page scroll sideways. -->
<header
  data-slot="topbar"
  class="bg-background/80 supports-[backdrop-filter]:bg-background/60 @container/topbar sticky top-0 z-20 flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-x-clip border-b px-4 backdrop-blur"
>
  <SidebarTrigger class="-ms-1" />
  <Separator orientation="vertical" class="me-2 h-4" />
  {#if panel.breadcrumbs && breadcrumbs}<Breadcrumbs items={breadcrumbs} />{/if}
  <Slot name="topbar.start" />
  <div class="ms-auto flex min-w-0 items-center gap-1">
    <Slot name="topbar.end" class={TOPBAR_END_SLOT_CLASS} />
    <!-- `globalSearch(position: Sidebar)` moves the field to the sidebar header. -->
    {#if panel.topNavigation || panel.globalSearch?.position !== 'sidebar'}<GlobalSearch />{/if}
    {#if panel.databaseNotifications?.position !== 'sidebar'}<NotificationsMenu />{/if}
    <TopbarLocaleSwitcher />
    <ThemeToggle />
    <DebugPanelSlot />
    <!-- `userMenu(position: Topbar)` moves the menu out of the sidebar footer. -->
    {#if panel.topNavigation || panel.userMenu?.position === 'topbar'}<UserMenu
        variant="topbar"
      />{/if}
  </div>
</header>
