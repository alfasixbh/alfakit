<script setup lang="ts">
import type { ActionsComponentSchema } from '@alfakit/core'
import { computed } from 'vue'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import { useFieldActionContext } from '../schema/field-actions'

const JUSTIFY: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  justify: 'justify-between',
}

const VERTICAL: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

/**
 * `Actions::make([...])`: a row of buttons placed freely in a form or infolist. They run in
 * the component's field context, so `$set()` in an action updates the surrounding form.
 */
const props = defineProps<{ component: ActionsComponentSchema }>()
const context = useFieldActionContext(() => props.component)
const stretch = computed(() => props.component.fullWidth || props.component.alignment === 'justify')
</script>

<template>
  <div
    data-slot="schema-actions"
    :data-alignment="props.component.alignment ?? 'start'"
    :class="
      cn(
        'flex h-full flex-col',
        props.component.verticalAlignment && VERTICAL[props.component.verticalAlignment],
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <ActionList
      :actions="props.component.actions ?? []"
      :context="context"
      :class="
        cn('w-full', JUSTIFY[props.component.alignment ?? 'start'], stretch && '[&>*]:flex-1')
      "
    />
  </div>
</template>
