import {
  PREFETCH_CACHE_FOR,
  hasMobilePreset,
  type BreadcrumbSchema,
  type NavigationGroupSchema,
  type NavigationItemSchema,
  type Width,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { ChevronDownIcon, MenuIcon } from 'lucide-react'
import { createElement, useState, type ReactNode } from 'react'
import { NotificationsMenu } from '../components/notifications/notifications-menu'
import { Brand } from '../components/panel/app-sidebar'
import { BottomNav } from '../components/panel/bottom-nav'
import { DebugPanelSlot } from '../components/panel/debug-panel-slot'
import { GlobalSearch } from '../components/panel/global-search'
import { TopbarLocaleSwitcher } from '../components/panel/locale-switcher'
import { NavLabel } from '../components/panel/nav-label'
import { Slot } from '../components/panel/slot'
import { TenantMenu } from '../components/panel/tenant-menu'
import { ThemeToggle } from '../components/panel/theme-toggle'
import { Breadcrumbs } from '../components/panel/topbar'
import { UserMenu } from '../components/panel/user-menu'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { useDirection, usePanel, useRegistry, useT } from '../context'
import { extraProps } from '../lib/attributes'
import { Icon } from '../lib/icons'
import { NewTabHint } from '../lib/new-tab-hint'
import { cn } from '../lib/utils'
import { MAX_WIDTHS } from './app-layout'

export interface TopNavLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbSchema[]
  maxContentWidth?: Width | string
}

const isActive = (item: NavigationItemSchema): boolean =>
  Boolean(item.active || item.children?.some(isActive))

function TopNavLink({ item }: { item: NavigationItemSchema }) {
  const className =
    'text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors [&_svg]:size-4'

  if (item.children && item.children.length > 0) {
    return (
      <TopNavMenu
        label={<NavLabel item={item} />}
        icon={item.icon}
        items={item.children}
        active={isActive(item)}
        attributes={item.extraAttributes}
      />
    )
  }

  return item.openInNewTab ? (
    <a
      // `NavigationItem::extraAttributes()`; `class` is merged with the link's own.
      {...extraProps(item.extraAttributes, className)}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      data-slot="topnav-link"
    >
      {item.icon && <Icon name={item.icon} />}
      <NavLabel item={item} />
      <NewTabHint />
    </a>
  ) : (
    <Link
      {...extraProps(item.extraAttributes, className)}
      href={item.url ?? '#'}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
      data-slot="topnav-link"
      data-active={item.active ? 'true' : undefined}
    >
      {item.icon && <Icon name={item.icon} />}
      <NavLabel item={item} />
    </Link>
  )
}

function TopNavMenu({
  label,
  icon,
  items,
  active,
  attributes,
}: {
  label: ReactNode
  icon?: string
  items: NavigationItemSchema[]
  active: boolean
  attributes?: NavigationItemSchema['extraAttributes']
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...extraProps(
          attributes,
          'text-muted-foreground hover:text-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-foreground data-[state=open]:text-foreground inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none [&_svg]:size-4',
        )}
        data-slot="topnav-link"
        data-active={active ? 'true' : undefined}
      >
        {icon && <Icon name={icon} />}
        {label}
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} asChild>
            <Link
              {...extraProps(item.extraAttributes, cn('w-full', item.active && 'font-medium'))}
              href={item.url ?? '#'}
            >
              {item.icon && <Icon name={item.icon} />}
              <NavLabel item={item} />
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopNavGroup({ group }: { group: NavigationGroupSchema }) {
  // `NavigationGroup::extraTopbarAttributes()` wrap the group; `class` is merged.
  if (group.extraTopbarAttributes) {
    return (
      <div
        data-slot="topnav-group"
        {...extraProps(group.extraTopbarAttributes, 'flex shrink-0 items-center gap-1')}
      >
        <TopNavGroup group={{ ...group, extraTopbarAttributes: undefined }} />
      </div>
    )
  }

  if (!group.label) {
    return (
      <>
        {group.items.map((item) => (
          <TopNavLink key={item.label} item={item} />
        ))}
      </>
    )
  }

  return (
    <TopNavMenu
      label={group.label}
      icon={group.icon}
      items={group.items}
      active={group.items.some(isActive)}
    />
  )
}

/** Vertical navigation for the mobile drawer. */
function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const panel = usePanel()

  return (
    <nav className="flex flex-col gap-4 overflow-y-auto p-4 text-sm">
      {panel.navigation.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-1">
          {group.label && (
            <p className="text-muted-foreground px-2 text-xs font-medium">{group.label}</p>
          )}
          {group.items
            .flatMap((item) => [item, ...(item.children ?? [])])
            .map((item) => (
              <Link
                key={item.label}
                href={item.url ?? '#'}
                onClick={onNavigate}
                data-active={item.active ? 'true' : undefined}
                className="hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4"
              >
                {item.icon && <Icon name={item.icon} />}
                <NavLabel item={item} />
              </Link>
            ))}
        </div>
      ))}
    </nav>
  )
}

/**
 * Navigation across the top instead of a sidebar (`layout: 'topbar'`). Ungrouped items are
 * links; labelled groups and items with children open as dropdowns.
 */
export function TopNavLayout({ children, breadcrumbs, maxContentWidth }: TopNavLayoutProps) {
  const panel = usePanel()
  const t = useT()
  const direction = useDirection()
  const registry = useRegistry()
  const [open, setOpen] = useState(false)
  const width = MAX_WIDTHS[maxContentWidth ?? panel.maxContentWidth ?? '7xl'] ?? 'max-w-7xl'
  const Bottom = registry.resolve('panel:bottom-nav') ?? BottomNav

  return (
    <div data-slot="topnav-layout" className="bg-background flex min-h-svh flex-col">
      <Slot name="body.start" />
      <Slot name="layout.start" />
      <Slot name="topbar.before" />
      <header
        data-slot="topbar"
        className="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur"
      >
        <div className={cn('mx-auto flex h-14 w-full items-center gap-3 px-4 md:px-6', width)}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t('toggle_sidebar', {}, 'Toggle sidebar')}
              >
                <Icon name="alfakit::panels.topbar.open-sidebar-button" fallback={MenuIcon} />
              </Button>
            </SheetTrigger>
            <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="w-72 p-0">
              <SheetHeader className="border-b">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <MobileNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Slot name="topbar.logo.before" />
          <Brand className="me-2 shrink-0" />
          <Slot name="topbar.logo.after" />
          {panel.tenancy?.current && <Slot name="tenant-menu.before" />}
          <TenantMenu variant="topbar" />
          {panel.tenancy?.current && <Slot name="tenant-menu.after" />}
          <nav
            data-slot="topnav"
            aria-label={t('navigation', {}, 'Navigation')}
            className="hidden min-w-0 flex-1 items-center gap-1 self-stretch overflow-x-auto md:flex"
          >
            {panel.navigation.map((group, index) => (
              <TopNavGroup key={group.label ?? `group-${index}`} group={group} />
            ))}
          </nav>
          <Slot name="topbar.start" />
          <div className="ms-auto flex shrink-0 items-center gap-1">
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
        className={cn('mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6', width)}
      >
        {panel.breadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        <Slot name="content.start" />
        {children}
        <Slot name="content.end" />
      </main>
      <Slot name="content.after" />
      <Slot name="footer" />
      {hasMobilePreset(panel) && createElement(Bottom)}
      <Slot name="layout.end" />
      <Slot name="body.end" />
    </div>
  )
}
