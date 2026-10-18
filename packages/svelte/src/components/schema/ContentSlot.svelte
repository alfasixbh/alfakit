<script lang="ts">
  import type {
    AnyActionSchema,
    ContentSlotName,
    ContentSlots,
    FieldActions,
    SchemaComponent,
  } from '@alfakit/core'
  import { fieldActionContext, slotAlignmentClass } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import ActionList from '../actions/ActionList.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import RenderComponent from './RenderComponent.svelte'

  /**
   * One content slot of a field or entry (`aboveLabel()`, `belowContent()`…): a small row
   * of schema components and actions. Actions run as the owner's field actions.
   */
  let {
    component,
    name,
    class: className,
  }: {
    component: ContentSlots & FieldActions & { key: string }
    name: ContentSlotName
    class?: string
  } = $props()

  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const slot = $derived(component.slots?.[name])

  type Group =
    | { kind: 'actions'; key: string; actions: AnyActionSchema[] }
    | { kind: 'component'; key: string; component: SchemaComponent }

  // Consecutive actions share one action list, so they sit together like hint actions.
  const groups = $derived.by(() => {
    const result: Group[] = []

    for (const item of slot?.items ?? []) {
      if (item.action) {
        const last = result[result.length - 1]

        if (last?.kind === 'actions') {
          last.actions.push(item.action)
        } else {
          result.push({ kind: 'actions', key: `actions-${result.length}`, actions: [item.action] })
        }
      } else {
        result.push({ kind: 'component', key: item.component.key, component: item.component })
      }
    }

    return result
  })
</script>

{#if slot?.items.length}
  <div
    data-slot="field-content-slot"
    data-content-slot={name}
    class={cn(
      'flex min-w-0 flex-wrap items-center gap-2 text-sm',
      slotAlignmentClass(slot.alignment),
      className,
    )}
  >
    {#each groups as group (group.key)}
      {#if group.kind === 'actions'}
        <ActionList actions={group.actions} {context} size="xs" class="gap-1" />
      {:else}
        <RenderComponent component={group.component} />
      {/if}
    {/each}
  </div>
{/if}
