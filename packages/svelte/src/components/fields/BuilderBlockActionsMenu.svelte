<script lang="ts">
  import type { ActionSchema, ItemActionName, ItemActionSchema } from '@alfakit/core'
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Button } from '../ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'

  /**
   * `blockActionsMenu()`: an item's actions in one compact menu (move up / down,
   * duplicate, extra item actions, delete). Built-in actions run in the browser unless
   * customised.
   */
  interface Props {
    label: string
    resolve: (name: ItemActionName) => ItemActionSchema | null
    canMoveUp: boolean
    canMoveDown: boolean
    canClone: boolean
    canDelete: boolean
    extraActions?: ActionSchema[]
    onAction: (name: ItemActionName) => void
    onExtra: (action: ActionSchema) => void
  }

  let {
    label,
    resolve,
    canMoveUp,
    canMoveDown,
    canClone,
    canDelete,
    extraActions,
    onAction,
    onExtra,
  }: Props = $props()

  const t = useT()
  const entries = $derived(
    (
      [
        ['moveUp', canMoveUp],
        ['moveDown', canMoveDown],
        ['clone', canClone],
      ] as const
    )
      .map(([name, enabled]) => ({ name, enabled, action: resolve(name) }))
      .filter((entry) => entry.enabled && entry.action !== null),
  )
  const deleteAction = $derived(canDelete ? resolve('delete') : null)
  const extras = $derived(extraActions ?? [])
  const hasMain = $derived(entries.length > 0 || extras.length > 0)
</script>

{#if hasMain || deleteAction}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-slot="builder-item-menu"
          aria-label={t('builder.block_actions', { block: label }, 'Actions for :block')}
          {...props}
        >
          <EllipsisIcon aria-hidden="true" />
        </Button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      {#each entries as entry (entry.name)}
        <DropdownMenuItem disabled={entry.action?.disabled} onSelect={() => onAction(entry.name)}>
          {#if entry.action?.icon}<Icon name={entry.action.icon} />{/if}
          {entry.name === 'clone'
            ? t('builder.duplicate_block', {}, 'Duplicate')
            : entry.action?.label}
        </DropdownMenuItem>
      {/each}
      {#each extras as action (action.name)}
        <DropdownMenuItem disabled={action.disabled} onSelect={() => onExtra(action)}>
          {#if action.icon}<Icon name={action.icon} />{/if}
          {action.label}
        </DropdownMenuItem>
      {/each}
      {#if deleteAction && hasMain}<DropdownMenuSeparator />{/if}
      {#if deleteAction}
        <DropdownMenuItem
          variant="destructive"
          disabled={deleteAction.disabled}
          onSelect={() => onAction('delete')}
        >
          {#if deleteAction.icon}<Icon name={deleteAction.icon} />{/if}
          {deleteAction.label}
        </DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
