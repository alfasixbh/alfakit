<script lang="ts">
  import { uniqueKey, navigationKey } from '../lib/keys'
  import {
    PREFETCH_CACHE_FOR,
    hasMobilePreset,
    type BreadcrumbSchema,
    type NavigationItemSchema,
    type Width,
  } from '@alfakit/core'
  import { Link, router } from '@inertiajs/svelte'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import MenuIcon from '@lucide/svelte/icons/menu'
  import type { Snippet } from 'svelte'
  import NotificationsMenu from '../components/notifications/NotificationsMenu.svelte'
  import BottomNav from '../components/panel/BottomNav.svelte'
  import Brand from '../components/panel/Brand.svelte'
  import TenantMenu from '../components/panel/TenantMenu.svelte'
  import Breadcrumbs from '../components/panel/Breadcrumbs.svelte'
  import GlobalSearch from '../components/panel/GlobalSearch.svelte'
  import NavLabel from '../components/panel/NavLabel.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import DebugPanelSlot from '../components/panel/DebugPanelSlot.svelte'
  import ThemeToggle from '../components/panel/ThemeToggle.svelte'
  import TopbarLocaleSwitcher from '../components/panel/TopbarLocaleSwitcher.svelte'
  import UserMenu from '../components/panel/UserMenu.svelte'
  import { Button } from '../components/ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '../components/ui/dropdown-menu'
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
  } from '../components/ui/sheet'
  import { useDirection, usePanel, useRegistry, useT } from '../context.svelte'
  import Icon from '../lib/Icon.svelte'
  import { extraProps } from '../lib/attributes'
  import { cn } from '../lib/utils'
  import { MAX_WIDTHS } from './max-widths'
  import NewTabHint from '../lib/NewTabHint.svelte'

  /**
   * Navigation across the top instead of a sidebar (`layout: 'topbar'`). Ungrouped items are
   * links; labelled groups and items with children open as dropdowns.
   */
  let {
    breadcrumbs,
    maxContentWidth,
    children,
  }: { breadcrumbs?: BreadcrumbSchema[]; maxContentWidth?: Width | string; children?: Snippet } =
    $props()

  const t = useT()
  const panel = $derived(usePanel())
  const direction = $derived(useDirection())
  const registry = useRegistry()
  const Bottom = $derived(registry.resolve('panel:bottom-nav') ?? BottomNav)
  const mobilePreset = $derived(hasMobilePreset(panel))
  const width = $derived(
    MAX_WIDTHS[maxContentWidth ?? panel.maxContentWidth ?? '7xl'] ?? 'max-w-7xl',
  )

  let open = $state(false)

  const isActive = (item: NavigationItemSchema): boolean =>
    Boolean(item.active || item.children?.some(isActive))

  const linkClass =
    'text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors [&_svg]:size-4'
</script>

