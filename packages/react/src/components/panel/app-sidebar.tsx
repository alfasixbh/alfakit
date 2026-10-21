import {
  PREFETCH_CACHE_FOR,
  flattenNavigationItems,
  hasActiveNavigationItem,
  navigationItemText,
  type NavigationGroupSchema,
  type NavigationItemSchema,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { ChevronRightIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useDirection, usePanel, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { NotificationsMenu } from '../notifications/notifications-menu'
import { Badge } from '../ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '../ui/sidebar'
import { Brand } from './brand'
import { GlobalSearch } from './global-search'
import { NavLabel } from './nav-label'
import { Slot } from './slot'
import { TenantMenu } from './tenant-menu'
import { UserMenu } from './user-menu'

export { Brand } from './brand'

function NavBadge({ item }: { item: NavigationItemSchema }) {
  const t = useT()

  // `deferNavigationBadges()`: a placeholder until the deferred badges arrive.
  if (item.badgePending) {
    return (
      <span
        data-slot="badge"
        aria-busy="true"
        aria-label={t('loading', {}, 'Loading')}
        className="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
      />
    )
  }

  if (item.badge === undefined || item.badge === null) return null

  return (
    <Badge
      variant="outline"
      className={cn('ms-auto px-1.5 py-0', colorClass(badgeColorClasses, item.badgeColor, 'gray'))}
      title={item.badgeTooltip}
    >
      {item.badge}
    </Badge>
  )
}

/**
 * A navigation link: an Inertia link, or a plain anchor for `openUrlInNewTab()`. Used as an
 * `asChild` target, so it must pass on the classes, data attributes and handlers it receives.
 */
function NavLink({
  item,
  children,
  ...props
}: { item: NavigationItemSchema; children: ReactNode } & Omit<
  ComponentProps<'a'>,
  'href' | 'children'
>) {
  // `NavigationItem::extraAttributes()`; `class` is merged with the link's own.
  const attributes = {
    ...props,
    ...extraProps(item.extraAttributes, props.className),
  } as ComponentProps<'a'>

  return item.openInNewTab ? (
    <a {...attributes} href={item.url} target="_blank" rel="noopener noreferrer">
      {children}
      <NewTabHint />
    </a>
  ) : (
    // Slot passes DOM props; Inertia's Link redefines a few event names, so pass them through untyped.
    <Link
      {...(attributes as Record<string, unknown>)}
      href={item.url ?? '#'}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
    >
      {children}
    </Link>
  )
}

/** Child items (any depth) with their own badges, new-tab links and nested children. */
function NavSubItem({ item }: { item: NavigationItemSchema }) {
  if (item.children && item.children.length > 0) {
    return (
      <SidebarMenuSubItem>
        <Collapsible defaultOpen={item.active} className="group/nav-sub">
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton asChild isActive={item.active}>
              <button type="button" {...extraProps(item.extraAttributes, 'w-full')}>
                {item.icon && <Icon name={item.icon} />}
                <NavLabel item={item} />
                <NavBadge item={item} />
                <ChevronRightIcon className="ms-auto transition-transform duration-200 group-data-[state=open]/nav-sub:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nav-sub:rotate-90" />
              </button>
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <NavSubItem key={child.label} item={child} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={item.active}>
        <NavLink item={item}>
          {item.icon && <Icon name={item.icon} />}
          <NavLabel item={item} />
          <NavBadge item={item} />
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function NavItem({ item }: { item: NavigationItemSchema }) {
  if (item.children && item.children.length > 0) {
    return (
      <Collapsible asChild defaultOpen={item.active} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={navigationItemText(item)}
              isActive={item.active}
              {...extraProps(item.extraAttributes)}
            >
              {item.icon && <Icon name={item.icon} />}
              <NavLabel item={item} />
              <NavBadge item={item} />
              <ChevronRightIcon className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <NavSubItem key={child.label} item={child} />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={item.active} tooltip={navigationItemText(item)}>
        <NavLink item={item}>
          {item.icon && <Icon name={item.icon} />}
          <NavLabel item={item} />
          <NavBadge item={item} />
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** A group's items in its flyout menu, children indented under their parent. */
function FlyoutItems({ items }: { items: NavigationItemSchema[] }) {
  return flattenNavigationItems(items).map(({ item, depth }, index) => (
    <DropdownMenuItem
      key={`${depth}-${item.label}-${index}`}
      asChild
      data-active={item.active ? 'true' : undefined}
    >
      <NavLink
        item={item}
        aria-current={item.active ? 'page' : undefined}
        className={cn(
          'data-[active=true]:bg-accent data-[active=true]:font-medium',
          depth === 1 && 'ps-6',
          depth > 1 && 'ps-9',
        )}
      >
        {item.icon && <Icon name={item.icon} />}
        <NavLabel item={item} className="truncate" />
        <NavBadge item={item} />
      </NavLink>
    </DropdownMenuItem>
  ))
}

/**
 * In the icon-only (collapsed) sidebar, a group with an icon is one button that opens its
 * items in a flyout menu, like Filament. Hidden while the sidebar is expanded.
 */
function NavGroupFlyout({ group }: { group: NavigationGroupSchema }) {
  const direction = useDirection()
  const active = hasActiveNavigationItem(group.items)

  return (
    <SidebarMenu className="hidden group-data-[collapsible=icon]:flex" data-nav-flyout="">
      <SidebarMenuItem>
        <DropdownMenu dir={direction}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={active}>
              <Icon name={group.icon!} />
              <span>{group.label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={direction === 'rtl' ? 'left' : 'right'}
            align="start"
            className="min-w-56"
          >
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            <FlyoutItems items={group.items} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavGroup({ group }: { group: NavigationGroupSchema }) {
  // `NavigationGroup::extraSidebarAttributes()`; `class` is merged with the group's own.
  const attributes = extraProps(group.extraSidebarAttributes)
  // A labelled group with an icon collapses into a flyout in the icon-only sidebar.
  const flyout = Boolean(group.label && group.icon)
  const content = (
    <SidebarGroupContent className={cn(flyout && 'group-data-[collapsible=icon]:hidden')}>
      <SidebarMenu>
        {group.items.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  )
  const flyoutMenu = flyout ? <NavGroupFlyout group={group} /> : null

  if (!group.label) {
    return <SidebarGroup {...attributes}>{content}</SidebarGroup>
  }

  if (!group.collapsible) {
    return (
      <SidebarGroup {...attributes}>
        <SidebarGroupLabel>
          {group.icon && <Icon name={group.icon} className="me-1.5" />}
          {group.label}
        </SidebarGroupLabel>
        {content}
        {flyoutMenu}
      </SidebarGroup>
    )
  }

  return (
    <Collapsible
      defaultOpen={!group.collapsed || group.items.some((item) => item.active)}
      className="group/nav-group"
    >
      <SidebarGroup {...attributes}>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            asChild
            className="hover:bg-sidebar-accent w-full cursor-pointer justify-between"
          >
            <button type="button">
              <span className="flex items-center gap-1.5">
                {group.icon && <Icon name={group.icon} />}
                {group.label}
              </span>
              <Icon
                name="alfakit::panels.sidebar.group.collapse-button"
                fallback={ChevronRightIcon}
                className="size-3.5 transition-transform group-data-[state=open]/nav-group:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]/nav-group:rotate-90"
              />
            </button>
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>{content}</CollapsibleContent>
        {flyoutMenu}
      </SidebarGroup>
    </Collapsible>
  )
}

export function AppSidebar() {
  const panel = usePanel()
  const direction = useDirection()
  const t = useT()

  return (
    <Sidebar
      side={direction === 'rtl' ? 'right' : 'left'}
      collapsible={
        panel.theme?.design?.layout === 'rail'
          ? 'icon'
          : panel.sidebarFullyCollapsibleOnDesktop
            ? 'offcanvas'
            : panel.sidebarCollapsibleOnDesktop
              ? 'icon'
              : 'none'
      }
      variant={panel.theme?.sidebar === 'flush' ? 'sidebar' : (panel.theme?.sidebar ?? 'inset')}
    >
      <SidebarHeader>
        <Slot name="sidebar.start" />
        <Slot name="sidebar.logo.before" />
        <SidebarMenu>
          <SidebarMenuItem>
            {panel.tenancy?.current ? (
              <>
                <Slot name="tenant-menu.before" />
                <TenantMenu />
                <Slot name="tenant-menu.after" />
              </>
            ) : (
              <SidebarMenuButton size="lg" asChild>
                <div>
                  <Brand />
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <Slot name="sidebar.logo.after" />
        {/* `databaseNotifications(position: 'sidebar')` or `topbar(false)`. */}
        {panel.databaseNotifications?.position === 'sidebar' && (
          <SidebarMenu>
            <SidebarMenuItem>
              <NotificationsMenu variant="sidebar" />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {/* `globalSearch(position: GlobalSearchPosition::Sidebar)` or `topbar(false)`. */}
        {panel.globalSearch?.position === 'sidebar' && (
          <SidebarMenu>
            <SidebarMenuItem>
              <GlobalSearch variant="sidebar" />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <Slot name="sidebar.header" />
      </SidebarHeader>
      <SidebarContent>
        <Slot name="sidebar.nav.start" />
        <nav aria-label={t('sidebar', {}, 'Sidebar')} className="contents">
          {panel.navigation.map((group, index) => (
            <NavGroup key={group.label ?? `group-${index}`} group={group} />
          ))}
        </nav>
        <Slot name="sidebar.nav.end" />
      </SidebarContent>
      <SidebarFooter>
        <Slot name="sidebar.footer" />
        {/* `userMenu(position: UserMenuPosition::Topbar)` shows it in the top bar instead. */}
        {panel.userMenu?.position !== 'topbar' && (
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <Slot name="sidebar.end" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
