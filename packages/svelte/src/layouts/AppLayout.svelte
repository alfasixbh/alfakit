<script lang="ts">
  import {
    hasMobilePreset,
    hasTopbar,
    sidebarDefaultOpen,
    sidebarWidthStyle,
    type BreadcrumbSchema,
    type Width,
  } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import AppSidebar from '../components/panel/AppSidebar.svelte'
  import BottomNav from '../components/panel/BottomNav.svelte'
  import CloseMobileSidebarOnVisit from '../components/panel/CloseMobileSidebarOnVisit.svelte'
  import MobileTopbar from '../components/panel/MobileTopbar.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import Topbar from '../components/panel/Topbar.svelte'
  import { SidebarInset, SidebarProvider } from '../components/ui/sidebar'
  import { useAlfakitProps, usePanel, useRegistry } from '../context.svelte'
  import { cn } from '../lib/utils'
  import { MAX_WIDTHS } from './max-widths'
  import TopNavLayout from './TopNavLayout.svelte'

  let {
    breadcrumbs,
    maxContentWidth,
    children,
  }: { breadcrumbs?: BreadcrumbSchema[]; maxContentWidth?: Width | string; children?: Snippet } =
    $props()

  /** Sidebar + topbar shell used by every authenticated page. */
  const registry = useRegistry()
  const panel = $derived(usePanel())
  const layout = $derived(panel.theme?.design?.layout ?? 'sidebar')
  // Replace the sidebar or top bar everywhere with createAlfakit({ components: { 'panel:sidebar': … } }).
  const Sidebar = $derived(registry.resolve('panel:sidebar') ?? AppSidebar)
  const Bar = $derived(registry.resolve('panel:topbar') ?? Topbar)
  // The mobile preset's bottom bar (`Panel::mobile()`), hidden from `md` up.
  const Bottom = $derived(registry.resolve('panel:bottom-nav') ?? BottomNav)
  const mobilePreset = $derived(hasMobilePreset(panel))
  // `topbar(false)`: no top bar, except a slim one with the sidebar toggle on phones.
  const showTopbar = $derived(hasTopbar(panel))
  // The rail layout starts as icons only until the user expands it.
  const sidebarOpen = $derived(sidebarDefaultOpen(useAlfakitProps().alfakitSidebarOpen, layout))
  const width = $derived(maxContentWidth ?? panel.maxContentWidth ?? '7xl')
  // `sidebarWidth()` / `collapsedSidebarWidth()` (CSS lengths validated by the server).
  const sidebarStyle = $derived(
    Object.entries(sidebarWidthStyle(panel) ?? {})
      .map(([property, value]) => `${property}: ${value}`)
      .join('; ') || undefined,
  )
</script>

{#if layout === 'topbar'}
  <TopNavLayout {breadcrumbs} {maxContentWidth}>{@render children?.()}</TopNavLayout>
{:else}
  <SidebarProvider defaultOpen={sidebarOpen} style={sidebarStyle}>
    <CloseMobileSidebarOnVisit />
    <Slot name="body.start" />
    <Slot name="layout.start" />
    <Sidebar />
    <SidebarInset>
      <Slot name="topbar.before" />
      {#if showTopbar}<Bar {breadcrumbs} />{:else}<MobileTopbar />{/if}
      <Slot name="topbar.after" />
      <Slot name="content.before" />
      <div
        data-slot="content"
        class={cn(
          'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
          MAX_WIDTHS[width] ?? 'max-w-7xl',
        )}
      >
        <Slot name="content.start" />
        {@render children?.()}
        <Slot name="content.end" />
      </div>
      <Slot name="content.after" />
      <Slot name="footer" />
    </SidebarInset>
    {#if mobilePreset}<Bottom />{/if}
    <Slot name="layout.end" />
    <Slot name="body.end" />
  </SidebarProvider>
{/if}
