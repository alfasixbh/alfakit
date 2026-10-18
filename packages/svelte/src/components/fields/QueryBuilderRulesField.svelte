<script lang="ts">
  import type { FieldSchema, QueryBuilderGroup, QueryBuilderRulesSchema } from '@alfakit/core'
  import { constraintPickerClasses, normalizeRuleTree } from '@alfakit/core'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import QueryBuilderGroupEditor from './QueryBuilderGroupEditor.svelte'

  let { component }: { component: QueryBuilderRulesSchema } = $props()

  /**
   * The query builder's rule editor: rules (constraint, operator, value) combined with
   * AND / OR, in nested groups. The tree is the field's state; the server validates it.
   */
  const field = useField<unknown>(() => component as unknown as FieldSchema)
  const tree = $derived(normalizeRuleTree(field.value))
  const locked = $derived(Boolean(field.disabled || field.readOnly))
  const change = (next: QueryBuilderGroup) => field.setValue(next)
</script>

<FieldWrapper field={component} htmlFor={field.id} hideLabel>
  <div id={field.id} role="group" aria-label={component.label ?? undefined}>
    <QueryBuilderGroupEditor
      group={tree}
      path={[]}
      {tree}
      constraints={component.constraints}
      maxDepth={component.maxDepth}
      picker={constraintPickerClasses(component)}
      {locked}
      onChange={change}
    />
  </div>
</FieldWrapper>
