<script lang="ts">
  import type { ActionsComponentSchema } from '@alfakit/core'
  import { fieldActionContext } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'
  import { useOptionalFormStore } from '../form/form-context.svelte'

  const JUSTIFY: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    justify: 'justify-between',
  }

  const VERTICAL: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  }

  /**
   * `Actions::make([...])`: a row of buttons placed freely in a form or infolist. They run
   * in the component's field context, so `$set()` in an action updates the surrounding form.
   */
  let { component }: { component: ActionsComponentSchema } = $props()

  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const stretch = $derived(component.fullWidth || component.alignment === 'justify')
</script>

<div
  data-slot="schema-actions"
  data-alignment={component.alignment ?? 'start'}
  {...extraProps(
    component.extraAttributes,
    cn(
      'flex h-full flex-col',
      component.verticalAlignment && VERTICAL[component.verticalAlignment],
    ),
  )}
>
  <ActionList
    actions={component.actions ?? []}
    {context}
    class={cn('w-full', JUSTIFY[component.alignment ?? 'start'], stretch && '[&>*]:flex-1')}
  />
</div>
