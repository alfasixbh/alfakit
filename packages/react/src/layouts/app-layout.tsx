import {
  hasMobilePreset,
  hasTopbar,
  sidebarDefaultOpen,
  sidebarWidthStyle,
  type BreadcrumbSchema,
  type Width,
} from '@alfakit/core'
import { createElement, type CSSProperties, type ReactNode } from 'react'
import { AppSidebar } from '../components/panel/app-sidebar'
import { BottomNav } from '../components/panel/bottom-nav'
import { TopbarLocaleSwitcher } from '../components/panel/locale-switcher'
import { Slot } from '../components/panel/slot'
import { Topbar } from '../components/panel/topbar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import { useAlfakitProps, useRegistry } from '../context'
import { cn } from '../lib/utils'
import { TopNavLayout } from './top-nav-layout'

export const MAX_WIDTHS: Record<string, string> = {
  '3xs': 'max-w-3xs',
  '2xs': 'max-w-2xs',
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  none: 'max-w-none',
  min: 'max-w-min',
  max: 'max-w-max',
  fit: 'max-w-fit',
  prose: 'max-w-prose',
  container: 'container',
  'screen-sm': 'max-w-(--breakpoint-sm)',
  'screen-md': 'max-w-(--breakpoint-md)',
  'screen-lg': 'max-w-(--breakpoint-lg)',
  'screen-xl': 'max-w-(--breakpoint-xl)',
  'screen-2xl': 'max-w-(--breakpoint-2xl)',
  full: 'max-w-full',
  screen: 'max-w-screen',
}

export interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbSchema[]
  maxContentWidth?: Width | string
}

/** Sidebar + topbar shell used by every authenticated page. */
/**
 * Stands in for the top bar on phones when the panel has `topbar(false)`: the sidebar
 * toggle has to stay reachable.
 */
export function MobileTopbar() {
  return (
    <header
      data-slot="topbar"
      data-variant="mobile"
      className="bg-background/80 sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b px-4 backdrop-blur md:hidden"
    >
      <SidebarTrigger className="-ms-1" />
      <div className="ms-auto flex items-center gap-1">
        <TopbarLocaleSwitcher />
      </div>
    </header>
  )
}

export function AppLayout({ children, breadcrumbs, maxContentWidth }: AppLayoutProps) {
  const props = useAlfakitProps()
  const registry = useRegistry()
  const layout = props.alfakit.theme?.design?.layout ?? 'sidebar'
  // Replace the sidebar or top bar everywhere with createAlfakit({ components: { 'panel:sidebar': … } }).
  const Sidebar = registry.resolve('panel:sidebar') ?? AppSidebar
  const Bar = registry.resolve('panel:topbar') ?? Topbar
  // The mobile preset's bottom bar (`Panel::mobile()`), hidden from `md` up.
  const Bottom = registry.resolve('panel:bottom-nav') ?? BottomNav
  const width = maxContentWidth ?? props.alfakit.maxContentWidth ?? '7xl'

  if (layout === 'topbar') {
    return (
      <TopNavLayout breadcrumbs={breadcrumbs} maxContentWidth={maxContentWidth}>
        {children}
      </TopNavLayout>
    )
  }

  return (
    // The rail layout starts as icons only until the user expands it.
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen(props.alfakitSidebarOpen, layout)}
      style={sidebarWidthStyle(props.alfakit) as CSSProperties | undefined}
    >
      <Slot name="body.start" />
      <Slot name="layout.start" />
      {createElement(Sidebar)}
      <SidebarInset>
        <Slot name="topbar.before" />
        {/* `topbar(false)`: no top bar, except a slim one with the sidebar toggle on phones. */}
        {hasTopbar(props.alfakit) ? createElement(Bar, { breadcrumbs }) : <MobileTopbar />}
        <Slot name="topbar.after" />
        <Slot name="content.before" />
        <div
          data-slot="content"
          className={cn(
            'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
            MAX_WIDTHS[width] ?? 'max-w-7xl',
          )}
        >
          <Slot name="content.start" />
          {children}
          <Slot name="content.end" />
        </div>
        <Slot name="content.after" />
        <Slot name="footer" />
      </SidebarInset>
      {hasMobilePreset(props.alfakit) && createElement(Bottom)}
      <Slot name="layout.end" />
      <Slot name="body.end" />
    </SidebarProvider>
  )
}
