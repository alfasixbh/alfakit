<script lang="ts">
  import type { ColorPickerSchema } from '@alfakit/core'
  import { colorAlpha, colorToHex, formatColor, withColorAlpha } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Input } from '../ui/input'
  import { useFormatter, useT } from '../../context.svelte'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: ColorPickerSchema } = $props()

  const field = useField<string | null>(() => component)
  const isHex = $derived(component.format === 'hex')
  const swatch = $derived(colorToHex(field.value) ?? '#000000')
  // No colour yet: a struck-through swatch rather than a white one (or black from the picker).
  const empty = $derived(!field.value)

  const t = useT()
  const formatter = useFormatter()
  // `rgba()`: the native swatch has no alpha, so a slider sets the opacity.
  const alpha = $derived(Math.round(colorAlpha(field.value) * 100))
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div class="flex items-center gap-2">
    <label
      data-slot="color-picker-swatch"
      data-empty={empty ? '' : undefined}
      class={empty
        ? 'border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-dashed shadow-xs'
        : 'border-input relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs'}
      style:background-color={field.value || 'transparent'}
      aria-label={t('form.pick_color', {}, 'Pick a colour')}
    >
      {#if empty}
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span class="bg-muted-foreground/50 h-px w-[140%] -rotate-45"></span>
        </span>
      {/if}
      <input
        type="color"
        value={swatch}
        oninput={(event) =>
          field.setValue(formatColor(event.currentTarget.value, component.format, field.value))}
        onblur={field.blur}
        disabled={field.disabled || field.readOnly}
        class="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
    <Input
      id={field.id}
      name={component.name}
      dir="ltr"
      value={field.value ?? ''}
      oninput={(event) => field.setValue(event.currentTarget.value)}
      onblur={field.blur}
      placeholder={component.placeholder ?? (isHex ? '#rrggbb' : component.format)}
      disabled={field.disabled}
      readonly={field.readOnly}
      {...field.aria}
      {...extraProps(component.extraInputAttributes, 'font-mono')}
    />
  </div>
  {#if component.format === 'rgba'}
    <div data-slot="color-picker-alpha" class="mt-2 flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={alpha}
        oninput={(event) =>
          field.setValue(withColorAlpha(field.value, Number(event.currentTarget.value) / 100))}
        onblur={field.blur}
        disabled={field.disabled || field.readOnly}
        aria-label={t('form.color_opacity', {}, 'Opacity')}
        aria-valuetext={`${alpha}%`}
        class="accent-primary h-2 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span class="text-muted-foreground w-10 text-end text-xs tabular-nums"
        >{formatter.current.percent(alpha / 100)}</span
      >
    </div>
  {/if}
</FieldWrapper>
