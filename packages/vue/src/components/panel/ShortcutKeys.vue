<script setup lang="ts">
import { shortcutSteps } from '@alfakit/core'
import { computed } from 'vue'
import { useHydrated } from '../../composables/use-hydrated'
import { useT } from '../../context'
import { cn } from '../../lib/utils'

/**
 * A key binding as `<kbd>` keys (`G` then `D`, `⌘K`). The keys depend on the visitor's
 * platform (⌘ or Ctrl), so they render after hydration.
 */
const props = defineProps<{ binding: string; class?: string }>()
const t = useT()
const hydrated = useHydrated()
const steps = computed(() => shortcutSteps(props.binding))
</script>

<template>
  <span
    v-if="hydrated"
    data-slot="shortcut-keys"
    :class="cn('inline-flex items-center gap-1', props.class)"
  >
    <span v-for="(step, index) in steps" :key="index" class="inline-flex items-center gap-1">
      <span v-if="index > 0" class="text-muted-foreground text-[10px]">{{
        t('shortcuts.then', {}, 'then')
      }}</span>
      <kbd
        class="bg-muted text-muted-foreground rounded border px-1.5 font-mono text-[10px] leading-5"
        >{{ step }}</kbd
      >
    </span>
  </span>
</template>
