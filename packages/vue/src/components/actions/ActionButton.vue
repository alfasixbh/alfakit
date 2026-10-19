<script setup lang="ts">
import type { ActionContext, ActionSchema } from '@alfakit/core'
import {
  bindsKeyBindings,
  formatKeyBinding,
  iconButtonSize,
  isActionLoading,
  isActionProcessing,
  registerKeyBindings,
  resolveActionSize,
} from '@alfakit/core'
import { Link } from '@inertiajs/vue3'
import { computed, watchEffect, type HTMLAttributes } from 'vue'
import { useStoreSelector } from '../../composables/use-store'
import { useActionRunner, useT } from '../../context'
import {
  badgeColorClasses,
  colorClass,
  ghostButtonColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Spinner from '../ui/Spinner.vue'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'

export interface ActionButtonProps {
  action: ActionSchema
  context: ActionContext
  size?: 'xs' | 'sm' | 'default' | 'lg'
  class?: HTMLAttributes['class']
  /** Force a variant (e.g. menu items render as plain rows). */
  variant?: ActionSchema['variant']
  /** Bind the action's key bindings globally while mounted. */
  withKeyBindings?: boolean
  /** Override how the action runs (e.g. a form submits its values). */
  onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
}

const props = withDefaults(defineProps<ActionButtonProps>(), {
  size: 'default',
  withKeyBindings: true,
})

const runner = useActionRunner()
// Only this run (this record's button), not the same action in every table row.
const loading = useStoreSelector(runner.store, (state) =>
  isActionLoading(state, props.action, props.context),
)
const processing = useStoreSelector(runner.store, (state) =>
  isActionProcessing(state, props.action, props.context),
)

const variant = computed(
  () =>
    props.variant ??
    (props.action.outlined
      ? 'outline'
      : (props.action.variant ??
        (props.action.hasAction || props.action.hasModal || props.action.url ? 'link' : 'button'))),
)
const isIconOnly = computed(() => variant.value === 'icon-button' || !props.action.label)
const busy = computed(() => loading.value || processing.value)
// A disabled link renders as a disabled button so it cannot navigate.
const isPlainLink = computed(() =>
  Boolean(
    props.action.url && !props.action.hasAction && !props.action.hasModal && !props.action.disabled,
  ),
)
// Record actions repeat per row: a global shortcut would run them for every record.
const bindsKeys = computed(
  () => props.withKeyBindings && bindsKeyBindings(props.action, props.context),
)

/** The badge trigger style (`badge()` without an argument). */
const BADGE_TRIGGER_CLASSES =
  "h-auto min-h-6 gap-1 rounded-md border px-2 py-0.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5"

function buttonClasses(action: ActionSchema, kind: ActionSchema['variant']): string {
  const color = action.color ?? 'primary'

  switch (kind) {
    case 'outline':
      return cn('bg-background border', colorClass(outlineButtonColorClasses, color, 'gray'))
    case 'ghost':
      return colorClass(ghostButtonColorClasses, color, 'gray')
    case 'link':
      return cn(
        'h-auto p-0 underline-offset-4 hover:underline has-[>svg]:px-0',
        colorClass(textColorClasses, color, 'primary'),
      )
    case 'icon-button':
      return colorClass(ghostButtonColorClasses, color, 'gray')
    case 'badge':
      // `badge()`: a tinted pill in the action's colour.
      return cn(BADGE_TRIGGER_CLASSES, colorClass(badgeColorClasses, color, 'primary'))
    default:
      return colorClass(solidButtonColorClasses, color, 'primary')
  }
}

const run = () =>
  void (props.onTrigger
    ? props.onTrigger(props.action, props.context)
    : runner.trigger(props.action, props.context))

watchEffect((onCleanup) => {
  if (!bindsKeys.value || !props.action.keyBindings) {
    return
  }

  onCleanup(registerKeyBindings([{ keys: props.action.keyBindings, handler: run }]))
})

const onClick = (event: MouseEvent) => {
  if (isPlainLink.value) {
    return // Plain link: let Inertia Link / anchor handle it.
  }

  event.preventDefault()
  run()
}

const sizeProp = computed(() => {
  const size = variant.value === 'badge' ? 'xs' : resolveActionSize(props.action.size, props.size)

  return isIconOnly.value ? iconButtonSize(size) : size
})
// `labeledFrom()`: icon only below the breakpoint; the label stays the accessible name.
const LABEL_FROM: Record<string, string> = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
  xl: 'hidden xl:inline',
  '2xl': 'hidden 2xl:inline',
}
const ICON_ONLY_BELOW: Record<string, string> = {
  sm: 'max-sm:aspect-square max-sm:px-0',
  md: 'max-md:aspect-square max-md:px-0',
  lg: 'max-lg:aspect-square max-lg:px-0',
  xl: 'max-xl:aspect-square max-xl:px-0',
  '2xl': 'max-2xl:aspect-square max-2xl:px-0',
}
const labeledFrom = computed(() =>
  !isIconOnly.value && props.action.icon && props.action.labeledFrom
    ? props.action.labeledFrom
    : null,
)
const labelClass = computed(() => (labeledFrom.value ? LABEL_FROM[labeledFrom.value] : undefined))
const classes = computed(() =>
  cn(
    buttonClasses(props.action, variant.value),
    labeledFrom.value && ICON_ONLY_BELOW[labeledFrom.value],
    props.class,
  ),
)
const t = useT()
const newTabHint = computed(() => t('opens_in_new_tab', {}, '(opens in a new tab)'))
const ariaLabel = computed(() => {
  if (!isIconOnly.value && !labeledFrom.value) return undefined

  const name = props.action.label ?? props.action.tooltip ?? props.action.name

  return isPlainLink.value && props.action.openUrlInNewTab ? `${name} ${newTabHint.value}` : name
})
const tooltip = computed(
  () => props.action.tooltip ?? (isIconOnly.value ? props.action.label : undefined),
)
const shortcut = computed(() => (bindsKeys.value ? props.action.keyBindings?.[0] : undefined))
const disabledTooltip = computed(() => Boolean(props.action.disabled && tooltip.value))
</script>

