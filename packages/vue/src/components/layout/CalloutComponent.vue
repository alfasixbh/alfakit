<script setup lang="ts">
import type { CalloutSchema } from '@alfakit/core'
import { actionsAlignmentClass } from '@alfakit/core'
import { computed } from 'vue'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'
import MixedContent from './MixedContent.vue'

const CALLOUT_COLORS: Record<string, string> = {
  primary: 'border-primary/30 bg-primary/5 [&_[data-slot=callout-icon]]:text-primary',
  secondary: 'border-border bg-secondary [&_[data-slot=callout-icon]]:text-secondary-foreground',
  success: 'border-success/30 bg-success/5 [&_[data-slot=callout-icon]]:text-success',
  warning: 'border-warning/40 bg-warning/10 [&_[data-slot=callout-icon]]:text-warning',
  danger: 'border-destructive/30 bg-destructive/5 [&_[data-slot=callout-icon]]:text-destructive',
  info: 'border-info/30 bg-info/5 [&_[data-slot=callout-icon]]:text-info',
  gray: 'border-border bg-muted/40 [&_[data-slot=callout-icon]]:text-muted-foreground',
}

const CALLOUT_ICON_SIZES: Record<string, string> = {
  xs: 'size-4',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-7',
  '2xl': 'size-8',
}

const props = defineProps<{ component: CalloutSchema }>()
const context = usePageActionContext()
const tone = computed(() => props.component.color ?? props.component.status)
// `iconColor()`, or the status colour once `color(null)` removed the background.
const iconColor = computed(
  () => props.component.iconColor ?? (props.component.color ? undefined : props.component.status),
)
</script>

<template>
  <div
    data-slot="callout"
    :data-color="props.component.color ?? 'gray'"
    :data-status="props.component.status"
    :role="tone === 'danger' || tone === 'warning' ? 'alert' : 'note'"
    :class="
      cn(
        'flex items-start gap-3 rounded-lg border p-4 text-sm',
        colorClass(CALLOUT_COLORS, props.component.color),
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <span v-if="props.component.icon" data-slot="callout-icon" class="mt-0.5 shrink-0">
      <Icon
        :name="props.component.icon"
        :class="
          cn(
            (props.component.iconSize && CALLOUT_ICON_SIZES[props.component.iconSize]) || 'size-5',
            iconColor && colorClass(textColorClasses, iconColor),
          )
        "
      />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p v-if="props.component.heading" class="leading-6 font-semibold">
        {{ props.component.heading }}
      </p>
      <div
        v-if="props.component.description"
        class="text-muted-foreground alfakit-prose"
        v-html="props.component.description"
      />
      <ActionList
        v-if="props.component.actions && props.component.actions.length > 0"
        :actions="props.component.actions"
        :context="context"
        size="sm"
        :class="cn('mt-2', actionsAlignmentClass(props.component.footerActionsAlignment))"
      />
      <MixedContent :items="props.component.footer" name="callout-footer" class="mt-2" />
    </div>
    <MixedContent
      :items="props.component.controls"
      name="callout-controls"
      class="-me-1 -mt-1 shrink-0 gap-1"
    />
  </div>
</template>
