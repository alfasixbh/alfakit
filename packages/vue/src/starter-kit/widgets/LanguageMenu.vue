<script setup lang="ts">
import { takeRequestedStarterKitLanguages } from '@alfakit/core'
import { LanguagesIcon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import LocaleOptions from '../../components/panel/LocaleOptions.vue'
import DropdownMenu from '../../components/ui/DropdownMenu.vue'
import DropdownMenuContent from '../../components/ui/DropdownMenuContent.vue'
import DropdownMenuTrigger from '../../components/ui/DropdownMenuTrigger.vue'
import { useLocalization, useT } from '../../context'

/** The loaded language button and menu, inside the widgets' context (`WidgetShell`). */

const t = useT()
const localization = useLocalization()
const open = ref(false)

// A click on the trigger before the menu loaded opens it once mounted (taken per mount: the
// header is a persistent layout, so the switcher around it outlives a language switch), a
// frame later, as the menu closes again when it opens while focus is on the replaced button.
onMounted(() => {
  if (takeRequestedStarterKitLanguages()) requestAnimationFrame(() => (open.value = true))
})
const label = computed(() => t('change_language', {}, 'Change language'))
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        data-slot="language-switcher-trigger"
        :aria-label="label"
        :title="label"
        class="hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent focus-visible:ring-ring/50 inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-[3px]"
      >
        <LanguagesIcon class="size-4" aria-hidden="true" />
        <span :lang="localization.tag" :dir="localization.direction" class="hidden sm:inline">{{
          localization.label
        }}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-40">
      <LocaleOptions />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
