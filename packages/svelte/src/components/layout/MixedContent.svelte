<script lang="ts">
  import type {
    ActionContext,
    AnyActionSchema,
    ContentSlotItem,
    SchemaComponent,
  } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'
  import RenderComponent from '../schema/RenderComponent.svelte'

  /**
   * Actions and components placed in a layout component's fixed spot (a section's
   * `afterHeader()`, a callout's `controls()`). Actions run in the owner's action context
   * (`context`: inside a form, the owner's field context, so `$get` / `$set` work), else
   * the page's.
   */
  let {
    items,
    name,
    class: className,
    context: ownerContext,
  }: {
    items: ContentSlotItem[] | undefined
    name: string
    class?: string
    context?: ActionContext
  } = $props()

  const pageContext = usePageActionContext()
  const context = $derived(ownerContext ?? pageContext)

  type Group =
    | { kind: 'actions'; key: string; actions: AnyActionSchema[] }
    | { kind: 'component'; key: string; component: SchemaComponent }

  // Consecutive actions share one action list so they sit together.
  const groups = $derived.by(() => {
    const result: Group[] = []

    for (const item of items ?? []) {
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

{#if items?.length}
  <div data-slot={name} class={cn('flex flex-wrap items-center gap-2', className)}>
    {#each groups as group (group.key)}
      {#if group.kind === 'actions'}
        <ActionList actions={group.actions} {context} size="sm" />
      {:else}
        <RenderComponent component={group.component} />
      {/if}
    {/each}
  </div>
{/if}
