<script setup lang="ts">
import type { FormStore } from '@alfakit/core'
import { computed } from 'vue'
import { useStore } from '../../composables/use-store'
import { useT } from '../../context'
import Badge from '../ui/Badge.vue'

/** The live state of one form store, for the debug panel's Form tab. */
const props = defineProps<{ form: FormStore }>()
const t = useT()
const state = useStore(props.form.store)
const dirty = computed(() => [...state.value.dirty])
const errors = computed(() => Object.keys(state.value.errors))

const json = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>

<template>
  <section class="space-y-2 rounded-md border p-3">
    <header class="flex flex-wrap items-center gap-2 font-mono text-xs">
      <span class="font-semibold">{{ props.form.component }}</span>
      <span v-if="props.form.record !== null" class="text-muted-foreground"
        >#{{ props.form.record }}</span
      >
      <Badge v-if="state.processing" variant="secondary">processing</Badge>
      <Badge v-if="state.refreshing" variant="secondary">refreshing</Badge>
    </header>
    <h4 class="text-muted-foreground text-xs font-medium">{{ t('debug.values', {}, 'Values') }}</h4>
    <pre
      dir="ltr"
      class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
      >{{ json(state.values) }}</pre>
    <template v-if="dirty.length > 0">
      <h4 class="text-muted-foreground text-xs font-medium">
        {{ t('debug.dirty', {}, 'Dirty fields') }}
      </h4>
      <div class="flex flex-wrap gap-1">
        <Badge v-for="path in dirty" :key="path" variant="outline" class="font-mono">{{
          path
        }}</Badge>
      </div>
    </template>
    <template v-if="errors.length > 0">
      <h4 class="text-destructive text-xs font-medium">{{ t('debug.errors', {}, 'Errors') }}</h4>
      <pre
        dir="ltr"
        class="bg-muted/50 max-h-72 overflow-auto rounded-md p-2 text-start font-mono text-xs leading-relaxed"
        >{{ json(state.errors) }}</pre>
    </template>
  </section>
</template>
