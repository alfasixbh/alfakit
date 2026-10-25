<script setup lang="ts">
import type {
  ActionContext,
  AnyActionSchema,
  ContentSlotItem,
  SchemaComponent,
} from '@alfakit/core'
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'
import RenderComponent from '../schema/RenderComponent.vue'

/**
 * Actions and components placed in a layout component's fixed spot (a section's
 * `afterHeader()`, a callout's `controls()`). Actions run in the owner's action context
 * (`context`: inside a form, the owner's field context, so `$get` / `$set` work), else the
 * page's.
 */
const props = defineProps<{
  items: ContentSlotItem[] | undefined
  name: string
  class?: HTMLAttributes['class']
  context?: ActionContext
}>()

const pageContext = usePageActionContext()
const context = computed(() => props.context ?? pageContext)

type Group =
  | { kind: 'actions'; key: string; actions: AnyActionSchema[] }
  | { kind: 'component'; key: string; component: SchemaComponent }

// Consecutive actions share one action list so they sit together.
const groups = computed<Group[]>(() => {
  const result: Group[] = []

  for (const item of props.items ?? []) {
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
    v-if="props.items?.length"
    :data-slot="props.name"
    :class="cn('flex flex-wrap items-center gap-2', props.class)"
  >
    <template v-for="group in groups" :key="group.key">
      <ActionList
        v-if="group.kind === 'actions'"
        :actions="group.actions"
        :context="context"
        size="sm"
      />
      <RenderComponent v-else :component="group.component" />
    </template>
  </div>
</template>
