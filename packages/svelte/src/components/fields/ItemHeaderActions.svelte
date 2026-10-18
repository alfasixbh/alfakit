<script lang="ts">
  import type { ActionContext, ActionSchema, ItemActionName, ItemActionSchema } from '@alfakit/core'
  import { itemActionContext } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import ActionList from '../actions/ActionList.svelte'
  import ItemActionButton from './ItemActionButton.svelte'

  /**
   * The end of an item header: move up / down, extra item actions, clone, delete and the
   * collapse toggle, in Filament's order.
   */
  interface Props {
    context: ActionContext
    itemKey: string
    index: number
    count: number
    resolve: (name: ItemActionName) => ItemActionSchema | null
    extraActions?: ActionSchema[]
    buttons: boolean
    canClone: boolean
    canDelete: boolean
    collapsible: boolean
    collapsed: boolean
    onMove: (from: number, to: number) => void
    onClone: () => void
    onDelete: () => void
    onToggle?: () => void
    children?: Snippet
  }

  let {
    context,
    itemKey,
    index,
    count,
    resolve,
    extraActions,
    buttons,
    canClone,
    canDelete,
    collapsible,
    collapsed,
    onMove,
    onClone,
    onDelete,
    onToggle,
    children,
  }: Props = $props()

  const args = $derived({ item: itemKey })
  const extraContext = $derived(itemActionContext(context, args))
</script>

<div class="ms-auto flex items-center gap-0.5" data-slot="item-actions">
  {@render children?.()}
  {#if buttons}
    <ItemActionButton
      action={resolve('moveUp')}
      {context}
      {args}
      disabled={index === 0}
      attributes={{ 'data-item-move': 'up' }}
      onClient={() => onMove(index, index - 1)}
    />
    <ItemActionButton
      action={resolve('moveDown')}
      {context}
      {args}
      disabled={index === count - 1}
      attributes={{ 'data-item-move': 'down' }}
      onClient={() => onMove(index, index + 1)}
    />
  {/if}
  {#if extraActions?.length}
    <ActionList actions={extraActions} context={extraContext} size="xs" class="gap-0.5" />
  {/if}
  {#if canClone}
    <ItemActionButton action={resolve('clone')} {context} {args} onClient={onClone} />
  {/if}
  {#if canDelete}
    <ItemActionButton
      action={resolve('delete')}
      {context}
      {args}
      class="text-destructive hover:text-destructive"
      onClient={onDelete}
    />
  {/if}
  {#if collapsible}
    <ItemActionButton
      action={resolve(collapsed ? 'expand' : 'collapse')}
      {context}
      {args}
      attributes={{ 'aria-expanded': collapsed ? 'false' : 'true' }}
      onClient={onToggle}
    />
  {/if}
</div>
