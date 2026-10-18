<script setup lang="ts">
import { switchLocale } from '@alfakit/core'
import { useLocalization, usePanel } from '../../context'
import DropdownMenuRadioGroup from '../ui/DropdownMenuRadioGroup.vue'
import DropdownMenuRadioItem from '../ui/DropdownMenuRadioItem.vue'

const panel = usePanel()
const localization = useLocalization()

const change = (value: unknown) => {
  const code = String(value)

  if (panel.value.endpoints.locale && code !== panel.value.localization.code) {
    switchLocale(panel.value.endpoints.locale, code)
  }
}
</script>

<template>
  <DropdownMenuRadioGroup :model-value="localization.code" @update:model-value="change">
    <DropdownMenuRadioItem
      v-for="locale in localization.locales"
      :key="locale.code"
      :value="locale.code"
      :lang="locale.tag"
      :data-current="locale.code === localization.code ? 'true' : undefined"
      class="data-[current=true]:font-medium"
    >
      <span :lang="locale.tag" :dir="locale.direction">{{ locale.label }}</span>
    </DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
</template>
