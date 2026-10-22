<script lang="ts">
  import { takeRequestedStarterKitLanguages } from '@alfakit/core'
  import { onMount } from 'svelte'
  import LanguagesIcon from '@lucide/svelte/icons/languages'
  import LocaleOptions from '../../components/panel/LocaleOptions.svelte'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from '../../components/ui/dropdown-menu'
  import { useLocalization, useT } from '../../context.svelte'

  /** The loaded language button and menu, inside the widgets' context (`WidgetShell`). */

  const t = useT()
  const localization = $derived(useLocalization())
  const label = $derived(t('change_language', {}, 'Change language'))
  let open = $state(false)

  // A click on the trigger before the menu loaded opens it once mounted (taken per mount: the
  // header is a persistent layout, so the switcher around it outlives a language switch), a
  // frame later, as the menu closes again when it opens while focus is on the replaced button.
  onMount(() => {
    if (!takeRequestedStarterKitLanguages()) return

    const frame = requestAnimationFrame(() => (open = true))

    return () => cancelAnimationFrame(frame)
  })
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>
    {#snippet child({ props })}
      <button
        type="button"
        data-slot="language-switcher-trigger"
        aria-label={label}
        title={label}
        class="hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent focus-visible:ring-ring/50 inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-[3px]"
        {...props}
      >
        <LanguagesIcon class="size-4" aria-hidden="true" />
        <span lang={localization.tag} dir={localization.direction} class="hidden sm:inline"
          >{localization.label}</span
        >
      </button>
    {/snippet}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="min-w-40">
    <LocaleOptions />
  </DropdownMenuContent>
</DropdownMenu>
