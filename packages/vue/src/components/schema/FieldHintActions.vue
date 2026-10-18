<script setup lang="ts">
import type { FieldActions } from '@alfakit/core'
import ActionList from '../actions/ActionList.vue'
import { useFieldActionContext } from './field-actions'

/** Hint actions of a field or entry, next to its label. */
const props = defineProps<{ component: FieldActions & { key: string } }>()
const context = useFieldActionContext(() => props.component)
</script>

<template>
  <ActionList
    v-if="props.component.hintActions?.length"
    :actions="props.component.hintActions"
    :context="context"
    size="xs"
    class="gap-1"
  />
</template>
