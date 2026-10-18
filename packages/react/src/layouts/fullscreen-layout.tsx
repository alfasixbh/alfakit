import type { PageSchema } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { LogOutIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { NotificationsMenu } from '../components/notifications/notifications-menu'
import { Brand } from '../components/panel/app-sidebar'
import { DebugPanelSlot } from '../components/panel/debug-panel-slot'
import { TopbarLocaleSwitcher } from '../components/panel/locale-switcher'
import { Slot } from '../components/panel/slot'
import { ThemeToggle } from '../components/panel/theme-toggle'
import { UserMenu } from '../components/panel/user-menu'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { useT } from '../context'
import { Icon } from '../lib/icons'

export interface FullscreenLayoutProps {
  children: ReactNode
  page?: PageSchema
}

/**
 * `$layout = 'fullscreen'`: the whole viewport for an app screen (point of sale, kiosk,
 * board). No sidebar or topbar; an optional slim header keeps the brand, the page title,
 * notifications, the user menu and a way back to the panel. Toasts, modals and the debug
 * panel work as on every other page. Replace it with `components: { 'layout:fullscreen': … }`.
 */
export function FullscreenLayout({ children, page }: FullscreenLayoutProps) {
  const t = useT()
  const header = page?.fullscreen?.header !== false
  const exitUrl = page?.fullscreen?.exitUrl

  return (
    <div data-layout="fullscreen" className="bg-background flex h-svh min-h-0 flex-col">
      <Slot name="body.start" />
      <Slot name="layout.start" />
      {header ? (
        <header
          data-slot="topbar"
          data-variant="fullscreen"
          className="bg-background flex h-12 shrink-0 items-center gap-3 border-b px-3 md:px-4"
        >
          <Slot name="topbar.logo.before" />
          <Brand className="hidden shrink-0 sm:flex" />
          <Slot name="topbar.logo.after" />
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <h1 className="min-w-0 truncate text-sm font-semibold">{page?.heading ?? page?.title}</h1>
          <Slot name="topbar.start" />
          <div className="ms-auto flex shrink-0 items-center gap-1">
            <Slot name="topbar.end" />
            <NotificationsMenu />
            <TopbarLocaleSwitcher />
            <ThemeToggle />
            <DebugPanelSlot />
            <UserMenu variant="topbar" />
            {exitUrl && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={exitUrl} data-slot="fullscreen-exit">
                  <Icon
                    name="alfakit::panels.widgets.account.logout-button"
                    fallback={LogOutIcon}
                    className="rtl:rotate-180"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">{t('exit_fullscreen', {}, 'Exit')}</span>
                  <span className="sr-only sm:hidden">{t('exit_fullscreen', {}, 'Exit')}</span>
                </Link>
              </Button>
            )}
          </div>
        </header>
      ) : (
        <div className="fixed end-3 bottom-3 z-40">
          <DebugPanelSlot />
        </div>
      )}
      <main data-slot="content" className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <Slot name="content.start" />
        {children}
        <Slot name="content.end" />
      </main>
      <Slot name="layout.end" />
      <Slot name="body.end" />
    </div>
  )
}
