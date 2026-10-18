<script setup lang="ts">
import type { ToggleButtonsSchema } from '@alfakit/core'
import {
  fieldIds,
  gridColumnsClasses,
  isOptionGroup,
  toggleButtonsNext,
  toggleButtonsSelected,
} from '@alfakit/core'
import { computed } from 'vue'
import { solidButtonColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import TooltipProvider from '../ui/TooltipProvider.vue'
import OptionTooltip from './OptionTooltip.vue'

/**
 * Buttons acting as a radio group (or, when `multiple`, a set of toggles). Each button
 * reports its state with `aria-pressed`; the selected one takes the option's colour.
 */
const props = defineProps<{ component: ToggleButtonsSchema }>()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown>(
  () => props.component,
)
const multiple = computed(() => Boolean(props.component.multiple))
const selected = computed(() => toggleButtonsSelected(value.value, multiple.value))
const locked = computed(() => disabled.value || readOnly.value)
const options = computed(() =>
  props.component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
)

/** `gridDirection('column')`: buttons flow down each column. Spelled out for Tailwind. */
const COLUMN_FLOW_CLASSES: Record<number, string> = {
  2: 'md:columns-2',
  3: 'md:columns-3',
  4: 'md:columns-4',
  5: 'md:columns-5',
  6: 'md:columns-6',
}
// `columns()`: a grid of full-width buttons (inline and grouped layouts stay a row).
const grid = computed(
  () =>
    !props.component.inline && !props.component.grouped && (props.component.gridColumns ?? 0) > 1,
)
const columnFlow = computed(() => grid.value && props.component.gridDirection === 'column')

/** `size()`: height, padding and text of the buttons (medium is the default). */
const SIZE_CLASSES: Record<string, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
  xl: 'h-11 px-5 text-base',
}
const fullWidth = computed(() => Boolean(props.component.fullWidth))
// Any other `size()` string is a CSS class for the buttons.
const sizeClasses = computed(
  () => SIZE_CLASSES[props.component.size ?? 'md'] ?? cn(SIZE_CLASSES.md, props.component.size),
)
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <TooltipProvider>
      <div
        :id="id"
        role="group"
        data-slot="toggle-buttons"
        :aria-labelledby="props.component.label ? fieldIds(id).label : undefined"
        :aria-describedby="aria['aria-describedby']"
        :data-grid-direction="grid ? (props.component.gridDirection ?? 'row') : undefined"
        :class="
          cn(
            grid
              ? columnFlow
                ? cn(
                    'gap-x-2 *:mb-2 *:w-full',
                    COLUMN_FLOW_CLASSES[props.component.gridColumns ?? 1],
                  )
                : cn(
                    'grid gap-2',
                    gridColumnsClasses({ default: 1, md: props.component.gridColumns ?? 1 }),
                  )
              : 'flex gap-2',
            !grid &&
              (props.component.inline
                ? 'flex-row flex-wrap'
                : cn('flex-col', fullWidth ? 'items-stretch' : 'items-start')),
            props.component.grouped &&
              cn('gap-0 rounded-md shadow-xs', fullWidth ? 'w-full' : 'w-fit'),
            fullWidth && 'w-full',
          )
        "
      >
        <OptionTooltip
          v-for="option in options"
          :key="option.value"
          :text="props.component.tooltips?.[option.value]"
        >
          <button
            type="button"
            :aria-pressed="selected.includes(option.value)"
            :aria-label="props.component.iconsOnly ? option.label : undefined"
            :title="props.component.iconsOnly ? option.label : undefined"
            :disabled="locked || option.disabled"
            :data-state="selected.includes(option.value) ? 'on' : 'off'"
            :class="
              cn(
                'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
                sizeClasses,
                fullWidth && props.component.inline && 'flex-1',
                selected.includes(option.value)
                  ? cn('border-transparent', solidButtonColorClasses[option.color ?? 'primary'])
                  : 'bg-background hover:bg-accent hover:text-accent-foreground',
                props.component.grouped &&
                  'rounded-none shadow-none not-first:-ms-px first:rounded-s-md last:rounded-e-md focus-visible:z-10',
                readOnly && 'disabled:opacity-100',
              )
            "
            @click="setValue(toggleButtonsNext(value, option.value, multiple))"
          >
            <Icon v-if="option.icon" :name="option.icon" class="size-4" />
            <span v-if="!props.component.iconsOnly">{{ option.label }}</span>
          </button>
        </OptionTooltip>
      </div>
    </TooltipProvider>
  </FieldWrapper>
</template>
