<script lang="ts">
  import NavLabel from './NavLabel.svelte'
  import { filterTenants, initials, tenantNameText } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import SearchIcon from '@lucide/svelte/icons/search'
  import SettingsIcon from '@lucide/svelte/icons/settings'
  import { usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { SidebarMenuButton } from '../ui/sidebar'
  import MenuItemEntries from './MenuItemEntries.svelte'
  import MenuItemEntry from './MenuItemEntry.svelte'

  /**
   * The tenant switcher: a sidebar header button, or a compact button in the top bar of the
   * `topbar` layout (`variant="topbar"`), where the store name shows from `lg` up.
   */
  let { variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' } = $props()

  const t = useT()
  const panel = $derived(usePanel())
  const tenancy = $derived(panel.tenancy)
  const current = $derived(tenancy?.current)
  let search = $state('')
  // `tenantSwitcher(false)` sends no tenants; `searchableTenantMenu()` adds a search field.
  const hasSwitcher = $derived(tenancy?.switcher !== false && (tenancy?.tenants.length ?? 0) > 0)
  const tenants = $derived(
    tenancy?.searchable ? filterTenants(tenancy.tenants, search) : (tenancy?.tenants ?? []),
  )
</script>

{#if tenancy && current}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        {#if variant === 'topbar'}
          <button
            type="button"
            class="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
            {...props}
            data-slot="tenant-menu"
          >
            <Avatar class="size-6 rounded-md">
              {#if current.avatar}<AvatarImage src={current.avatar} alt="" />{/if}
              <AvatarFallback class="rounded-md text-[10px]"
                >{initials(tenantNameText(current))}</AvatarFallback
              >
            </Avatar>
            <span
              class="sr-only min-w-0 truncate lg:not-sr-only lg:grid lg:text-start lg:leading-tight"
            >
              {#if current.label}<span
                  data-slot="tenant-menu-label"
                  class="text-muted-foreground text-[10px]">{current.label}</span
                >{/if}
              <NavLabel class="truncate" text={current.name} html={current.nameHtml} />
            </span>
            <Icon
              name="alfakit::panels.tenant-menu.toggle-button"
              fallback={ChevronsUpDownIcon}
              class="text-muted-foreground size-4 shrink-0"
            />
          </button>
        {:else}
          <SidebarMenuButton size="lg" class="data-[state=open]:bg-sidebar-accent" {...props}>
            <Avatar class="size-8 rounded-lg">
              {#if current.avatar}<AvatarImage
                  src={current.avatar}
                  alt={tenantNameText(current)}
                />{/if}
              <AvatarFallback class="rounded-lg">{initials(tenantNameText(current))}</AvatarFallback
              >
            </Avatar>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <!-- `HasCurrentTenantLabel`: a caption above the name instead of the brand. -->
              {#if current.label}<span
                  data-slot="tenant-menu-label"
                  class="text-muted-foreground truncate text-xs">{current.label}</span
                >{/if}
              <NavLabel class="truncate font-medium" text={current.name} html={current.nameHtml} />
              {#if !current.label}<span class="text-muted-foreground truncate text-xs"
                  >{panel.brandName}</span
                >{/if}
            </div>
            <Icon
              name="alfakit::panels.tenant-menu.toggle-button"
              fallback={ChevronsUpDownIcon}
              class="ms-auto size-4"
            />
          </SidebarMenuButton>
        {/if}
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent class="min-w-56 rounded-lg" side="bottom" align="start" sideOffset={4}>
      {#if hasSwitcher}
        <DropdownMenuLabel class="text-muted-foreground text-xs"
          >{t('tenancy.switch', {}, 'Switch')}</DropdownMenuLabel
        >
      {/if}
      {#if hasSwitcher && tenancy.searchable}
        <div data-slot="tenant-menu-search" class="relative px-1 pb-1">
          <SearchIcon
            class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <!-- Keep the menu's type-ahead from taking the keys. -->
          <input
            type="search"
            bind:value={search}
            placeholder={t('tenancy.search', {}, 'Search')}
            aria-label={t('tenancy.search', {}, 'Search')}
            class="border-input focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent ps-7 pe-2 text-sm outline-none focus-visible:ring-[3px]"
            onkeydown={(event) => event.stopPropagation()}
          />
        </div>
        {#if tenants.length === 0}
          <p class="text-muted-foreground px-2 py-1.5 text-sm">
            {t('no_results', {}, 'No results.')}
          </p>
        {/if}
      {/if}
      {#each tenants as tenant (String(tenant.id))}
        <DropdownMenuItem onSelect={() => router.visit(tenant.url)}>
          <Avatar class="size-6 rounded-sm">
            {#if tenant.avatar}<AvatarImage src={tenant.avatar} alt={tenantNameText(tenant)} />{/if}
            <AvatarFallback class="rounded-sm text-[10px]"
              >{initials(tenantNameText(tenant))}</AvatarFallback
            >
          </Avatar>
          <NavLabel class="flex-1 truncate" text={tenant.name} html={tenant.nameHtml} />
          {#if String(tenant.id) === String(current.id)}<CheckIcon class="size-4" />{/if}
        </DropdownMenuItem>
      {/each}
      {#if hasSwitcher && (tenancy.registrationUrl || tenancy.profileUrl || tenancy.menu?.length)}<DropdownMenuSeparator
        />{/if}
      {#if tenancy.profile}
        <MenuItemEntry item={tenancy.profile} menu="tenantMenu" />
      {:else if tenancy.profileUrl}
        <DropdownMenuItem onSelect={() => router.visit(tenancy.profileUrl ?? '/')}
          ><Icon name="alfakit::panels.tenant-menu.profile-button" fallback={SettingsIcon} />
          {tenancy.profileLabel ?? t('tenancy.profile', {}, 'Settings')}</DropdownMenuItem
        >
      {/if}
      {#if tenancy.menu}<MenuItemEntries items={tenancy.menu} menu="tenantMenu" />{/if}
      {#if tenancy.registration}
        <MenuItemEntry item={tenancy.registration} menu="tenantMenu" />
      {:else if tenancy.registrationUrl}
        <DropdownMenuItem onSelect={() => router.visit(tenancy.registrationUrl ?? '/')}
          ><Icon name="alfakit::panels.tenant-menu.registration-button" fallback={PlusIcon} />
          {tenancy.registrationLabel ?? t('tenancy.register', {}, 'New')}</DropdownMenuItem
        >
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
