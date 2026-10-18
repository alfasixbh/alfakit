<script lang="ts">
  import type { TextareaSchema } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Textarea } from '../ui/textarea'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: TextareaSchema } = $props()

  const field = useField<string | null>(() => component)
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <Textarea
    id={field.id}
    name={component.name}
    value={field.value ?? ''}
    dir="auto"
    oninput={(event) => field.setValue(event.currentTarget.value)}
    onblur={field.blur}
    placeholder={component.placeholder}
    disabled={field.disabled}
    readonly={component.readOnly}
    required={component.required}
    autofocus={component.autofocus || undefined}
    rows={component.rows}
    cols={component.cols}
    minlength={component.minLength}
    maxlength={component.maxLength}
    {...field.aria}
    {...extraProps(
      component.extraInputAttributes,
      component.autosize ? 'field-sizing-content' : undefined,
    )}
  />
</FieldWrapper>
