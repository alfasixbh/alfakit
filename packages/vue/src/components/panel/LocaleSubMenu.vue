<script setup lang="ts">
import { collapsesLanguageSwitcher, showsLanguageSwitcher } from '@alfakit/core'
import { LanguagesIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useLocalization, usePanel, useT } from '../../context'
import DropdownMenuSub from '../ui/DropdownMenuSub.vue'
import DropdownMenuSubContent from '../ui/DropdownMenuSubContent.vue'
import DropdownMenuSubTrigger from '../ui/DropdownMenuSubTrigger.vue'
import LocaleOptions from './LocaleOptions.vue'

/**
 * "Language" submenu for the user menu (`languageSwitcher('user-menu' | 'both')`, and
 * below `sm` for `'topbar'`).
 */
const t = useT()
const panel = usePanel()
const localization = useLocalization()
const inMenu = computed(() => showsLanguageSwitcher(localization.value, 'user-menu'))
// `languageSwitcher('topbar')`: the top bar's button is hidden on phones, so it's here.
const onPhones = computed(
  () =>
    !inMenu.value &&
    collapsesLanguageSwitcher(
      localization.value,
      Boolean(panel.value?.user && panel.value.userMenu),
    ),
)
</script>

<template>
  <DropdownMenuSub v-if="inMenu || onPhones">
    <DropdownMenuSubTrigger :class="onPhones ? 'sm:hidden' : undefined">
      <LanguagesIcon />
      <span>{{ t('language', {}, 'Language') }}</span>
      <span class="text-muted-foreground ms-auto ps-2 text-xs">{{ localization.label }}</span>
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent class="min-w-40">
      <LocaleOptions />
    </DropdownMenuSubContent>
  </DropdownMenuSub>
</template>
