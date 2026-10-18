<script setup lang="ts">
import type { ActionContext, ActionSchema, AnyActionSchema } from '@alfakit/core'
import { isActionGroup } from '@alfakit/core'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'
import ActionButton from './ActionButton.vue'
import ActionGroupMenu from './ActionGroupMenu.vue'

export interface ActionListProps {
  actions: AnyActionSchema[]
  context: ActionContext
  size?: 'xs' | 'sm' | 'default' | 'lg'
  class?: HTMLAttributes['class']
  align?: 'start' | 'end'
  onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
}

/** A horizontal row of action buttons and dropdown groups. */
const props = withDefaults(defineProps<ActionListProps>(), { size: 'default', align: 'start' })
</script>

<template>
  <div
    v-if="props.actions.length > 0"
    :class="
      cn('flex flex-wrap items-center gap-2', props.align === 'end' && 'justify-end', props.class)
    "
    data-slot="actions"
  >
    <template
      v-for="(action, index) in props.actions"
      :key="isActionGroup(action) ? `group-${index}` : action.name"
    >
      <ActionGroupMenu
        v-if="isActionGroup(action)"
        :group="action"
        :context="props.context"
        :size="props.size"
        :on-trigger="props.onTrigger"
      />
      <ActionButton
        v-else
        :action="action"
        :context="props.context"
        :size="props.size"
        :on-trigger="props.onTrigger"
      />
    </template>
  </div>
</template>
