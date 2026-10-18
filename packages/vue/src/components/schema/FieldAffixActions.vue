<script setup lang="ts">
import type { FieldActions } from '@alfakit/core'
import { computed } from 'vue'
import ActionList from '../actions/ActionList.vue'
import { useFieldActionContext } from './field-actions'

/** Prefix and suffix actions of a field or entry, on either side of the control. */
const props = defineProps<{ component: FieldActions & { key: string } }>()
const context = useFieldActionContext(() => props.component)
const prefix = computed(() => props.component.prefixActions ?? [])
const suffix = computed(() => props.component.suffixActions ?? [])
</script>

<template>
  <div
    v-if="prefix.length > 0 || suffix.length > 0"
    data-slot="field-affix-actions"
    class="flex items-start gap-2"
  >
    <ActionList
      v-if="prefix.length > 0"
      :actions="prefix"
      :context="context"
      class="shrink-0 flex-nowrap gap-1"
    />
    <div class="min-w-0 flex-1"><slot /></div>
    <ActionList
      v-if="suffix.length > 0"
      :actions="suffix"
      :context="context"
      class="shrink-0 flex-nowrap gap-1"
    />
  </div>
  <slot v-else />
</template>
