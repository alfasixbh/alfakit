<script lang="ts">
  import { switchLocale } from '@alfakit/core'
  import { useLocalization, usePanel } from '../../context.svelte'
  import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../ui/dropdown-menu'

  const panel = $derived(usePanel())
  const localization = $derived(useLocalization())

  const change = (code: string) => {
    if (panel.endpoints.locale && code !== panel.localization.code) {
      switchLocale(panel.endpoints.locale, code)
    }
  }
</script>

<DropdownMenuRadioGroup value={localization.code} onValueChange={change}>
  {#each localization.locales as locale (locale.code)}
    <DropdownMenuRadioItem
      value={locale.code}
      lang={locale.tag}
      data-current={locale.code === localization.code ? 'true' : undefined}
      class="data-[current=true]:font-medium"
    >
      <span lang={locale.tag} dir={locale.direction}>{locale.label}</span>
    </DropdownMenuRadioItem>
  {/each}
</DropdownMenuRadioGroup>
