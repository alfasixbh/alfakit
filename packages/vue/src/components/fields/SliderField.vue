<script setup lang="ts">
import type { SliderSchema } from '@alfakit/core'
import {
  fieldIds,
  sliderBehavior,
  sliderBlocksTap,
  sliderDirection,
  sliderFillSections,
  sliderFillStyle,
  sliderFromPrimitive,
  sliderHasTooltips,
  sliderNextValues,
  sliderPips,
  sliderPrimitive,
  sliderShowsTooltip,
  sliderSnap,
  sliderState,
  sliderToPrimitive,
  sliderValues,
  startSliderRangeDrag,
} from '@alfakit/core'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed, ref } from 'vue'
import { useDirection, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'

/**
 * A slider with one thumb, or several for a range. Built on Reka Slider, which handles
 * pointer and keyboard input and mirrors itself in right-to-left layouts (`dir`). Values,
 * tooltips and pips are formatted with the panel's locale.
 */
const props = defineProps<{ component: SliderSchema }>()
const t = useT()
const panelDir = useDirection()
// `rtl()` overrides the panel's direction.
const dir = computed(() => sliderDirection(props.component, panelDir.value))
const formatter = useFormatter()
const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<unknown>(
  () => props.component,
)
const values = computed(() => sliderValues(value.value, props.component))
const pips = computed(() => (props.component.pips ? sliderPips(props.component) : []))
const vertical = computed(() => Boolean(props.component.vertical))
// `vertical(isTopToBottom: true)`: the minimum at the top.
const topToBottom = computed(() => vertical.value && Boolean(props.component.topToBottom))
const behavior = computed(() => sliderBehavior(props.component))
// `Behavior::SmoothSteps`: no snapping while a pointer drags a thumb.
const smooth = ref(false)
const primitive = computed(() => sliderPrimitive(props.component, smooth.value))
const locked = computed(() => disabled.value || readOnly.value)

const change = (next: number[]) =>
  setValue(sliderState(sliderNextValues(values.value, next, props.component), props.component))

const onModelValue = (next: number[] | undefined) => {
  if (next) change(sliderFromPrimitive(next, props.component, !smooth.value))
}

const onCommit = () => {
  if (smooth.value) {
    smooth.value = false
    change(values.value.map((thumb) => sliderSnap(thumb, props.component)))
  }

  blur()
}

// Before the primitive sees the press: start a range drag, or swallow taps on the track.
const onPointerDownCapture = (event: PointerEvent) => {
  if (locked.value) return

  const target = event.target as Element
  const track = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
    '[data-slot="slider-track"]',
  )

  if (behavior.value.has('drag') && target.closest('[data-slot="slider-range"]') && track) {
    startSliderRangeDrag(event, {
      track,
      values: values.value,
      schema: props.component,
      direction: dir.value,
      vertical: vertical.value,
      topToBottom: topToBottom.value,
      onChange: (next) => setValue(sliderState(next, props.component)),
      onEnd: () => blur(),
    })

    return
  }

  if (sliderBlocksTap(target, props.component)) {
    event.stopPropagation()

    return
  }

  if (behavior.value.has('smooth-steps') && target.closest('[role="slider"]')) smooth.value = true
}
// `fillTrack([…])`: chosen sections are drawn here; the primitive's range stays clear.
const fillSections = computed(() => sliderFillSections(values.value, props.component))
const fill = computed(
  () =>
    fillSections.value === null && (props.component.fillTrack === true || values.value.length > 1),
)

const format = (number: number) =>
  formatter.value.number(number, {
    maximumFractionDigits: props.component.decimalPlaces ?? 10,
    minimumFractionDigits: props.component.decimalPlaces ?? 0,
  })

const thumbLabel = (index: number) => {
  if (values.value.length === 1) return undefined
  if (values.value.length === 2) {
    return index === 0 ? t('slider.minimum', {}, 'Minimum') : t('slider.maximum', {}, 'Maximum')
  }

  return t('slider.thumb', { number: index + 1 }, 'Value :number')
}

