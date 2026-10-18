<script setup lang="ts">
import type {
  AnyActionSchema,
  ContentSlotName,
  ContentSlots,
  FieldActions,
  SchemaComponent,
} from '@alfakit/core'
import { slotAlignmentClass } from '@alfakit/core'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import { useFieldActionContext } from './field-actions'
import RenderComponent from './RenderComponent.vue'

/**
 * One content slot of a field or entry (`aboveLabel()`, `belowContent()`…): a small row
 * of schema components and actions. Actions run as the owner's field actions.
 */
const props = defineProps<{
  component: ContentSlots & FieldActions & { key: string }
  name: ContentSlotName
  class?: HTMLAttributes['class']
}>()

const context = useFieldActionContext(() => props.component)
const slot = computed(() => props.component.slots?.[props.name])

type Group =
  | { kind: 'actions'; key: string; actions: AnyActionSchema[] }
  | { kind: 'component'; key: string; component: SchemaComponent }

// Consecutive actions share one action list, so they sit together like hint actions.
const groups = computed<Group[]>(() => {
  const result: Group[] = []

  for (const item of slot.value?.items ?? []) {
    if (item.action) {
      const last = result[result.length - 1]

      if (last?.kind === 'actions') {
        last.actions.push(item.action)
      } else {
        result.push({ kind: 'actions', key: `actions-${result.length}`, actions: [item.action] })
      }
    } else {
      result.push({ kind: 'component', key: item.component.key, component: item.component })
    }
  }

  return result
})
</script>

<template>
  <div
    v-if="slot?.items.length"
    data-slot="field-content-slot"
    :data-content-slot="props.name"
    :class="
      cn(
        'flex min-w-0 flex-wrap items-center gap-2 text-sm',
        slotAlignmentClass(slot.alignment),
        props.class,
      )
    "
  >
    <template v-for="group in groups" :key="group.key">
      <ActionList
        v-if="group.kind === 'actions'"
        :actions="group.actions"
        :context="context"
        size="xs"
        class="gap-1"
      />
      <RenderComponent v-else :component="group.component" />
    </template>
  </div>
</template>
