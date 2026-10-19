<script lang="ts">
  import {
    formatKeyBinding,
    registerStarterKitSearchShortcut,
    requestStarterKitSearch,
    type StarterKitWidgets,
  } from '@alfakit/core'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { useHydrated } from '../../hooks/hydrated.svelte'

  /**
   * The search field until the palette has loaded: the same look, from the shared prop
   * alone. Its key bindings and a click are remembered and open the palette once loaded.
   */
  let { source }: { source: StarterKitWidgets } = $props()

  const hydrated = useHydrated()
  const search = $derived(source.widgets.search)
  const placeholder = $derived(search?.placeholder ?? '')
  const keys = $derived(JSON.stringify(search?.keyBindings ?? ['mod+k']))
  const binding = $derived(search?.keyBindings[0])

  $effect(() =>
    registerStarterKitSearchShortcut(JSON.parse(keys) as string[], placeholder, () => {}),
  )
</script>

<button
  type="button"
  class="border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 focus-visible:ring-ring/50 text-muted-foreground inline-flex size-8 h-8 shrink-0 items-center justify-center gap-2 rounded-md border px-0 text-sm font-normal shadow-xs outline-none focus-visible:ring-[3px] sm:w-56 sm:justify-start sm:px-2.5"
  onclick={() => requestStarterKitSearch()}
>
  <SearchIcon class="size-4" aria-hidden="true" />
  <span class="sr-only sm:not-sr-only sm:flex-1 sm:text-start">{placeholder}</span>
  {#if hydrated.current && binding}
    <kbd dir="ltr" class="bg-muted hidden rounded px-1 font-mono text-[10px] sm:inline">
      {formatKeyBinding(binding)}
    </kbd>
  {/if}
</button>
