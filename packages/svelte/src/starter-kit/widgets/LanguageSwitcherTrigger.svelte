<script lang="ts">
  import { requestStarterKitLanguages, type StarterKitWidgets } from '@alfakit/core'
  import LanguagesIcon from '@lucide/svelte/icons/languages'

  /**
   * The language button until its menu has loaded: the languages icon and the current
   * language in its own name (from `sm`). A click is remembered and opens the menu once
   * loaded.
   */
  let { source }: { source: StarterKitWidgets } = $props()

  const language = $derived(source.widgets.language)
</script>

<button
  type="button"
  data-slot="language-switcher-trigger"
  aria-label={language?.label}
  aria-haspopup="menu"
  title={language?.label}
  class="hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent focus-visible:ring-ring/50 inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-[3px]"
  onclick={() => requestStarterKitLanguages()}
>
  <LanguagesIcon class="size-4" aria-hidden="true" />
  {#if language}
    <span lang={language.current.tag} dir={language.current.direction} class="hidden sm:inline"
      >{language.current.label}</span
    >
  {/if}
</button>
