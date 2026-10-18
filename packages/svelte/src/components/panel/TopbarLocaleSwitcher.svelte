<script lang="ts">
  import { collapsesLanguageSwitcher, showsLanguageSwitcher } from '@alfakit/core'
  import { useOptionalRegistry, usePanel } from '../../context.svelte'
  import LocaleSwitcher from './LocaleSwitcher.svelte'

  /**
   * The top bars' language button (`languageSwitcher('topbar' | 'both')`): the registered
   * `panel:language-switcher` component or the built-in menu. Below `sm` it moves into the
   * user menu when there is one (`collapsesLanguageSwitcher()`).
   */

  const registry = useOptionalRegistry()
  const panel = $derived(usePanel())
  const visible = $derived(showsLanguageSwitcher(panel?.localization, 'topbar'))
  const collapses = $derived(
    collapsesLanguageSwitcher(panel?.localization, Boolean(panel?.user && panel.userMenu)),
  )
  const Switcher = $derived(registry?.resolve('panel:language-switcher') ?? LocaleSwitcher)
</script>

{#if visible && collapses}
  <div class="hidden sm:contents" data-slot="topbar-language">
    <Switcher />
  </div>
{:else if visible}
  <Switcher />
{/if}
