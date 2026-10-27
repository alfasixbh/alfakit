<script setup lang="ts">
import type { TextSchema } from '@alfakit/core'
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Tooltip from '../ui/Tooltip.vue'
import TooltipContent from '../ui/TooltipContent.vue'
import TooltipTrigger from '../ui/TooltipTrigger.vue'

const SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const WEIGHTS: Record<string, string> = {
  thin: 'font-thin',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
}
const FONT_FAMILIES: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

const props = defineProps<{ component: TextSchema }>()
const t = useT()
const copied = ref(false)

// `color('neutral')` is the regular text colour (and a gray badge).
const textColor = computed(() => {
  const color = props.component.color

  if (!color) return undefined

  return color === 'neutral' ? 'text-foreground' : textColorClasses[color]
})
const fontFamily = computed(() =>
  props.component.fontFamily ? FONT_FAMILIES[props.component.fontFamily] : undefined,
)

// Called with .prevent.stop: the text may sit inside a link.
function copy() {
  void navigator.clipboard?.writeText(props.component.content).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, props.component.copyMessageDuration ?? 1500)
  })
}
</script>

<template>
  <Tooltip v-if="props.component.tooltip">
    <TooltipTrigger as-child>
      <span class="inline-flex w-fit">
        <TextComponent :component="{ ...props.component, tooltip: undefined }" />
      </span>
    </TooltipTrigger>
    <TooltipContent>{{ props.component.tooltip }}</TooltipContent>
  </Tooltip>
  <Badge
    v-else-if="props.component.badge"
    variant="outline"
    :class="
      cn(
        colorClass(
          badgeColorClasses,
          props.component.color === 'neutral' ? 'gray' : props.component.color,
          'gray',
        ),
        fontFamily,
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <Icon v-if="props.component.icon" :name="props.component.icon" />
    {{ props.component.content }}
    <template v-if="props.component.copyable">
      <button
        type="button"
        data-slot="text-copy"
        class="text-muted-foreground hover:text-foreground shrink-0"
        :aria-label="t('copy', {}, 'Copy')"
        @click.prevent.stop="copy"
      >
        <CheckIcon v-if="copied" class="size-3.5" />
        <CopyIcon v-else class="size-3.5" />
      </button>
      <span
        v-if="copied"
        role="status"
        :class="cn('text-xs', !props.component.copyMessage && 'sr-only')"
        >{{ props.component.copyMessage ?? t('copied', {}, 'Copied') }}</span
      >
    </template>
  </Badge>
  <p
    v-else
    :class="
      cn(
        'flex items-center gap-1.5 text-sm',
        props.component.size && SIZES[props.component.size],
        props.component.weight && WEIGHTS[props.component.weight],
        fontFamily,
        textColor,
      )
    "
    v-bind="props.component.extraAttributes"
  >
    <Icon v-if="props.component.icon" :name="props.component.icon" />
    <!-- A long value (a URL path) breaks here instead of pushing the copy button out. -->
    <span class="min-w-0 break-words">{{ props.component.content }}</span>
    <template v-if="props.component.copyable">
      <button
        type="button"
        data-slot="text-copy"
        class="text-muted-foreground hover:text-foreground shrink-0"
        :aria-label="t('copy', {}, 'Copy')"
        @click.prevent.stop="copy"
      >
        <CheckIcon v-if="copied" class="size-3.5" />
        <CopyIcon v-else class="size-3.5" />
      </button>
      <span
        v-if="copied"
        role="status"
        :class="cn('text-xs', !props.component.copyMessage && 'sr-only')"
        >{{ props.component.copyMessage ?? t('copied', {}, 'Copied') }}</span
      >
    </template>
  </p>
</template>
