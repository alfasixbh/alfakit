<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { ActionContext, ActionSchema, AnyActionSchema } from '@alfakit/core'
  import { isActionGroup } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import ActionButton from './ActionButton.svelte'
  import ActionGroupMenu from './ActionGroupMenu.svelte'

  interface Props {
    actions: AnyActionSchema[]
    context: ActionContext
    size?: 'xs' | 'sm' | 'default' | 'lg'
    class?: string
    align?: 'start' | 'end'
    onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
  }

  let {
    actions,
    context,
    size = 'default',
    class: className,
    align = 'start',
    onTrigger,
  }: Props = $props()
</script>

<!-- A horizontal row of action buttons and dropdown groups. -->
{#if actions.length > 0}
  <div
    class={cn('flex flex-wrap items-center gap-2', align === 'end' && 'justify-end', className)}
    data-slot="actions"
  >
    {#each actions as action, index (uniqueKey( actions, index, (item) => (isActionGroup(item) ? 'group' : item.name) ))}
      {#if isActionGroup(action)}
        <ActionGroupMenu group={action} {context} {size} {onTrigger} />
      {:else}
        <ActionButton {action} {context} {size} {onTrigger} />
      {/if}
    {/each}
  </div>
{/if}
