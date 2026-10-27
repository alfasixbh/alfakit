<script lang="ts">
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
  import { Slider as SliderPrimitive } from 'bits-ui'
  import { useDirection, useFormatter, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'

  let { component }: { component: SliderSchema } = $props()

  /**
   * A slider with one thumb, or several for a range. Built on Bits UI Slider, which handles
   * pointer and keyboard input and mirrors itself in right-to-left layouts (`dir`). Values,
   * tooltips and pips are formatted with the panel's locale.
   */
  const t = useT()
  const panelDir = $derived(useDirection())
  // `rtl()` overrides the panel's direction.
  const dir = $derived(sliderDirection(component, panelDir))
  const formatter = useFormatter()
  const field = useField<unknown>(() => component)
  const values = $derived(sliderValues(field.value, component))
  const pips = $derived(component.pips ? sliderPips(component) : [])
  const vertical = $derived(Boolean(component.vertical))
  // `vertical(isTopToBottom: true)`: the minimum at the top.
  const topToBottom = $derived(vertical && Boolean(component.topToBottom))
  // Bits UI runs a vertical track top to bottom when its `dir` is `rtl`.
  const primitiveDir = $derived(vertical ? (topToBottom ? 'rtl' : 'ltr') : dir)
  // `fillTrack([…])`: chosen sections are drawn here; the primitive's range stays clear.
  const fillSections = $derived(sliderFillSections(values, component))
  const fill = $derived(
    fillSections === null && (component.fillTrack === true || values.length > 1),
  )
  const behavior = $derived(sliderBehavior(component))
  // `Behavior::SmoothSteps`: no snapping while a pointer drags a thumb.
  let smooth = $state(false)
  const primitive = $derived(sliderPrimitive(component, smooth))
  const locked = $derived(field.disabled || field.readOnly)

  const change = (next: number[]) =>
    field.setValue(sliderState(sliderNextValues(values, next, component), component))

  const commit = () => {
    if (smooth) {
      smooth = false
      change(values.map((thumb) => sliderSnap(thumb, component)))
    }

    field.blur()
  }

  // Before the primitive sees the press: start a range drag, or swallow taps on the track.
  const onpointerdowncapture = (event: PointerEvent) => {
    if (locked) return

    const target = event.target as Element
    const track = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
      '[data-slot="slider-track"]',
    )

    if (behavior.has('drag') && target.closest('[data-slot="slider-range"]') && track) {
      startSliderRangeDrag(event, {
        track,
        values,
        schema: component,
        direction: dir,
        vertical,
        topToBottom,
        onChange: (next) => field.setValue(sliderState(next, component)),
        onEnd: () => field.blur(),
      })

      return
    }

    if (sliderBlocksTap(target, component)) {
      event.stopPropagation()

      return
    }

    if (behavior.has('smooth-steps') && target.closest('[role="slider"]')) smooth = true
  }

  const format = (number: number) =>
    formatter.current.number(number, {
      maximumFractionDigits: component.decimalPlaces ?? 10,
      minimumFractionDigits: component.decimalPlaces ?? 0,
    })

  const thumbLabel = (index: number) => {
    if (values.length === 1) return undefined
    if (values.length === 2) {
      return index === 0 ? t('slider.minimum', {}, 'Minimum') : t('slider.maximum', {}, 'Maximum')
    }

    return t('slider.thumb', { number: index + 1 }, 'Value :number')
  }

  // The minimum sits at the bottom of a vertical slider and at the inline start of a
  // horizontal one (the right in RTL).
  const pipStyle = (percent: number) =>
    vertical
      ? `${topToBottom ? 'top' : 'bottom'}: ${percent}%`
      : dir === 'rtl'
        ? `right: ${percent}%`
        : `left: ${percent}%`
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    data-slot="slider"
    class={cn(
      'px-2',
      sliderHasTooltips(component) && !vertical && 'pt-7',
      pips.length > 0 && 'pb-6',
    )}
    {dir}
    {onpointerdowncapture}
  >
    <SliderPrimitive.Root
      type="multiple"
      id={field.id}
      dir={primitiveDir}
      min={primitive.min}
      max={primitive.max}
      step={primitive.step}
      orientation={vertical ? 'vertical' : 'horizontal'}
      disabled={locked}
      value={sliderToPrimitive(values, component)}
      onValueChange={(next: number[]) => change(sliderFromPrimitive(next, component, !smooth))}
      onValueCommit={commit}
      class={cn(
        'relative flex touch-none items-center select-none data-[disabled]:opacity-50',
        vertical ? 'h-48 w-5 flex-col' : 'w-full',
        field.readOnly && 'data-[disabled]:opacity-100',
      )}
    >
      <span
        data-slot="slider-track"
        class={cn(
          'bg-muted relative grow overflow-hidden rounded-full',
          vertical ? 'h-full w-1.5' : 'h-1.5 w-full',
        )}
      >
        {#each fillSections ?? [] as section (`${section.start}-${section.end}`)}
          <span
            data-slot="slider-fill"
            aria-hidden="true"
            class={cn('bg-primary absolute', vertical ? 'w-full' : 'h-full')}
            style={Object.entries(
              sliderFillStyle(section, { vertical, topToBottom, direction: dir }),
            )
              .map(([property, value]) => `${property}: ${value}`)
              .join('; ')}
          ></span>
        {/each}
        <SliderPrimitive.Range
          data-slot="slider-range"
          class={cn(
            'absolute',
            fill ? 'bg-primary' : 'bg-transparent',
            vertical ? 'w-full' : 'h-full',
            behavior.has('drag') && values.length > 1 && !locked && 'cursor-grab',
          )}
        />
      </span>
      {#each values as thumb, index (index)}
        <SliderPrimitive.Thumb
          {index}
          id={`${field.id}-thumb-${index}`}
          aria-label={thumbLabel(index)}
          aria-labelledby={values.length === 1 && component.label
            ? fieldIds(field.id).label
            : undefined}
          aria-describedby={field.aria['aria-describedby']}
          aria-valuetext={format(thumb)}
          class="border-primary bg-background ring-ring/50 relative block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none"
        >
          {#if sliderShowsTooltip(component, index)}
            <span
              aria-hidden="true"
              class={cn(
                'bg-foreground text-background pointer-events-none absolute rounded px-1.5 py-0.5 text-xs whitespace-nowrap tabular-nums',
                vertical
                  ? 'start-6 top-1/2 -translate-y-1/2'
                  : 'bottom-6 left-1/2 -translate-x-1/2',
              )}>{format(thumb)}</span
            >
          {/if}
        </SliderPrimitive.Thumb>
      {/each}
      {#if pips.length > 0}
        <div
          aria-hidden="true"
          class={cn(
            'pointer-events-none absolute',
            vertical ? 'inset-y-0 start-6' : 'inset-x-0 top-4',
          )}
        >
          {#each pips as pip (pip.value)}
            <span
              style={pipStyle(pip.percent)}
              class={cn(
                'absolute flex items-center gap-1',
                vertical
                  ? cn('flex-row', topToBottom ? '-translate-y-1/2' : 'translate-y-1/2')
                  : 'flex-col',
                !vertical && (dir === 'rtl' ? 'translate-x-1/2' : '-translate-x-1/2'),
              )}
            >
              <span
                class={cn(
                  'bg-border block',
                  vertical ? 'h-px' : 'w-px',
                  pip.labelled && !pip.small
                    ? vertical
                      ? 'w-2'
                      : 'h-2'
                    : vertical
                      ? 'w-1'
                      : 'h-1',
                )}
              ></span>
              {#if pip.labelled}<span
                  class={cn(
                    'text-muted-foreground tabular-nums',
                    pip.small ? 'text-[0.625rem]' : 'text-xs',
                  )}>{format(pip.value)}</span
                >{/if}
            </span>
          {/each}
        </div>
      {/if}
    </SliderPrimitive.Root>
  </div>
</FieldWrapper>