// Reka puts the minimum at the bottom of a vertical slider and at the inline start of a
// horizontal one (the right in RTL).
const pipStyle = (percent: number) =>
  vertical.value
    ? topToBottom.value
      ? { top: `${percent}%` }
      : { bottom: `${percent}%` }
    : dir.value === 'rtl'
      ? { right: `${percent}%` }
      : { left: `${percent}%` }
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="`${id}-thumb-0`" :error="error">
    <div
      data-slot="slider"
      :class="
        cn(
          'px-2',
          sliderHasTooltips(props.component) && !vertical && 'pt-7',
          pips.length > 0 && 'pb-6',
        )
      "
      @pointerdown.capture="onPointerDownCapture"
    >
      <SliderRoot
        :id="id"
        :dir="dir"
        :min="primitive.min"
        :max="primitive.max"
        :step="primitive.step"
        :min-steps-between-thumbs="
          props.component.minDifference && !primitive.nonLinear
            ? Math.round(props.component.minDifference / props.component.step)
            : 0
        "
        :orientation="vertical ? 'vertical' : 'horizontal'"
        :inverted="topToBottom"
        :disabled="locked"
        :model-value="sliderToPrimitive(values, props.component)"
        :class="
          cn(
            'relative flex touch-none items-center select-none data-[disabled]:opacity-50',
            vertical ? 'h-48 w-5 flex-col' : 'w-full',
            readOnly && 'data-[disabled]:opacity-100',
          )
        "
        @update:model-value="onModelValue"
        @value-commit="onCommit"
      >
        <SliderTrack
          data-slot="slider-track"
          :class="
            cn(
              'bg-muted relative grow overflow-hidden rounded-full',
              vertical ? 'h-full w-1.5' : 'h-1.5 w-full',
            )
          "
        >
          <span
            v-for="section in fillSections ?? []"
            :key="`${section.start}-${section.end}`"
            data-slot="slider-fill"
            aria-hidden="true"
            :class="cn('bg-primary absolute', vertical ? 'w-full' : 'h-full')"
            :style="sliderFillStyle(section, { vertical, topToBottom, direction: dir })"
          />
          <SliderRange
            data-slot="slider-range"
            :class="
              cn(
                'absolute',
                fill ? 'bg-primary' : 'bg-transparent',
                vertical ? 'w-full' : 'h-full',
                behavior.has('drag') && values.length > 1 && !locked && 'cursor-grab',
              )
            "
          />
        </SliderTrack>
        <SliderThumb
          v-for="(thumb, index) in values"
          :id="`${id}-thumb-${index}`"
          :key="index"
          :aria-label="thumbLabel(index)"
          :aria-labelledby="
            values.length === 1 && props.component.label ? fieldIds(id).label : undefined
          "
          :aria-describedby="aria['aria-describedby']"
          :aria-valuetext="format(thumb)"
          class="border-primary bg-background ring-ring/50 relative block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none"
        >
          <span
            v-if="sliderShowsTooltip(props.component, index)"
            aria-hidden="true"
            :class="
              cn(
                'bg-foreground text-background pointer-events-none absolute rounded px-1.5 py-0.5 text-xs whitespace-nowrap tabular-nums',
                vertical
                  ? 'start-6 top-1/2 -translate-y-1/2'
                  : 'bottom-6 left-1/2 -translate-x-1/2',
              )
            "
            >{{ format(thumb) }}</span
          >
        </SliderThumb>
        <div
          v-if="pips.length > 0"
          aria-hidden="true"
          :class="
            cn('pointer-events-none absolute', vertical ? 'inset-y-0 start-6' : 'inset-x-0 top-4')
          "
        >
          <span
            v-for="pip in pips"
            :key="pip.value"
            :style="pipStyle(pip.percent)"
            :class="
              cn(
                'absolute flex items-center gap-1',
                vertical
                  ? cn('flex-row', topToBottom ? '-translate-y-1/2' : 'translate-y-1/2')
                  : 'flex-col',
                !vertical && (dir === 'rtl' ? 'translate-x-1/2' : '-translate-x-1/2'),
              )
            "
          >
            <span
              :class="
                cn(
                  'bg-border block',
                  vertical ? 'h-px' : 'w-px',
                  pip.labelled && !pip.small
                    ? vertical
                      ? 'w-2'
                      : 'h-2'
                    : vertical
                      ? 'w-1'
                      : 'h-1',
                )
              "
            />
            <span
              v-if="pip.labelled"
              :class="
                cn('text-muted-foreground tabular-nums', pip.small ? 'text-[0.625rem]' : 'text-xs')
              "
              >{{ format(pip.value) }}</span
            >
          </span>
        </div>
      </SliderRoot>
    </div>
  </FieldWrapper>
</template>
