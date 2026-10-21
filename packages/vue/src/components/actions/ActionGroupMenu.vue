<script setup lang="ts">
import type {
  ActionButtonSize,
  ActionContext,
  ActionGroupSchema,
  ActionSchema,
} from '@alfakit/core'
import {
  bindsKeyBindings,
  flattenActionGroup,
  iconButtonSize,
  parseDropdownPlacement,
  registerKeyBindings,
  resolveActionSize,
} from '@alfakit/core'
import { computed, useTemplateRef, watchEffect } from 'vue'
import { useActionRunner, useT } from '../../context'
import { colorClass, ghostButtonColorClasses, outlineButtonColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'
import ActionButton from './ActionButton.vue'
import ActionGroupItems from './ActionGroupItems.vue'

const props = withDefaults(
  defineProps<{
    group: ActionGroupSchema
    context: ActionContext
    size?: ActionButtonSize
    onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
  }>(),
  { size: 'default' },
)

// With a tooltip, the menu's trigger sits inside the tooltip's popper, so reka-ui hands the
// trigger to the tooltip as its anchor and the menu would open off screen (at its unpositioned
// `translate(0, -200%)`): anchor the menu to the button explicitly.
const tooltipTrigger = useTemplateRef<{ $el?: Element }>('tooltipTrigger')
const tooltipTriggerElement = computed(() =>
  props.group.tooltip && tooltipTrigger.value?.$el instanceof Element
    ? tooltipTrigger.value.$el
    : undefined,
)

/** `dropdownWidth()`: widths of the dropdown, spelled out for Tailwind. */
const DROPDOWN_WIDTHS: Record<string, string> = {
  '3xs': 'w-3xs',
  '2xs': 'w-2xs',
  xs: 'w-xs',
  sm: 'w-sm',
  md: 'w-md',
  lg: 'w-lg',
  xl: 'w-xl',
  '2xl': 'w-2xl',
  '3xl': 'w-3xl',
  '4xl': 'w-4xl',
  '5xl': 'w-5xl',
  '6xl': 'w-6xl',
  '7xl': 'w-7xl',
  none: 'w-auto',
  min: 'w-min',
  max: 'w-max',
  fit: 'w-fit',
  prose: 'w-[65ch]',
  container: 'container',
  'screen-sm': 'w-(--breakpoint-sm)',
  'screen-md': 'w-(--breakpoint-md)',
  'screen-lg': 'w-(--breakpoint-lg)',
  'screen-xl': 'w-(--breakpoint-xl)',
  'screen-2xl': 'w-(--breakpoint-2xl)',
  full: 'w-[calc(100vw-2rem)]',
  screen: 'w-screen',
}

// `buttonGroup()` and `dropdown(false)`: the actions render inline instead of a dropdown.
const isInline = computed(() => Boolean(props.group.buttonGroup) || props.group.dropdown === false)
const inlineActions = computed(() =>
  flattenActionGroup(props.group.actions).map((action) =>
    props.group.buttonGroup && action.variant !== 'icon-button'
      ? { ...action, variant: 'outline' as const }
      : action,
  ),
)
const inlineSize = computed(() => resolveActionSize(props.group.size, props.size))
const contentClass = computed(() =>
  cn(
    props.group.dropdownWidth && DROPDOWN_WIDTHS[props.group.dropdownWidth],
    props.group.maxHeight && 'overflow-y-auto',
  ),
)
const contentStyle = computed(() =>
  props.group.maxHeight ? { maxHeight: props.group.maxHeight } : undefined,
)

const t = useT()
const runner = useActionRunner()
const isIconOnly = computed(() => !props.group.label || props.group.variant === 'icon-button')
const buttonSize = computed(() => {
  const size = resolveActionSize(props.group.size, props.size)

  return isIconOnly.value ? iconButtonSize(size) : size
})
const placement = computed(() => parseDropdownPlacement(props.group.dropdownPlacement))
const triggerClass = computed(() =>
  cn(
    props.group.color &&
      colorClass(
        props.group.variant === 'button' ? outlineButtonColorClasses : ghostButtonColorClasses,
        props.group.color,
      ),
  ),
)

// Shortcuts of the actions inside the group work like those of standalone buttons (and,
// like them, never for record rows).
watchEffect((onCleanup) => {
  const bindings = flattenActionGroup(props.group.actions)
    .filter((action) => bindsKeyBindings(action, props.context))
    .map((action) => ({
      keys: action.keyBindings ?? [],
      handler: () => void runner.trigger(action, props.context),
    }))

  if (bindings.length) onCleanup(registerKeyBindings(bindings))
})
</script>

<template>
  <div
    v-if="isInline && props.group.buttonGroup"
    role="group"
    :aria-label="props.group.label ?? props.group.tooltip"
    data-slot="button-group"
    class="inline-flex items-stretch rounded-md shadow-xs [&>*]:rounded-none [&>*]:shadow-none [&>*:first-child]:rounded-s-md [&>*:focus-visible]:z-10 [&>*:last-child]:rounded-e-md [&>*:not(:first-child)]:-ms-px"
  >
    <ActionButton
      v-for="action in inlineActions"
      :key="action.name"
      :action="action"
      :context="props.context"
      :size="inlineSize"
      :on-trigger="props.onTrigger"
    />
  </div>
  <template v-else-if="isInline">
    <ActionButton
      v-for="action in inlineActions"
      :key="action.name"
      :action="action"
      :context="props.context"
      :size="inlineSize"
      :on-trigger="props.onTrigger"
    />
  </template>
  <DropdownMenu v-else>
    <Tooltip v-if="props.group.tooltip">
      <TooltipTrigger as-child>
        <DropdownMenuTrigger as-child>
          <Button
            ref="tooltipTrigger"
            type="button"
            :variant="props.group.variant === 'button' ? 'outline' : 'ghost'"
            :size="buttonSize"
            :class="triggerClass"
            :aria-label="
              isIconOnly
                ? (props.group.label ?? props.group.tooltip ?? t('actions', {}, 'Actions'))
                : undefined
            "
          >
            <Icon :name="props.group.icon ?? 'ellipsis-vertical'" />
            <span v-if="!isIconOnly">{{ props.group.label }}</span>
          </Button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent>{{ props.group.tooltip }}</TooltipContent>
    </Tooltip>
    <DropdownMenuTrigger v-else as-child>
      <Button
        type="button"
        :variant="props.group.variant === 'button' ? 'outline' : 'ghost'"
        :size="buttonSize"
        :class="triggerClass"
        :aria-label="
          isIconOnly
            ? (props.group.label ?? props.group.tooltip ?? t('actions', {}, 'Actions'))
            : undefined
        "
      >
        <Icon :name="props.group.icon ?? 'ellipsis-vertical'" />
        <span v-if="!isIconOnly">{{ props.group.label }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :reference="tooltipTriggerElement"
      :side="placement.side"
      :align="placement.align"
      :side-offset="props.group.dropdownOffset ?? undefined"
      :class="contentClass"
      :style="contentStyle"
    >
      <ActionGroupItems :actions="props.group.actions" :context="props.context" />
      <template v-if="props.group.actions.length === 0">
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>—</DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
