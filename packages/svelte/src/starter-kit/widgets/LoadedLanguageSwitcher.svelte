<script lang="ts">
  import { showsLanguageSwitcher, type StarterKitWidgets } from '@alfakit/core'
  import LanguageMenu from './LanguageMenu.svelte'
  import LanguageSwitcherTrigger from './LanguageSwitcherTrigger.svelte'
  import { useWidgetsPanel } from './widgets-panel.svelte'
  import WidgetShell from './WidgetShell.svelte'

  /**
   * The panel's language menu (its languages in their own names, `LocaleOptions`): picking
   * one posts to the panel's locale endpoint and reloads the page in it. Nothing without a
   * language switcher with two or more languages.
   */
  let { source }: { source: StarterKitWidgets } = $props()

  const panel = useWidgetsPanel(() => source)
</script>

{#if panel.current}
  {#if showsLanguageSwitcher(panel.current.localization, 'auth')}
    <WidgetShell panel={panel.current}>
      <LanguageMenu />
    </WidgetShell>
  {/if}
{:else}
  <LanguageSwitcherTrigger {source} />
{/if}
