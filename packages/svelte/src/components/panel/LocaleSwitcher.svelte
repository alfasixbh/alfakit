<script lang="ts">
  import { showsLanguageSwitcher } from '@alfakit/core'
  import LanguagesIcon from '@lucide/svelte/icons/languages'
  import { useLocalization, useT } from '../../context.svelte'
  import { Button } from '../ui/button'
  import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
  import LocaleOptions from './LocaleOptions.svelte'

  /**
   * Stand-alone language menu: a languages button listing each language in its own name
   * (auth pages, top bar). Renders nothing without a switcher.
   */

  const t = useT()
  const localization = $derived(useLocalization())
</script>

{#if showsLanguageSwitcher(localization, 'auth')}
  <div data-slot="language-switcher" class="flex">
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('change_language', {}, 'Change language')}
            title={t('change_language', {}, 'Change language')}
            {...props}
          >
            <LanguagesIcon />
          </Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-40">
        <LocaleOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
{/if}
