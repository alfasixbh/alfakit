<script lang="ts">
  import type { RadioSchema } from '@alfakit/core'
  import { fieldIds, isOptionGroup } from '@alfakit/core'
  import { textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Label } from '../ui/label'
  import { RadioGroup, RadioGroupItem } from '../ui/radio-group'

  let { component }: { component: RadioSchema } = $props()

  const field = useField<string | number | boolean | null>(() => component)
  const options = $derived(
    component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
  )
  const current = $derived(
    field.value === null || field.value === undefined
      ? ''
      : typeof field.value === 'boolean'
        ? field.value
          ? '1'
          : '0'
        : String(field.value),
  )
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <RadioGroup
    value={current}
    onValueChange={(next) => field.setValue(next)}
    disabled={field.disabled || field.readOnly}
    aria-readonly={field.readOnly || undefined}
    class={cn(component.inline && 'flex flex-wrap gap-4')}
    aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
    {...field.aria}
  >
    {#each options as option (option.value)}
      {@const optionId = `${field.id}-${option.value}`}
      <div class="flex items-start gap-2">
        <RadioGroupItem
          id={optionId}
          value={option.value}
          disabled={option.disabled}
          class="mt-0.5"
        />
        <div class="grid gap-0.5">
          <Label
            for={optionId}
            class={cn('font-normal', option.color && textColorClasses[option.color])}
            >{#if option.icon}<Icon name={option.icon} class="size-4" />{/if}{option.label}</Label
          >
          {#if option.description}<p class="text-muted-foreground text-xs">
              {option.description}
            </p>{/if}
        </div>
      </div>
    {/each}
  </RadioGroup>
</FieldWrapper>
