<script lang="ts">
  import type { MoneyInputSchema } from '@alfakit/core'
  import { useFormatter } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Input } from '../ui/input'
  import { extraProps } from '../../lib/attributes'

  /**
   * Amount input for any ISO 4217 currency. Shows the symbol where the user's locale puts
   * it, accepts the locale's separators and digits ("1.234,50", "١٢٫٥"), and rounds to
   * the currency's precision on blur. The form value is a plain decimal string ("1234.50").
   */

  let { component }: { component: MoneyInputSchema } = $props()

  const field = useField<string | number | null>(() => component)
  const format = useFormatter()
  let draft = $state<string | null>(null)

  const affixes = $derived(format.current.currencyAffixes(component.currency))
  const amount = $derived(
    field.value === null || field.value === undefined || field.value === ''
      ? null
      : Number(field.value),
  )
  const display = $derived(
    amount === null || Number.isNaN(amount)
      ? String(field.value ?? '')
      : format.current.number(amount, {
          minimumFractionDigits: component.decimals,
          maximumFractionDigits: component.decimals,
        }),
  )
  const start = $derived([component.prefix, affixes.prefix].filter(Boolean).join(' '))
  const end = $derived([affixes.suffix, component.suffix].filter(Boolean).join(' '))

  const commit = (text: string) => {
    if (text.trim() === '') {
      field.setValue(null)

      return
    }

    const parsed = format.current.parseNumber(text)

    // Unparseable input is kept as typed and out-of-range amounts are kept as well, so the
    // server's `minValue()` / `maxValue()` rules report them (W-V3-11).
    field.setValue(parsed === null ? text : parsed.toFixed(component.decimals))
  }

  const onfocus = () => {
    draft =
      amount === null || Number.isNaN(amount)
        ? String(field.value ?? '')
        : format.current.number(amount, {
            useGrouping: false,
            maximumFractionDigits: component.decimals,
          })
  }

  const oninput = (event: Event & { currentTarget: HTMLInputElement }) => {
    const text = event.currentTarget.value
    draft = text
    const parsed = format.current.parseNumber(text)
    field.setValue(text.trim() === '' ? null : parsed === null ? text : String(parsed))
  }

  const onblur = (event: FocusEvent & { currentTarget: HTMLInputElement }) => {
    commit(event.currentTarget.value)
    draft = null
    field.blur()
  }
</script>

{#snippet affix(text: string, icon: string | undefined, side: 'start' | 'end')}
  {#if text || icon}
    <span
      class={cn(
        'bg-muted/50 text-muted-foreground flex items-center gap-1 px-3 text-sm whitespace-nowrap',
        side === 'start' ? 'border-e' : 'border-s',
      )}
    >
      {#if side === 'start'}<Icon name={icon} />{/if}
      {text}
      {#if side === 'end'}<Icon name={icon} />{/if}
    </span>
  {/if}
{/snippet}

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    data-slot="input-group"
    class={cn(
      'border-input has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 dark:bg-input/30 flex h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
      field.error && 'border-destructive',
      field.disabled && 'opacity-50',
    )}
  >
    {@render affix(start, component.prefixIcon, 'start')}
    <Input
      id={field.id}
      name={component.name}
      type="text"
      inputmode={component.decimals > 0 ? 'decimal' : 'numeric'}
      dir="ltr"
      value={draft ?? display}
      {onfocus}
      {oninput}
      {onblur}
      placeholder={component.placeholder}
      disabled={field.disabled}
      readonly={component.readOnly}
      required={component.required}
      autofocus={component.autofocus || undefined}
      {...field.aria}
      {...extraProps(
        component.extraInputAttributes,
        'h-full border-0 bg-transparent text-end tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent',
      )}
    />
    {@render affix(end, component.suffixIcon, 'end')}
  </div>
</FieldWrapper>
