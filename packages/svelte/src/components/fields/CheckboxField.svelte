<script lang="ts">
  import type { CheckboxSchema } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Checkbox } from '../ui/checkbox'

  let { component }: { component: CheckboxSchema } = $props()

  const field = useField<boolean | null>(() => component)
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error} inline={component.inline}>
  <Checkbox
    id={field.id}
    name={component.name}
    checked={Boolean(field.value)}
    onCheckedChange={(checked) => field.setValue(checked === true)}
    disabled={field.disabled || field.readOnly}
    aria-readonly={field.readOnly || undefined}
    required={component.required}
    {...field.aria}
    class="mt-0.5"
  />
</FieldWrapper>
