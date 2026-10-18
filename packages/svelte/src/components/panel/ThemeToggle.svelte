<script lang="ts">
  import { hasThemeSwitcher, panelAppearance, setAppearance, type Appearance } from '@alfakit/core'
  import MonitorIcon from '@lucide/svelte/icons/monitor'
  import MoonIcon from '@lucide/svelte/icons/moon'
  import SunIcon from '@lucide/svelte/icons/sun'
  import { onMount } from 'svelte'
  import { usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Button } from '../ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'

  const t = useT()
  const panel = $derived(usePanel())
  let appearance = $state<Appearance>(usePanel().darkMode.default ?? 'system')

  onMount(() => {
    appearance = panelAppearance(panel)
  })

  const change = (value: string) => {
    appearance = value as Appearance
    setAppearance(appearance, panel)
  }
</script>

<!-- `themeSwitcher(false)` keeps dark mode but hides the switcher. -->
{#if hasThemeSwitcher(panel)}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('toggle_theme', {}, 'Toggle theme')}
          {...props}
        >
          {#if appearance === 'dark'}<Icon
              name="alfakit::panels.theme-switcher.dark-button"
              fallback={MoonIcon}
            />{:else if appearance === 'light'}<Icon
              name="alfakit::panels.theme-switcher.light-button"
              fallback={SunIcon}
            />{:else}<Icon
              name="alfakit::panels.theme-switcher.system-button"
              fallback={MonitorIcon}
            />{/if}
        </Button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup value={appearance} onValueChange={change}>
        <DropdownMenuRadioItem value="light"
          ><Icon name="alfakit::panels.theme-switcher.light-button" fallback={SunIcon} />
          {t('light', {}, 'Light')}</DropdownMenuRadioItem
        >
        <DropdownMenuRadioItem value="dark"
          ><Icon name="alfakit::panels.theme-switcher.dark-button" fallback={MoonIcon} />
          {t('dark', {}, 'Dark')}</DropdownMenuRadioItem
        >
        <DropdownMenuRadioItem value="system"
          ><Icon name="alfakit::panels.theme-switcher.system-button" fallback={MonitorIcon} />
          {t('system', {}, 'System')}</DropdownMenuRadioItem
        >
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