<template>
  <Tooltip v-if="tooltip || shortcut">
    <!-- A disabled button gets no pointer or focus events: a focusable span carries the
         tooltip (e.g. the reason from `authorizationTooltip()`). -->
    <TooltipTrigger
      :as-child="!disabledTooltip"
      :as="disabledTooltip ? 'span' : undefined"
      :tabindex="disabledTooltip ? 0 : undefined"
      :class="disabledTooltip ? 'inline-flex' : undefined"
      :data-disabled-tooltip="disabledTooltip ? '' : undefined"
    >
      <Button
        v-if="isPlainLink && props.action.openUrlInNewTab"
        as-child
        variant="plain"
        :size="sizeProp"
        :class="classes"
        :disabled="props.action.disabled"
        :aria-label="ariaLabel"
        v-bind="props.action.extraAttributes"
      >
        <a :href="props.action.url" target="_blank" rel="noopener noreferrer">
          <Spinner v-if="busy" />
          <Icon
            v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
            :name="props.action.icon"
          />
          <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
          <span v-if="!isIconOnly" class="sr-only"> {{ newTabHint }}</span>
          <Icon
            v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
            :name="props.action.icon"
          />
          <Badge
            v-if="props.action.badge !== undefined && props.action.badge !== null"
            variant="outline"
            :class="
              cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
            "
            >{{ props.action.badge }}</Badge
          >
        </a>
      </Button>
      <Button
        v-else-if="isPlainLink"
        as-child
        variant="plain"
        :size="sizeProp"
        :class="classes"
        :disabled="props.action.disabled"
        :aria-label="ariaLabel"
        v-bind="props.action.extraAttributes"
      >
        <Link :href="props.action.url ?? '#'">
          <Spinner v-if="busy" />
          <Icon
            v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
            :name="props.action.icon"
          />
          <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
          <Icon
            v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
            :name="props.action.icon"
          />
          <Badge
            v-if="props.action.badge !== undefined && props.action.badge !== null"
            variant="outline"
            :class="
              cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
            "
            >{{ props.action.badge }}</Badge
          >
        </Link>
      </Button>
      <Button
        v-else
        type="button"
        variant="plain"
        :size="sizeProp"
        :class="classes"
        :disabled="props.action.disabled || busy"
        :aria-label="ariaLabel"
        v-bind="props.action.extraAttributes"
        @click="onClick"
      >
        <Spinner v-if="busy" />
        <Icon
          v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
          :name="props.action.icon"
        />
        <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
        <Icon
          v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
          :name="props.action.icon"
        />
        <Badge
          v-if="props.action.badge !== undefined && props.action.badge !== null"
          variant="outline"
          :class="
            cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
          "
          >{{ props.action.badge }}</Badge
        >
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {{ tooltip }}
      <kbd
        v-if="shortcut"
        dir="ltr"
        class="ms-2 rounded border border-white/20 px-1 font-mono text-[10px]"
        >{{ formatKeyBinding(shortcut) }}</kbd
      >
    </TooltipContent>
  </Tooltip>
  <template v-else>
    <Button
      v-if="isPlainLink && props.action.openUrlInNewTab"
      as-child
      variant="plain"
      :size="sizeProp"
      :class="classes"
      :disabled="props.action.disabled"
      :aria-label="ariaLabel"
      v-bind="props.action.extraAttributes"
    >
      <a :href="props.action.url" target="_blank" rel="noopener noreferrer">
        <Spinner v-if="busy" />
        <Icon
          v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
          :name="props.action.icon"
        />
        <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
        <span v-if="!isIconOnly" class="sr-only"> {{ newTabHint }}</span>
        <Icon
          v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
          :name="props.action.icon"
        />
        <Badge
          v-if="props.action.badge !== undefined && props.action.badge !== null"
          variant="outline"
          :class="
            cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
          "
          >{{ props.action.badge }}</Badge
        >
      </a>
    </Button>
    <Button
      v-else-if="isPlainLink"
      as-child
      variant="plain"
      :size="sizeProp"
      :class="classes"
      :disabled="props.action.disabled"
      :aria-label="ariaLabel"
      v-bind="props.action.extraAttributes"
    >
      <Link :href="props.action.url ?? '#'">
        <Spinner v-if="busy" />
        <Icon
          v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
          :name="props.action.icon"
        />
        <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
        <Icon
          v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
          :name="props.action.icon"
        />
        <Badge
          v-if="props.action.badge !== undefined && props.action.badge !== null"
          variant="outline"
          :class="
            cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
          "
          >{{ props.action.badge }}</Badge
        >
      </Link>
    </Button>
    <Button
      v-else
      type="button"
      variant="plain"
      :size="sizeProp"
      :class="classes"
      :disabled="props.action.disabled || busy"
      :aria-label="ariaLabel"
      v-bind="props.action.extraAttributes"
      @click="onClick"
    >
      <Spinner v-if="busy" />
      <Icon
        v-else-if="props.action.icon && props.action.iconPosition !== 'after'"
        :name="props.action.icon"
      />
      <span v-if="!isIconOnly" :class="labelClass">{{ props.action.label }}</span>
      <Icon
        v-if="props.action.icon && props.action.iconPosition === 'after' && !busy"
        :name="props.action.icon"
      />
      <Badge
        v-if="props.action.badge !== undefined && props.action.badge !== null"
        variant="outline"
        :class="
          cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, props.action.badgeColor, 'gray'))
        "
        >{{ props.action.badge }}</Badge
      >
    </Button>
  </template>
</template>
