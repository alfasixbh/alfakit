<script lang="ts">
  import type { Option, ToggleButtonsSchema } from '@alfakit/core'
  import {
    fieldIds,
    gridColumnsClasses,
    isOptionGroup,
    toggleButtonsNext,
    toggleButtonsSelected,
  } from '@alfakit/core'
  import { solidButtonColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

  let { component }: { component: ToggleButtonsSchema } = $props()

  /**
   * Buttons acting as a radio group (or, when `multiple`, a set of toggles). Each button
   * reports its state with `aria-pressed`; the selected one takes the option's colour.
   */
  const field = useField<unknown>(() => component)
  const multiple = $derived(Boolean(component.multiple))
  const selected = $derived(toggleButtonsSelected(field.value, multiple))
  const locked = $derived(field.disabled || field.readOnly)
  const options = $derived(
    component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
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
  const grid = $derived(!component.inline && !component.grouped && (component.gridColumns ?? 0) > 1)
  const columnFlow = $derived(grid && component.gridDirection === 'column')

  /** `size()`: height, padding and text of the buttons (medium is the default). */
  const SIZE_CLASSES: Record<string, string> = {
    xs: 'h-7 px-2 text-xs',
    sm: 'h-8 px-2.5 text-sm',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
    xl: 'h-11 px-5 text-base',
  }
  const fullWidth = $derived(Boolean(component.fullWidth))
  // Any other `size()` string is a CSS class for the buttons.
  const sizeClasses = $derived(
    SIZE_CLASSES[component.size ?? 'md'] ?? cn(SIZE_CLASSES.md, component.size),
  )
</script>

{#snippet optionButton(option: Option, triggerProps: Record<string, unknown> = {})}
  {@const pressed = selected.includes(option.value)}
  <button
    {...triggerProps}
    type="button"
    aria-pressed={pressed}
    aria-label={component.iconsOnly ? option.label : undefined}
    title={component.iconsOnly ? option.label : undefined}
    disabled={locked || option.disabled}
    data-state={pressed ? 'on' : 'off'}
    class={cn(
      'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
      sizeClasses,
      fullWidth && component.inline && 'flex-1',
      pressed
        ? cn('border-transparent', solidButtonColorClasses[option.color ?? 'primary'])
        : 'bg-background hover:bg-accent hover:text-accent-foreground',
      component.grouped &&
        'rounded-none shadow-none not-first:-ms-px first:rounded-s-md last:rounded-e-md focus-visible:z-10',
      field.readOnly && 'disabled:opacity-100',
    )}
    onclick={() => field.setValue(toggleButtonsNext(field.value, option.value, multiple))}
  >
    {#if option.icon}<Icon name={option.icon} class="size-4" />{/if}
    {#if !component.iconsOnly}<span>{option.label}</span>{/if}
  </button>
{/snippet}

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <TooltipProvider>
    <div
      id={field.id}
      role="group"
      data-slot="toggle-buttons"
      aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
      aria-describedby={field.aria['aria-describedby']}
      data-grid-direction={grid ? (component.gridDirection ?? 'row') : undefined}
      class={cn(
        grid
          ? columnFlow
            ? cn('gap-x-2 *:mb-2 *:w-full', COLUMN_FLOW_CLASSES[component.gridColumns ?? 1])
            : cn('grid gap-2', gridColumnsClasses({ default: 1, md: component.gridColumns ?? 1 }))
          : 'flex gap-2',
        !grid &&
          (component.inline
            ? 'flex-row flex-wrap'
            : cn('flex-col', fullWidth ? 'items-stretch' : 'items-start')),
        component.grouped && cn('gap-0 rounded-md shadow-xs', fullWidth ? 'w-full' : 'w-fit'),
        fullWidth && 'w-full',
      )}
    >
      {#each options as option (option.value)}
        {@const tooltip = component.tooltips?.[option.value]}
        {#if tooltip}
          <Tooltip>
            <TooltipTrigger>
              {#snippet child({ props })}
                {@render optionButton(option, props)}
              {/snippet}
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        {:else}
          {@render optionButton(option)}
        {/if}
      {/each}
    </div>
  </TooltipProvider>
</FieldWrapper>
