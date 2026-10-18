<script setup lang="ts">
import { hasThemeSwitcher, panelAppearance, setAppearance, type Appearance } from '@alfakit/core'
import { MonitorIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuRadioGroup from '../ui/DropdownMenuRadioGroup.vue'
import DropdownMenuRadioItem from '../ui/DropdownMenuRadioItem.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'

const t = useT()
const panel = usePanel()
const appearance = ref<Appearance>(panel.value.darkMode.default ?? 'system')

onMounted(() => {
  appearance.value = panelAppearance(panel.value)
})

const change = (value: string) => {
  const next = value as Appearance
  appearance.value = next
  setAppearance(next, panel.value)
}
</script>

<template>
  <!-- `themeSwitcher(false)` keeps dark mode but hides the switcher. -->
  <DropdownMenu v-if="hasThemeSwitcher(panel)">
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :aria-label="t('toggle_theme', {}, 'Toggle theme')"
      >
        <Icon
          v-if="appearance === 'dark'"
          name="alfakit::panels.theme-switcher.dark-button"
          :fallback="MoonIcon"
        />
        <Icon
          v-else-if="appearance === 'light'"
          name="alfakit::panels.theme-switcher.light-button"
          :fallback="SunIcon"
        />
        <Icon v-else name="alfakit::panels.theme-switcher.system-button" :fallback="MonitorIcon" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup
        :model-value="appearance"
        @update:model-value="change(String($event))"
      >
        <DropdownMenuRadioItem value="light"
          ><Icon name="alfakit::panels.theme-switcher.light-button" :fallback="SunIcon" />
          {{ t('light', {}, 'Light') }}</DropdownMenuRadioItem
        >
        <DropdownMenuRadioItem value="dark"
          ><Icon name="alfakit::panels.theme-switcher.dark-button" :fallback="MoonIcon" />
          {{ t('dark', {}, 'Dark') }}</DropdownMenuRadioItem
        >
        <DropdownMenuRadioItem value="system"
          ><Icon name="alfakit::panels.theme-switcher.system-button" :fallback="MonitorIcon" />
          {{ t('system', {}, 'System') }}</DropdownMenuRadioItem
        >
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
