<script setup lang="ts">
import { showsLanguageSwitcher, type StarterKitWidgets } from '@alfakit/core'
import { computed, toRef } from 'vue'
import LanguageMenu from './LanguageMenu.vue'
import LanguageSwitcherTrigger from './LanguageSwitcherTrigger.vue'
import { useWidgetsPanel } from './use-widgets'
import WidgetShell from './WidgetShell.vue'

/**
 * The panel's language menu (its languages in their own names, `LocaleOptions`): picking
 * one posts to the panel's locale endpoint and reloads the page in it. Nothing without a
 * language switcher with two or more languages.
 */
const props = defineProps<{ source: StarterKitWidgets }>()

const panel = useWidgetsPanel(toRef(props, 'source'))
const visible = computed(() => showsLanguageSwitcher(panel.value?.localization, 'auth'))
</script>

<template>
  <template v-if="panel">
    <WidgetShell v-if="visible" :panel="panel">
      <LanguageMenu />
    </WidgetShell>
  </template>
  <LanguageSwitcherTrigger v-else :source="props.source" />
</template>
