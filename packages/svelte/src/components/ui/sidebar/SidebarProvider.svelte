<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { onMount, untrack } from 'svelte'
  import { useIsMobile } from '../../../hooks/mobile.svelte'
  import { cn } from '../../../lib/utils'
  import { TooltipProvider } from '../tooltip'
  import {
    SIDEBAR_KEYBOARD_SHORTCUT,
    SIDEBAR_WIDTH,
    SIDEBAR_WIDTH_ICON,
    SidebarState,
    setSidebar,
  } from './context.svelte'

  let {
    defaultOpen = true,
    class: className,
    style,
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean; children?: Snippet } = $props()

  const sidebar = setSidebar(
    new SidebarState({ defaultOpen: untrack(() => defaultOpen), isMobile: useIsMobile() }),
  )

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      // Rich text editors use the same shortcut for bold: leave keys they handled alone.
      if (event.defaultPrevented || (event.target as HTMLElement | null)?.isContentEditable) return

      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        sidebar.toggle()
      }
    }

    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  })
</script>

<TooltipProvider delayDuration={0}>
  <div
    data-slot="sidebar-wrapper"
    style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style ??
      ''}"
    class={cn(
      'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
  </div>
</TooltipProvider>
