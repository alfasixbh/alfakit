import { filterTenants, initials, tenantNameText } from '@alfakit/core'
import { Link, router } from '@inertiajs/react'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SearchIcon, SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
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
import { MenuItemEntries, MenuItemEntry } from './menu-item'
import { TenantName } from './nav-label'

/**
 * The tenant switcher: a sidebar header button, or a compact button in the top bar of the
 * `topbar` layout (`variant="topbar"`), where the store name shows from `lg` up.
 */
export function TenantMenu({ variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' }) {
  const t = useT()
  const { tenancy, brandName } = usePanel()
  const [search, setSearch] = useState('')

  if (!tenancy || !tenancy.current) {
    return null
  }

  const current = tenancy.current
  // `tenantSwitcher(false)` sends no tenants; `searchableTenantMenu()` adds a search field.
  const tenants = tenancy.searchable ? filterTenants(tenancy.tenants, search) : tenancy.tenants
  const hasSwitcher = tenancy.switcher !== false && tenancy.tenants.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'topbar' ? (
          <button
            type="button"
            data-slot="tenant-menu"
            className="hover:bg-accent data-[state=open]:bg-accent inline-flex h-9 max-w-60 shrink-0 items-center gap-2 rounded-md px-2 text-sm font-medium"
          >
            <Avatar className="size-6 rounded-md">
              {current.avatar && <AvatarImage src={current.avatar} alt="" />}
              <AvatarFallback className="rounded-md text-[10px]">
                {initials(tenantNameText(current))}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only min-w-0 truncate lg:not-sr-only lg:grid lg:text-start lg:leading-tight">
              {current.label && (
                <span data-slot="tenant-menu-label" className="text-muted-foreground text-[10px]">
                  {current.label}{' '}
                </span>
              )}
              <TenantName tenant={current} className="truncate" />
            </span>
            <Icon
              name="alfakit::panels.tenant-menu.toggle-button"
              fallback={ChevronsUpDownIcon}
              className="text-muted-foreground size-4 shrink-0"
            />
          </button>
        ) : (
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
            <Avatar className="size-8 rounded-lg">
              {current.avatar && <AvatarImage src={current.avatar} alt={tenantNameText(current)} />}
              <AvatarFallback className="rounded-lg">
                {initials(tenantNameText(current))}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              {/* `HasCurrentTenantLabel`: a caption above the name instead of the brand. */}
              {current.label && (
                <span
                  data-slot="tenant-menu-label"
                  className="text-muted-foreground truncate text-xs"
                >
                  {current.label}
                </span>
              )}
              <TenantName tenant={current} className="truncate font-medium" />
              {!current.label && (
                <span className="text-muted-foreground truncate text-xs">{brandName}</span>
              )}
            </div>
            <Icon
              name="alfakit::panels.tenant-menu.toggle-button"
              fallback={ChevronsUpDownIcon}
              className="ms-auto size-4"
            />
          </SidebarMenuButton>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        {hasSwitcher && (
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {t('tenancy.switch', {}, 'Switch')}
          </DropdownMenuLabel>
        )}
        {hasSwitcher && tenancy.searchable && (
          <div data-slot="tenant-menu-search" className="relative px-1 pb-1">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              // Keep the menu's type-ahead from taking the keys.
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={t('tenancy.search', {}, 'Search')}
              aria-label={t('tenancy.search', {}, 'Search')}
              className="border-input focus-visible:ring-ring/50 h-8 w-full rounded-md border bg-transparent ps-7 pe-2 text-sm outline-none focus-visible:ring-[3px]"
            />
          </div>
        )}
        {hasSwitcher && tenancy.searchable && tenants.length === 0 && (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">
            {t('no_results', {}, 'No results.')}
          </p>
        )}
        {tenants.map((tenant) => (
          <DropdownMenuItem key={String(tenant.id)} onSelect={() => router.visit(tenant.url)}>
            <Avatar className="size-6 rounded-sm">
              {tenant.avatar && <AvatarImage src={tenant.avatar} alt={tenantNameText(tenant)} />}
              <AvatarFallback className="rounded-sm text-[10px]">
                {initials(tenantNameText(tenant))}
              </AvatarFallback>
            </Avatar>
            <TenantName tenant={tenant} className="flex-1 truncate" />
            {String(tenant.id) === String(current.id) && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
        {hasSwitcher && (tenancy.registrationUrl || tenancy.profileUrl || tenancy.menu?.length) && (
          <DropdownMenuSeparator />
        )}
        {tenancy.profile ? (
          <MenuItemEntry item={tenancy.profile} menu="tenantMenu" />
        ) : (
          tenancy.profileUrl && (
            <DropdownMenuItem asChild>
              <Link href={tenancy.profileUrl} className="w-full">
                <Icon name="alfakit::panels.tenant-menu.profile-button" fallback={SettingsIcon} />{' '}
                {tenancy.profileLabel ?? t('tenancy.profile', {}, 'Settings')}
              </Link>
            </DropdownMenuItem>
          )
        )}
        {tenancy.menu && <MenuItemEntries items={tenancy.menu} menu="tenantMenu" />}
        {tenancy.registration ? (
          <MenuItemEntry item={tenancy.registration} menu="tenantMenu" />
        ) : (
          tenancy.registrationUrl && (
            <DropdownMenuItem asChild>
              <Link href={tenancy.registrationUrl} className="w-full">
                <Icon name="alfakit::panels.tenant-menu.registration-button" fallback={PlusIcon} />{' '}
                {tenancy.registrationLabel ?? t('tenancy.register', {}, 'New')}
              </Link>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
