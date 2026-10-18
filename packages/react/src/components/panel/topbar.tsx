import type { BreadcrumbSchema } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { Fragment } from 'react'
import { usePanel, useT } from '../../context'
import { NotificationsMenu } from '../notifications/notifications-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb'
import { Separator } from '../ui/separator'
import { SidebarTrigger } from '../ui/sidebar'
import { DebugPanelSlot } from './debug-panel-slot'
import { GlobalSearch } from './global-search'
import { TopbarLocaleSwitcher } from './locale-switcher'
import { Slot } from './slot'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function Breadcrumbs({ items }: { items: BreadcrumbSchema[] }) {
  const t = useT()

  if (items.length === 0) return null

  return (
    <Breadcrumb className="min-w-0" aria-label={t('breadcrumbs', {}, 'Breadcrumb')}>
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => {
          const last = index === items.length - 1

          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem className={!last ? 'hidden md:inline-flex' : 'min-w-0'}>
                {last || !item.url ? (
                  <BreadcrumbPage className="block truncate">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.url}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator className={'hidden md:block'} />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function Topbar({ breadcrumbs }: { breadcrumbs?: BreadcrumbSchema[] }) {
  const panel = usePanel()

  return (
    <header
      data-slot="topbar"
      className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 min-w-0 shrink-0 items-center gap-2 border-b px-4 backdrop-blur"
    >
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="me-2 h-4" />
      {panel.breadcrumbs && breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <Slot name="topbar.start" />
      <div className="ms-auto flex items-center gap-1">
        <Slot name="topbar.end" />
        {/* `globalSearch(position: Sidebar)` moves the field to the sidebar header. */}
        {(panel.topNavigation || panel.globalSearch?.position !== 'sidebar') && <GlobalSearch />}
        {panel.databaseNotifications?.position !== 'sidebar' && <NotificationsMenu />}
        <TopbarLocaleSwitcher />
        <ThemeToggle />
        <DebugPanelSlot />
        {/* `userMenu(position: Topbar)` moves the menu out of the sidebar footer. */}
        {(panel.topNavigation || panel.userMenu?.position === 'topbar') && (
          <UserMenu variant="topbar" />
        )}
      </div>
    </header>
  )
}
