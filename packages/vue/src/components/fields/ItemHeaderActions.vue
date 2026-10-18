<script setup lang="ts">
import type { ActionContext, ActionSchema, ItemActionName, ItemActionSchema } from '@alfakit/core'
import { itemActionContext } from '@alfakit/core'
import { computed } from 'vue'
import ActionList from '../actions/ActionList.vue'
import ItemActionButton from './ItemActionButton.vue'

/**
 * The end of an item header: move up / down, extra item actions, clone, delete and the
 * collapse toggle, in Filament's order.
 */
const props = defineProps<{
  context: ActionContext
  itemKey: string
  index: number
  count: number
  resolve: (name: ItemActionName) => ItemActionSchema | null
  extraActions?: ActionSchema[]
  buttons: boolean
  canClone: boolean
  canDelete: boolean
  collapsible: boolean
  collapsed: boolean
}>()
const emit = defineEmits<{
  move: [from: number, to: number]
  clone: []
  delete: []
  toggle: []
}>()

const args = computed(() => ({ item: props.itemKey }))
const extraContext = computed(() => itemActionContext(props.context, args.value))
</script>

<template>
  <div class="ms-auto flex items-center gap-0.5" data-slot="item-actions">
    <slot />
    <template v-if="props.buttons">
      <ItemActionButton
        :action="props.resolve('moveUp')"
        :context="props.context"
        :args="args"
        :disabled="props.index === 0"
        :attributes="{ 'data-item-move': 'up' }"
        @client="emit('move', props.index, props.index - 1)"
      />
      <ItemActionButton
        :action="props.resolve('moveDown')"
        :context="props.context"
        :args="args"
        :disabled="props.index === props.count - 1"
        :attributes="{ 'data-item-move': 'down' }"
        @client="emit('move', props.index, props.index + 1)"
      />
    </template>
    <ActionList
      v-if="props.extraActions?.length"
      :actions="props.extraActions"
      :context="extraContext"
      size="xs"
      class="gap-0.5"
    />
    <ItemActionButton
      v-if="props.canClone"
      :action="props.resolve('clone')"
      :context="props.context"
      :args="args"
      @client="emit('clone')"
    />
    <ItemActionButton
      v-if="props.canDelete"
      :action="props.resolve('delete')"
      :context="props.context"
      :args="args"
      class="text-destructive hover:text-destructive"
      @client="emit('delete')"
    />
    <ItemActionButton
      v-if="props.collapsible"
      :action="props.resolve(props.collapsed ? 'expand' : 'collapse')"
      :context="props.context"
      :args="args"
      :attributes="{ 'aria-expanded': props.collapsed ? 'false' : 'true' }"
      @client="emit('toggle')"
    />
  </div>
</template>
