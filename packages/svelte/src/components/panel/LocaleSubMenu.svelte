<script lang="ts">
  import { collapsesLanguageSwitcher, showsLanguageSwitcher } from '@alfakit/core'
  import LanguagesIcon from '@lucide/svelte/icons/languages'
  import { useLocalization, usePanel, useT } from '../../context.svelte'
  import {
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
  } from '../ui/dropdown-menu'
  import LocaleOptions from './LocaleOptions.svelte'

  /**
   * "Language" submenu for the user menu (`languageSwitcher('user-menu' | 'both')`, and
   * below `sm` for `'topbar'`).
   */

  const t = useT()
  const panel = $derived(usePanel())
  const localization = $derived(useLocalization())
  const inMenu = $derived(showsLanguageSwitcher(localization, 'user-menu'))
  // `languageSwitcher('topbar')`: the top bar's button is hidden on phones, so it's here.
  const onPhones = $derived(
    !inMenu && collapsesLanguageSwitcher(localization, Boolean(panel?.user && panel.userMenu)),
  )
</script>

{#if inMenu || onPhones}
  <DropdownMenuSub>
    <DropdownMenuSubTrigger class={onPhones ? 'sm:hidden' : undefined}>
      <LanguagesIcon />
      <span>{t('language', {}, 'Language')}</span>
      <span class="text-muted-foreground ms-auto ps-2 text-xs">{localization.label}</span>
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent class="min-w-40">
      <LocaleOptions />
    </DropdownMenuSubContent>
  </DropdownMenuSub>
{/if}
