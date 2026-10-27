<script lang="ts" module>
  import { lazyLoader } from '../../lib/lazy'

  // The palette (search, commands, recent records) loads the first time it opens.
  const loader = lazyLoader<{ open?: boolean }>(() =>
    import('./GlobalSearchPalette.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { useAppMounted } from '../../lib/hydration.svelte'
  import { formatKeyBinding, globalSearchSuffix, SHORTCUT_IDS, shortcuts } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { untrack } from 'svelte'
  import { usePanel, useT } from '../../context.svelte'
  import { useHydrated } from '../../hooks/hydrated.svelte'
  import { Button } from '../ui/button'
  import Icon from '../../lib/Icon.svelte'
  import Slot from './Slot.svelte'

  /**
   * The search field and its command palette (`GlobalSearchPalette`, loaded on first open):
   * global search results plus (with `alfakit.commandPalette`) the page's header actions,
   * panel commands, navigation, "create" links, recent records, theme switching and the
   * shortcuts overlay. `variant="sidebar"`: the full-width field in the sidebar header
   * (`globalSearch(position: Sidebar)`).
   */
  let { variant = 'topbar' }: { variant?: 'topbar' | 'sidebar' } = $props()

  const t = useT()
  // The shortcut hint depends on the visitor's platform (⌘ or Ctrl): rendered after hydration.
  const hydrated = useHydrated()
  const panel = $derived(usePanel())
  const config = $derived(panel.globalSearch)
  const palette = $derived(panel.commandPalette)
  const endpoint = $derived(config ? panel.endpoints.globalSearch : undefined)
  const placeholder = $derived(
    config?.placeholder ??
      palette?.placeholder ??
      t('palette.placeholder', {}, 'Type a command or search…'),
  )
  // ⌘K / Ctrl+K without global search.
  const suffix = $derived(
    globalSearchSuffix(config ?? (palette ? { keyBindings: ['mod+k'], placeholder } : undefined)),
  )

  let open = $state(false)
  // Undefined on the server and during hydration (nothing loads there), so the markup matches.
  let Palette = $state(untrack(() => loader.current))
  // Per app: another app on the page may have loaded it, but this one's server markup has none.
  const appMounted = useAppMounted()

  const preload = () => {
    void loader.load().catch(() => {})
  }

  // Opening before the code has arrived (a click or `mod+k` right after the page loads)
  // keeps `open` set; the palette mounts open once it has loaded.
  $effect(() => {
    if (!open || Palette) return

    loader.load().then(
      (component) => (Palette = component),
      () => (open = false),
    )
  })

  // Keyed on the shortcut itself, so reloads (which bring a new panel object) don't
  // re-register it. Essential: it keeps working with `keyboardShortcuts(false)`.
  const searchKeys = $derived(
    config || palette ? JSON.stringify(config?.keyBindings ?? ['mod+k']) : '',
  )

  $effect(() => {
    if (!searchKeys) return

    return shortcuts.register({
      id: SHORTCUT_IDS.palette,
      keys: JSON.parse(searchKeys) as string[],
      label: untrack(() => t('shortcuts.open_palette', {}, 'Open the command palette')),
      group: 'general',
      essential: true,
      handler: () => {
        open = true
      },
    })
  })

  // A palette opened while its code was still loading closes when the page changes.
  $effect(() =>
    router.on('navigate', () => {
      open = false
    }),
  )
</script>

{#if (config && endpoint) || palette}
  <Slot name="global-search.before" />
  <Button
    type="button"
    variant="outline"
    size="sm"
    data-variant={variant}
    class={variant === 'sidebar'
      ? 'text-muted-foreground w-full justify-start gap-2 px-2.5 font-normal group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
      : 'text-muted-foreground size-8 justify-center gap-2 px-0 font-normal sm:w-56 sm:justify-start sm:px-2.5'}
    onclick={() => (open = true)}
    onpointerenter={preload}
    onfocus={preload}
  >
    <Icon name="alfakit::panels.global-search.field" fallback={SearchIcon} class="size-4" />
    <span
      class={variant === 'sidebar'
        ? 'flex-1 truncate text-start group-data-[collapsible=icon]:sr-only'
        : 'sr-only sm:not-sr-only sm:flex-1 sm:text-start'}>{placeholder}</span
    >
    <!-- `globalSearchFieldSuffix()`, or the first key binding (after hydration: ⌘ or Ctrl). -->
    {#if suffix?.type === 'text'}<span
        data-slot="global-search-suffix"
        class="text-muted-foreground hidden text-[10px] sm:inline">{suffix.text}</span
      >{/if}
    {#if hydrated.current && suffix?.type === 'keyBinding'}<kbd
        dir="ltr"
        class="bg-muted text-foreground/70 hidden rounded px-1 font-mono text-[10px] sm:inline"
        >{formatKeyBinding(suffix.keyBinding)}</kbd
      >{/if}
  </Button>
  <Slot name="global-search.after" />
  <!-- The dialog's code loads on first open (click or shortcut); hovering or focusing the
       field fetches it ahead. Not rendered on the server, like the closed dialog before it. -->
  {#if Palette && appMounted.current}<Palette bind:open />{/if}
{/if}
