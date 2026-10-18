<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { ActionContext, AnyActionSchema, Color } from '@alfakit/core'
  import { bindsKeyBindings, formatKeyBinding, isActionGroup } from '@alfakit/core'
  import { useActionRunner } from '../../context.svelte'
  import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
  } from '../ui/dropdown-menu'
  import Self from './ActionGroupItems.svelte'

  let { actions, context }: { actions: AnyActionSchema[]; context: ActionContext } = $props()

  const runner = useActionRunner()

  const isDividedGroup = (action: AnyActionSchema | undefined) =>
    action !== undefined && isActionGroup(action) && action.dropdown === false

  const itemClass = (color: Color | undefined) =>
    color && color !== 'danger' && color !== 'gray'
      ? colorClass(textColorClasses, color)
      : undefined
</script>

{#each actions as action, index (uniqueKey( actions, index, (item) => (isActionGroup(item) ? 'sub' : item.name) ))}
  {#if isActionGroup(action) && action.dropdown === false}
    <!-- `dropdown(false)`: a section of this dropdown, divided from its neighbours. -->
    <DropdownMenuGroup data-slot="dropdown-section">
      {#if index > 0}<DropdownMenuSeparator />{/if}
      <Self actions={action.actions} {context} />
      {#if index < actions.length - 1 && !isDividedGroup(actions[index + 1])}
        <DropdownMenuSeparator />
      {/if}
    </DropdownMenuGroup>
  {:else if isActionGroup(action)}
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {#if action.icon}<Icon name={action.icon} />{/if}
        {action.label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <Self actions={action.actions} {context} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  {:else}
    <DropdownMenuItem
      disabled={action.disabled}
      title={action.tooltip}
      variant={action.color === 'danger' ? 'destructive' : 'default'}
      class={itemClass(action.color)}
      onSelect={() => void runner.trigger(action, context)}
    >
      {#if action.icon}<Icon name={action.icon} />{/if}
      {action.label}
      {#if action.badge !== undefined && action.badge !== null}
        <Badge
          variant="outline"
          class={cn('px-1.5 py-0', colorClass(badgeColorClasses, action.badgeColor, 'gray'))}
          >{action.badge}</Badge
        >
      {/if}
      {#if bindsKeyBindings(action, context) && action.keyBindings?.[0]}
        <DropdownMenuShortcut>{formatKeyBinding(action.keyBindings[0])}</DropdownMenuShortcut>
      {/if}
    </DropdownMenuItem>
  {/if}
{/each}
