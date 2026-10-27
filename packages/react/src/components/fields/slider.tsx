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
import { Slider as SliderPrimitive } from 'radix-ui'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { useDirection, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'

/**
 * A slider with one thumb, or several for a range. Built on Radix Slider, which handles
 * pointer and keyboard input and mirrors itself in right-to-left layouts (`dir`). Values,
 * tooltips and pips are formatted with the panel's locale.
 */
export function SliderField({ component }: { component: SliderSchema }) {
  const t = useT()
  // `rtl()` overrides the panel's direction.
  const dir = sliderDirection(component, useDirection())
  const formatter = useFormatter()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } =
    useField<unknown>(component)
  const values = sliderValues(value, component)
  const pips = useMemo(() => (component.pips ? sliderPips(component) : []), [component])
  const vertical = Boolean(component.vertical)
  // `vertical(isTopToBottom: true)`: the minimum at the top.
  const topToBottom = vertical && Boolean(component.topToBottom)
  const behavior = sliderBehavior(component)
  const trackRef = useRef<HTMLSpanElement>(null)
  // `Behavior::SmoothSteps`: no snapping while a pointer drags a thumb.
  const [smooth, setSmooth] = useState(false)
  const primitive = sliderPrimitive(component, smooth)
  const locked = disabled || readOnly

  const change = (next: number[]) =>
    setValue(sliderState(sliderNextValues(values, next, component), component))

  // Before the primitive sees the press: start a range drag, or swallow taps on the track.
  const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (locked) return

    const target = event.target as Element

    if (behavior.has('drag') && target.closest('[data-slot="slider-range"]') && trackRef.current) {
      startSliderRangeDrag(event.nativeEvent, {
        track: trackRef.current,
        values,
        schema: component,
        direction: dir,
        vertical,
        topToBottom,
        onChange: (next) => setValue(sliderState(next, component)),
        onEnd: () => blur(),
      })

      return
    }

    if (sliderBlocksTap(target, component)) {
      event.stopPropagation()

      return
    }

    if (behavior.has('smooth-steps') && target.closest('[role="slider"]')) setSmooth(true)
  }
  const format = (number: number) =>
    formatter.number(number, {
      maximumFractionDigits: component.decimalPlaces ?? 10,
      minimumFractionDigits: component.decimalPlaces ?? 0,
    })
  const range = component.max - component.min
  // `fillTrack([…])`: chosen sections are drawn here; the primitive's range stays clear.
  const fillSections = sliderFillSections(values, component)
  const fill = fillSections === null && (component.fillTrack === true || values.length > 1)

  const thumbLabel = (index: number) => {
    if (values.length === 1) return undefined
    if (values.length === 2) {
      return index === 0 ? t('slider.minimum', {}, 'Minimum') : t('slider.maximum', {}, 'Maximum')
    }

    return t('slider.thumb', { number: index + 1 }, `Value ${index + 1}`)
  }

  return (
    // The wrapper's label, hint and error ids derive from `id`, as `aria` does: a thumb is not
    // labelable, so one thumb names itself through `aria-labelledby`.
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        data-slot="slider"
        className={cn(
          'px-2',
          sliderHasTooltips(component) && !vertical && 'pt-7',
          pips.length > 0 && 'pb-6',
        )}
        onPointerDownCapture={onPointerDownCapture}
      >
        <SliderPrimitive.Root
          id={id}
          dir={dir}
          min={primitive.min}
          max={primitive.max}
          step={primitive.step}
          minStepsBetweenThumbs={
            component.minDifference && !primitive.nonLinear
              ? Math.round(component.minDifference / component.step)
              : 0
          }
          orientation={vertical ? 'vertical' : 'horizontal'}
          inverted={topToBottom}
          disabled={locked}
          value={sliderToPrimitive(values, component)}
          onValueChange={(next) => change(sliderFromPrimitive(next, component, !smooth))}
          onValueCommit={() => {
            if (smooth) {
              setSmooth(false)
              change(values.map((thumb) => sliderSnap(thumb, component)))
            }

            blur()
          }}
          className={cn(
            'relative flex touch-none items-center select-none data-[disabled]:opacity-50',
            vertical ? 'h-48 w-5 flex-col' : 'w-full',
            readOnly && 'data-[disabled]:opacity-100',
          )}
        >
          <SliderPrimitive.Track
            ref={trackRef}
            className={cn(
              'bg-muted relative grow overflow-hidden rounded-full',
              vertical ? 'h-full w-1.5' : 'h-1.5 w-full',
            )}
          >
            {fillSections?.map((section) => (
              <span
                key={`${section.start}-${section.end}`}
                data-slot="slider-fill"
                aria-hidden="true"
                className={cn('bg-primary absolute', vertical ? 'w-full' : 'h-full')}
                // Runtime geometry: no Tailwind class can hold these values.
                style={sliderFillStyle(section, { vertical, topToBottom, direction: dir })}
              />
            ))}
            <SliderPrimitive.Range
              data-slot="slider-range"
              className={cn(
                'absolute',
                fill ? 'bg-primary' : 'bg-transparent',
                behavior.has('drag') && values.length > 1 && !locked && 'cursor-grab',
                vertical ? 'w-full' : 'h-full',
              )}
            />
          </SliderPrimitive.Track>
          {values.map((thumb, index) => (
            <SliderPrimitive.Thumb
              key={index}
              id={`${id}-thumb-${index}`}
              aria-label={thumbLabel(index)}
              aria-labelledby={
                values.length === 1 && component.label ? fieldIds(id).label : undefined
              }
              aria-describedby={aria['aria-describedby']}
              aria-valuetext={format(thumb)}
              className="border-primary bg-background ring-ring/50 relative block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none"
            >
              {sliderShowsTooltip(component, index) && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'bg-foreground text-background pointer-events-none absolute rounded px-1.5 py-0.5 text-xs whitespace-nowrap tabular-nums',
                    vertical
                      ? 'start-6 top-1/2 -translate-y-1/2'
                      : 'bottom-6 left-1/2 -translate-x-1/2',
                  )}
                >
                  {format(thumb)}
                </span>
              )}
            </SliderPrimitive.Thumb>
          ))}
          {pips.length > 0 && range > 0 && (
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute',
                vertical ? 'inset-y-0 start-6' : 'inset-x-0 top-4',
              )}
            >
              {pips.map((pip) => {
                // Radix puts the minimum at the bottom of a vertical slider and at the
                // inline start of a horizontal one (the right in RTL).
                const offset = `${pip.percent}%`
                const style = vertical
                  ? topToBottom
                    ? { top: offset }
                    : { bottom: offset }
                  : dir === 'rtl'
                    ? { right: offset }
                    : { left: offset }

                return (
                  <span
                    key={pip.value}
                    style={style}
                    className={cn(
                      'absolute flex items-center gap-1',
                      vertical
                        ? cn('flex-row', topToBottom ? '-translate-y-1/2' : 'translate-y-1/2')
                        : 'flex-col',
                      !vertical && (dir === 'rtl' ? 'translate-x-1/2' : '-translate-x-1/2'),
                    )}
                  >
                    <span
                      className={cn(
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
                    />
                    {pip.labelled && (
                      <span
                        className={cn(
                          'text-muted-foreground tabular-nums',
                          pip.small ? 'text-[0.625rem]' : 'text-xs',
                        )}
                      >
                        {format(pip.value)}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          )}
        </SliderPrimitive.Root>
      </div>
    </FieldWrapper>
  )
}
