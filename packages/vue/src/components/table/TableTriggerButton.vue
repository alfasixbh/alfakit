<script setup lang="ts">
import type { TriggerButtonView } from '@alfakit/core'
import { computed, useSlots, type HTMLAttributes } from 'vue'
import {
  badgeColorClasses,
  colorClass,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

/**
 * A table toolbar button (filters, column manager, grouping, reordering, apply / reset)
 * in its default look or as customised with `filtersTriggerAction()` & co. The `icon`
 * slot is the default look's icon; a server icon (`->icon()`) replaces it. Extra
 * attributes (`aria-*`, handlers, a popover trigger's props) reach the button.
 */
const props = withDefaults(
  defineProps<{
    view: TriggerButtonView
    /** The default look hides the label below `sm` (icon only on phones). */
    responsiveLabel?: boolean
    /** Highlight the default look (active filters, an active grouping). */
    active?: boolean
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { responsiveLabel: false, active: false, disabled: false, class: undefined },
)
const slots = useSlots()

const iconOnly = computed(() => !props.view.showLabel)
const hasIcon = computed(() => Boolean(props.view.icon || slots.icon))
const size = computed(() =>
  iconOnly.value
    ? props.view.size === 'xs'
      ? 'icon-xs'
      : props.view.size === 'lg'
        ? 'icon'
        : 'icon-sm'
    : props.view.size,
)
const colored = computed(() =>
  props.view.color
    ? props.view.variant === 'default'
      ? colorClass(solidButtonColorClasses, props.view.color, 'primary')
      : props.view.variant === 'outline'
        ? colorClass(outlineButtonColorClasses, props.view.color, 'gray')
        : colorClass(textColorClasses, props.view.color, 'primary')
    : undefined,
)
const showBadge = computed(
  () => props.view.badge !== undefined && props.view.badge !== null && props.view.badge !== 0,
)
</script>

<template>
  <Button
    type="button"
    :variant="props.view.variant"
    :size="size"
    :title="props.view.tooltip"
    :aria-label="iconOnly ? props.view.label : undefined"
    data-slot="table-trigger"
    :disabled="props.view.disabled || props.disabled"
    :class="
      cn(
        colored,
        props.active &&
          !props.view.color &&
          props.view.variant === 'outline' &&
          'border-primary/50 text-primary',
        props.class,
      )
    "
  >
    <template v-if="!props.view.iconAfter">
      <Icon v-if="props.view.icon" :name="props.view.icon" />
      <slot v-else name="icon" />
    </template>
    <span
      v-if="!iconOnly"
      :class="cn(props.responsiveLabel && hasIcon ? 'sr-only sm:not-sr-only' : undefined)"
      >{{ props.view.label }}</span
    >
    <template v-if="props.view.iconAfter">
      <Icon v-if="props.view.icon" :name="props.view.icon" />
      <slot v-else name="icon" />
    </template>
    <Badge
      v-if="showBadge"
      :class="
        cn(
          'ms-1 h-5 min-w-5 px-1',
          props.view.badgeColor && colorClass(badgeColorClasses, props.view.badgeColor, 'primary'),
        )
      "
      >{{ props.view.badge }}</Badge
    >
  </Button>
</template>
