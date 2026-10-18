<script setup lang="ts">
import { collapsesLanguageSwitcher, showsLanguageSwitcher } from '@alfakit/core'
import { computed } from 'vue'
import { useOptionalRegistry, usePanel } from '../../context'
import LocaleSwitcher from './LocaleSwitcher.vue'

/**
 * The top bars' language button (`languageSwitcher('topbar' | 'both')`): the registered
 * `panel:language-switcher` component or the built-in menu. Below `sm` it moves into the
 * user menu when there is one (`collapsesLanguageSwitcher()`).
 */
const panel = usePanel()
const registry = useOptionalRegistry()
const visible = computed(() => showsLanguageSwitcher(panel.value?.localization, 'topbar'))
const collapses = computed(() =>
  collapsesLanguageSwitcher(
    panel.value?.localization,
    Boolean(panel.value?.user && panel.value.userMenu),
  ),
)
const Switcher = computed(() => registry?.resolve('panel:language-switcher') ?? LocaleSwitcher)
</script>

<template>
  <div v-if="visible && collapses" class="hidden sm:contents" data-slot="topbar-language">
    <component :is="Switcher" />
  </div>
  <component :is="Switcher" v-else-if="visible" />
</template>