{#snippet menu(
  label: string,
  icon: string | undefined,
  items: NavigationItemSchema[],
  active: boolean,
  parent?: NavigationItemSchema,
)}
  <DropdownMenu>
    <DropdownMenuTrigger
      {...extraProps(
        parent?.extraAttributes,
        'text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground data-[state=open]:text-foreground inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none [&_svg]:size-4',
      )}
      data-slot="topnav-link"
      data-active={active ? 'true' : undefined}
    >
      {#if icon}<Icon name={icon} />{/if}
      <NavLabel text={label} html={parent?.labelHtml} />
      <ChevronDownIcon class="opacity-60" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="min-w-48">
      {#each items as item, itemIndex (uniqueKey(items, itemIndex, navigationKey))}
        <DropdownMenuItem
          {...extraProps(item.extraAttributes, cn('w-full', item.active && 'font-medium'))}
          onSelect={() =>
            item.openInNewTab
              ? window.open(item.url ?? '#', '_blank', 'noopener')
              : router.visit(item.url ?? '#')}
        >
          {#if item.icon}<Icon name={item.icon} />{/if}
          <NavLabel text={item.label} html={item.labelHtml} />
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
{/snippet}

{#snippet link(item: NavigationItemSchema)}
  {#if item.children && item.children.length > 0}
    {@render menu(item.label, item.icon, item.children, isActive(item), item)}
  {:else if item.openInNewTab}
    <a
      {...extraProps(item.extraAttributes, linkClass)}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      data-slot="topnav-link"
    >
      {#if item.icon}<Icon name={item.icon} />{/if}
      <NavLabel text={item.label} html={item.labelHtml} />
      <NewTabHint />
    </a>
  {:else}
    <Link
      {...extraProps(item.extraAttributes, linkClass)}
      href={item.url ?? '#'}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
      data-slot="topnav-link"
      data-active={item.active ? 'true' : undefined}
    >
      {#if item.icon}<Icon name={item.icon} />{/if}
      <NavLabel text={item.label} html={item.labelHtml} />
    </Link>
  {/if}
{/snippet}

<div data-slot="topnav-layout" class="bg-background flex min-h-svh flex-col">
  <Slot name="body.start" />
  <Slot name="layout.start" />
  <Slot name="topbar.before" />
  <header
    data-slot="topbar"
    class="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur"
  >
    <div class={cn('mx-auto flex h-14 w-full items-center gap-3 px-4 md:px-6', width)}>
      <Sheet bind:open>
        <SheetTrigger>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="md:hidden"
              aria-label={t('toggle_sidebar', {}, 'Toggle sidebar')}
              {...props}
            >
              <Icon name="alfakit::panels.topbar.open-sidebar-button" fallback={MenuIcon} />
            </Button>
          {/snippet}
        </SheetTrigger>
        <SheetContent side={direction === 'rtl' ? 'right' : 'left'} class="w-72 p-0">
          <SheetHeader class="border-b">
            <SheetTitle>
              {#snippet child({ props })}
                <div {...props}><Brand /></div>
              {/snippet}
            </SheetTitle>
          </SheetHeader>
          <!-- Vertical navigation for the mobile drawer. -->
          <nav class="flex flex-col gap-4 overflow-y-auto p-4 text-sm">
            {#each panel.navigation as group, index (uniqueKey(panel.navigation, index, (item) => item.label ?? ''))}
              {@const flatItems = group.items.flatMap((item) => [item, ...(item.children ?? [])])}
              <div class="flex flex-col gap-1">
                {#if group.label}
                  <p class="text-muted-foreground px-2 text-xs font-medium">{group.label}</p>
                {/if}
                {#each flatItems as item, itemIndex (uniqueKey(flatItems, itemIndex, navigationKey))}
                  <Link
                    href={item.url ?? '#'}
                    onclick={() => (open = false)}
                    data-active={item.active ? 'true' : undefined}
                    class="hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4"
                  >
                    {#if item.icon}<Icon name={item.icon} />{/if}
                    <NavLabel text={item.label} html={item.labelHtml} />
                  </Link>
                {/each}
              </div>
            {/each}
          </nav>
        </SheetContent>
      </Sheet>
      <Slot name="topbar.logo.before" />
      <Brand class="me-2 shrink-0" />
      <Slot name="topbar.logo.after" />
      {#if panel.tenancy?.current}<Slot name="tenant-menu.before" />{/if}
      <TenantMenu variant="topbar" />
      {#if panel.tenancy?.current}<Slot name="tenant-menu.after" />{/if}
      <nav
        data-slot="topnav"
        aria-label={t('navigation', {}, 'Navigation')}
        class="hidden min-w-0 flex-1 items-center gap-1 self-stretch overflow-x-auto md:flex"
      >
        {#each panel.navigation as group, index (uniqueKey(panel.navigation, index, (item) => item.label ?? ''))}
          {#snippet entries()}
            {#if group.label}
              {@render menu(group.label, group.icon, group.items, group.items.some(isActive))}
            {:else}
              {#each group.items as item, itemIndex (uniqueKey(group.items, itemIndex, navigationKey))}
                {@render link(item)}
              {/each}
            {/if}
          {/snippet}
          <!-- `NavigationGroup::extraTopbarAttributes()` wrap the group; `class` is merged. -->
          {#if group.extraTopbarAttributes}
            <div
              data-slot="topnav-group"
              {...extraProps(group.extraTopbarAttributes, 'flex shrink-0 items-center gap-1')}
            >
              {@render entries()}
            </div>
          {:else}
            {@render entries()}
          {/if}
        {/each}
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
    class={cn('mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6', width)}
  >
    {#if panel.breadcrumbs && breadcrumbs && breadcrumbs.length > 0}
      <Breadcrumbs items={breadcrumbs} />
    {/if}
    <Slot name="content.start" />
    {@render children?.()}
    <Slot name="content.end" />
  </main>
  <Slot name="content.after" />
  <Slot name="footer" />
  {#if mobilePreset}<Bottom />{/if}
  <Slot name="layout.end" />
  <Slot name="body.end" />
</div>
