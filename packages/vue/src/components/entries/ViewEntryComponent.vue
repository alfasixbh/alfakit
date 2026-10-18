<script setup lang="ts">
import type { ViewEntrySchema } from '@alfakit/core'
import { computed } from 'vue'
import { useRegistry, useT } from '../../context'
import EntryWrapper from './EntryWrapper.vue'

// `ViewEntry`: the application component registered under the entry's `view()` name.
const props = defineProps<{ component: ViewEntrySchema }>()
const t = useT()
const registry = useRegistry()
const name = computed(() => props.component.component ?? '')
const custom = computed(() => (name.value ? registry.resolve(name.value) : undefined))
</script>

<template>
  <EntryWrapper :entry="props.component">
    <component
      :is="custom"
      v-if="custom"
      v-bind="{ ...(props.component.props ?? {}), state: props.component.state }"
      :component="props.component"
    />
    <span v-else class="text-destructive text-xs">{{
      t('component_not_registered', { component: name }, `Component ${name} is not registered.`)
    }}</span>
  </EntryWrapper>
</template>
