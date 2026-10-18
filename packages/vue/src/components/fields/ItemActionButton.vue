<script setup lang="ts">
import type { ActionContext, ActionSchema, ItemActionSchema } from '@alfakit/core'
import { itemActionContext, withItemActionState } from '@alfakit/core'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from '@lucide/vue'
import { computed, type Component, type HTMLAttributes } from 'vue'
import { useActionRunner } from '../../context'
import { colorClass, ghostButtonColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import ActionButton from '../actions/ActionButton.vue'
import Button from '../ui/Button.vue'

/**
 * A built-in item action (Repeater, Builder, KeyValue). Uncustomised actions emit
 * `client` and change the state in the browser; customised ones (`server`) run through
 * the field action endpoint with `args` (`item`, `items`, `block`).
 */
const props = withDefaults(
  defineProps<{
    action: ItemActionSchema | null
    context: ActionContext
    args?: Record<string, unknown>
    disabled?: boolean
    attributes?: Record<string, string>
    size?: 'xs' | 'sm' | 'default'
    class?: HTMLAttributes['class']
  }>(),
  { size: 'xs' },
)
const emit = defineEmits<{ client: [] }>()
const runner = useActionRunner()

/** The common item action icons, bundled so headers don't wait for dynamic icons. */
const STATIC_ICONS: Record<string, Component> = {
  'chevron-up': ChevronUpIcon,
  'chevron-down': ChevronDownIcon,
  copy: CopyIcon,
  'trash-2': Trash2Icon,
  'grip-vertical': GripVerticalIcon,
  plus: PlusIcon,
}

const schema = computed(() =>
  props.action
    ? withItemActionState(props.action, { disabled: props.disabled, attributes: props.attributes })
    : null,
)
// Plain icon buttons that change the state in the browser repeat on every item: render
// them light (no runner subscription, no tooltip, static icons).
const light = computed(
  () =>
    schema.value !== null &&
    !schema.value.server &&
    schema.value.variant === 'icon-button' &&
    !schema.value.badge,
)
const label = computed(() => schema.value?.label ?? schema.value?.tooltip ?? schema.value?.name)
const staticIcon = computed(() =>
  schema.value?.icon ? STATIC_ICONS[schema.value.icon] : undefined,
)
const scoped = computed(() => itemActionContext(props.context, props.args ?? {}))
const trigger = (action: ActionSchema, context: ActionContext) =>
  props.action?.server ? runner.trigger(action, context) : emit('client')
</script>

<template>
  <Button
    v-if="schema && light"
    type="button"
    variant="plain"
    :size="props.size === 'xs' ? 'icon-xs' : props.size === 'sm' ? 'icon-sm' : 'icon'"
    :disabled="schema.disabled"
    :aria-label="label"
    :title="schema.tooltip ?? label"
    v-bind="schema.extraAttributes"
    :class="cn(colorClass(ghostButtonColorClasses, schema.color, 'gray'), props.class)"
    @click="emit('client')"
  >
    <component :is="staticIcon" v-if="staticIcon" />
    <Icon v-else :name="schema.icon" />
  </Button>
  <ActionButton
    v-else-if="schema"
    :action="schema"
    :context="scoped"
    :size="props.size"
    :class="props.class"
    :with-key-bindings="false"
    :on-trigger="trigger"
  />
</template>
