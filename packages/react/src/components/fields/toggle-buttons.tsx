import type { ToggleButtonsSchema } from '@alfakit/core'
import {
  fieldIds,
  gridColumnsClasses,
  isOptionGroup,
  toggleButtonsNext,
  toggleButtonsSelected,
} from '@alfakit/core'
import { solidButtonColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

/**
 * Buttons acting as a radio group (or, when `multiple`, a set of toggles). Each button
 * reports its state with `aria-pressed`; the selected one takes the option's colour.
 */
/** `gridDirection('column')`: buttons flow down each column. Spelled out for Tailwind. */
const COLUMN_FLOW_CLASSES: Record<number, string> = {
  2: 'md:columns-2',
  3: 'md:columns-3',
  4: 'md:columns-4',
  5: 'md:columns-5',
  6: 'md:columns-6',
}

/** `size()`: height, padding and text of the buttons (medium is the default). */
const SIZE_CLASSES: Record<string, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
  xl: 'h-11 px-5 text-base',
}

export function ToggleButtonsField({ component }: { component: ToggleButtonsSchema }) {
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown>(component)
  const multiple = Boolean(component.multiple)
  const selected = toggleButtonsSelected(value, multiple)
  const locked = disabled || readOnly
  const options = component.options.flatMap((option) =>
    isOptionGroup(option) ? option.options : [option],
  )
  // `columns()`: a grid of full-width buttons (inline and grouped layouts stay a row).
  const grid = !component.inline && !component.grouped && (component.gridColumns ?? 0) > 1
  const columnFlow = grid && component.gridDirection === 'column'
  const fullWidth = Boolean(component.fullWidth)
  // Any other `size()` string is a CSS class for the buttons.
  const sizeClasses = SIZE_CLASSES[component.size ?? 'md'] ?? cn(SIZE_CLASSES.md, component.size)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <TooltipProvider>
        <div
          id={id}
          role="group"
          data-slot="toggle-buttons"
          aria-labelledby={component.label ? fieldIds(id).label : undefined}
          aria-describedby={aria['aria-describedby']}
          data-grid-direction={grid ? (component.gridDirection ?? 'row') : undefined}
          className={cn(
            grid
              ? columnFlow
                ? cn('gap-x-2 *:mb-2 *:w-full', COLUMN_FLOW_CLASSES[component.gridColumns ?? 1])
                : cn(
                    'grid gap-2',
                    gridColumnsClasses({ default: 1, md: component.gridColumns ?? 1 }),
                  )
              : 'flex gap-2',
            !grid &&
              (component.inline
                ? 'flex-row flex-wrap'
                : cn('flex-col', fullWidth ? 'items-stretch' : 'items-start')),
            component.grouped && cn('gap-0 rounded-md shadow-xs', fullWidth ? 'w-full' : 'w-fit'),
            fullWidth && 'w-full',
          )}
        >
          {options.map((option) => {
            const pressed = selected.includes(option.value)
            const color = option.color ?? 'primary'
            const tooltip = component.tooltips?.[option.value]

            const button = (
              <button
                key={option.value}
                type="button"
                aria-pressed={pressed}
                aria-label={component.iconsOnly ? option.label : undefined}
                title={component.iconsOnly ? option.label : undefined}
                disabled={locked || option.disabled}
                onClick={() => setValue(toggleButtonsNext(value, option.value, multiple))}
                data-state={pressed ? 'on' : 'off'}
                className={cn(
                  'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
                  sizeClasses,
                  fullWidth && component.inline && 'flex-1',
                  pressed
                    ? cn('border-transparent', solidButtonColorClasses[color])
                    : 'bg-background hover:bg-accent hover:text-accent-foreground',
                  component.grouped &&
                    'rounded-none shadow-none not-first:-ms-px first:rounded-s-md last:rounded-e-md focus-visible:z-10',
                  readOnly && 'disabled:opacity-100',
                )}
              >
                {option.icon && <Icon name={option.icon} className="size-4" />}
                {!component.iconsOnly && <span>{option.label}</span>}
              </button>
            )

            return tooltip ? (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            ) : (
              button
            )
          })}
        </div>
      </TooltipProvider>
    </FieldWrapper>
  )
}
