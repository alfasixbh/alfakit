<script setup lang="ts">
import { showsLanguageSwitcher } from '@alfakit/core'
import { LanguagesIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useLocalization, useT } from '../../context'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import LocaleOptions from './LocaleOptions.vue'

/**
 * Stand-alone language menu: a languages button listing each language in its own name
 * (auth pages, top bar). Renders nothing without a switcher.
 */
const t = useT()
const localization = useLocalization()
const visible = computed(() => showsLanguageSwitcher(localization.value, 'auth'))
</script>

<template>
  <div v-if="visible" data-slot="language-switcher" class="flex">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="t('change_language', {}, 'Change language')"
          :title="t('change_language', {}, 'Change language')"
        >
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-40">
        <LocaleOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
