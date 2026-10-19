<script lang="ts">
  import type { SelectSchema } from '@alfakit/core'
  import { htmlLabelToText, isOptionGroup } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
  } from '../ui/select'
  import ComboboxSelect from './ComboboxSelect.svelte'
  import OptionLabel from './OptionLabel.svelte'
  import SelectAffixes from './SelectAffixes.svelte'

  let { component }: { component: SelectSchema } = $props()

  const field = useField<string | number | Array<string | number> | null>(() => component)
  const current = $derived(
    field.value === null || field.value === undefined ? '' : String(field.value),
  )
  const flat = $derived(
    component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
  )
  const currentLabel = $derived(flat.find((option) => option.value === current)?.label)
  const t = useT()
  /** Text of an option label for native `<option>`s (`allowHtml()` labels are HTML). */
  const plainLabel = (label: string): string =>
    component.allowHtml ? htmlLabelToText(label) : label
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <SelectAffixes {component} error={field.error}>
    {#if component.native && !component.multiple && !component.searchable}
      <select
        id={field.id}
        name={component.name}
        value={current}
        onchange={(event) =>
          field.setValue(event.currentTarget.value === '' ? null : event.currentTarget.value)}
        onblur={field.blur}
        disabled={field.disabled || field.readOnly}
        required={component.required}
        {...field.aria}
        aria-readonly={field.readOnly || undefined}
        class="border-input focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      >
        {#if component.selectablePlaceholder}<option value=""
            >{component.placeholder ?? t('select_option', {}, 'Select an option')}</option
          >{/if}
        {#each component.options as option, index (isOptionGroup(option) ? `group-${index}` : option.value)}
          {#if isOptionGroup(option)}
            <optgroup label={option.label}>
              {#each option.options as item (item.value)}
                <option value={item.value} disabled={item.disabled}>{plainLabel(item.label)}</option
                >
              {/each}
            </optgroup>
          {:else}
            <option value={option.value} disabled={option.disabled}
              >{plainLabel(option.label)}</option
            >
          {/if}
        {/each}
      </select>
    {:else if !component.multiple && !component.searchable}
      <Select
        value={current}
        onValueChange={(next) => field.setValue(next === '__none__' || next === '' ? null : next)}
        disabled={field.disabled || field.readOnly}
        onOpenChange={(open) => !open && field.blur()}
      >
        <SelectTrigger
          id={field.id}
          {...field.aria}
          aria-readonly={field.readOnly || undefined}
          class="w-full"
        >
          <span data-slot="select-value" class={currentLabel ? undefined : 'text-muted-foreground'}
            >{#if currentLabel && component.allowHtml}{@html currentLabel}{:else}{currentLabel ??
                component.placeholder ??
                t('select_option', {}, 'Select an option')}{/if}</span
          >
        </SelectTrigger>
        <SelectContent>
          {#if component.selectablePlaceholder && current !== ''}
            <SelectItem value="__none__" class="text-muted-foreground"
              >{component.placeholder ?? '—'}</SelectItem
            >
          {/if}
          {#each component.options as option, index (isOptionGroup(option) ? `group-${index}` : option.value)}
            {#if isOptionGroup(option)}
              <SelectGroup>
                <SelectLabel>{option.label}</SelectLabel>
                {#each option.options as item (item.value)}
                  <SelectItem
                    value={item.value}
                    label={plainLabel(item.label)}
                    disabled={item.disabled}
                    ><OptionLabel
                      option={item}
                      allowHtml={component.allowHtml}
                      wrap={component.wrapOptionLabels !== false}
                    /></SelectItem
                  >
                {/each}
              </SelectGroup>
            {:else}
              <SelectItem
                value={option.value}
                label={plainLabel(option.label)}
                disabled={option.disabled}
                ><OptionLabel
                  {option}
                  allowHtml={component.allowHtml}
                  wrap={component.wrapOptionLabels !== false}
                /></SelectItem
              >
            {/if}
          {/each}
          {#if component.options.length === 0}
            <div data-slot="select-empty" class="text-muted-foreground px-2 py-1.5 text-sm">
              {component.noOptionsMessage ?? t('form.no_options', {}, 'No options available.')}
            </div>
          {/if}
        </SelectContent>
      </Select>
    {:else}
      <ComboboxSelect
        {component}
        value={field.value}
        setValue={field.setValue}
        id={field.id}
        disabled={field.disabled}
        readOnly={field.readOnly}
        error={field.error}
        aria={field.aria}
      />
    {/if}
  </SelectAffixes>
</FieldWrapper>
