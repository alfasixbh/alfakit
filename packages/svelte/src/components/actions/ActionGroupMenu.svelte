<script lang="ts">
  import type {
    ActionButtonSize,
    ActionContext,
    ActionGroupSchema,
    ActionSchema,
  } from '@alfakit/core'
  import {
    bindsKeyBindings,
    flattenActionGroup,
    iconButtonSize,
    parseDropdownPlacement,
    registerKeyBindings,
    resolveActionSize,
  } from '@alfakit/core'
  import { colorClass, ghostButtonColorClasses, outlineButtonColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
  import ActionButton from './ActionButton.svelte'
  import ActionGroupItems from './ActionGroupItems.svelte'
  import { useActionRunner, useT } from '../../context.svelte'

  let {
    group,
    context,
    size = 'default',
    onTrigger,
  }: {
    group: ActionGroupSchema
    context: ActionContext
    size?: ActionButtonSize
    onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
  } = $props()

  /** `dropdownWidth()`: widths of the dropdown, spelled out for Tailwind. */
  const DROPDOWN_WIDTHS: Record<string, string> = {
    '3xs': 'w-3xs',
    '2xs': 'w-2xs',
    xs: 'w-xs',
    sm: 'w-sm',
    md: 'w-md',
    lg: 'w-lg',
    xl: 'w-xl',
    '2xl': 'w-2xl',
    '3xl': 'w-3xl',
    '4xl': 'w-4xl',
    '5xl': 'w-5xl',
    '6xl': 'w-6xl',
    '7xl': 'w-7xl',
    none: 'w-auto',
    min: 'w-min',
    max: 'w-max',
    fit: 'w-fit',
    prose: 'w-[65ch]',
    container: 'container',
    'screen-sm': 'w-(--breakpoint-sm)',
    'screen-md': 'w-(--breakpoint-md)',
    'screen-lg': 'w-(--breakpoint-lg)',
    'screen-xl': 'w-(--breakpoint-xl)',
    'screen-2xl': 'w-(--breakpoint-2xl)',
    full: 'w-[calc(100vw-2rem)]',
    screen: 'w-screen',
  }

  // `buttonGroup()` and `dropdown(false)`: the actions render inline instead of a dropdown.
  const isInline = $derived(Boolean(group.buttonGroup) || group.dropdown === false)
  const inlineActions = $derived(
    flattenActionGroup(group.actions).map((action) =>
      group.buttonGroup && action.variant !== 'icon-button'
        ? { ...action, variant: 'outline' as const }
        : action,
    ),
  )
  const contentClass = $derived(
    cn(
      group.dropdownWidth && DROPDOWN_WIDTHS[group.dropdownWidth],
      group.maxHeight && 'overflow-y-auto',
    ),
  )

  const t = useT()
  const runner = useActionRunner()
  const isIconOnly = $derived(!group.label || group.variant === 'icon-button')
  const buttonSize = $derived(resolveActionSize(group.size, size))
  const placement = $derived(parseDropdownPlacement(group.dropdownPlacement))
  const triggerClass = $derived(
    cn(
      group.color &&
        colorClass(
          group.variant === 'button' ? outlineButtonColorClasses : ghostButtonColorClasses,
          group.color,
        ),
    ),
  )

  // Shortcuts of the actions inside the group work like those of standalone buttons (and,
  // like them, never for record rows).
  // Keyed on the action names and shortcuts, so reloads (which bring new action objects)
  // don't re-register them; each handler runs the current action of that name.
  const groupBindings = $derived(
    JSON.stringify(
      flattenActionGroup(group.actions)
        .filter((action) => bindsKeyBindings(action, context))
        .map((action) => [action.name, action.keyBindings ?? []]),
    ),
  )

  $effect(() => {
    const bindings = JSON.parse(groupBindings) as [string, string[]][]

    if (!bindings.length) return

    return registerKeyBindings(
      bindings.map(([name, keys]) => ({
        keys,
        handler: () => {
          const action = flattenActionGroup(group.actions).find((item) => item.name === name)

          if (action) void runner.trigger(action, context)
        },
      })),
    )
  })
</script>

{#snippet trigger(extra: Record<string, unknown> = {})}
  <DropdownMenuTrigger {...extra}>
    {#snippet child({ props })}
      <Button
        type="button"
        variant={group.variant === 'button' ? 'outline' : 'ghost'}
        size={isIconOnly ? iconButtonSize(buttonSize) : buttonSize}
        class={triggerClass}
        aria-label={isIconOnly
          ? (group.label ?? group.tooltip ?? t('actions', {}, 'Actions'))
          : undefined}
        {...props}
      >
        <Icon name={group.icon ?? 'ellipsis-vertical'} />
        {#if !isIconOnly}<span>{group.label}</span>{/if}
      </Button>
    {/snippet}
  </DropdownMenuTrigger>
{/snippet}

{#if isInline && group.buttonGroup}
  <div
    role="group"
    aria-label={group.label ?? group.tooltip}
    data-slot="button-group"
    class="inline-flex items-stretch rounded-md shadow-xs [&>*]:rounded-none [&>*]:shadow-none [&>*:first-child]:rounded-s-md [&>*:focus-visible]:z-10 [&>*:last-child]:rounded-e-md [&>*:not(:first-child)]:-ms-px"
  >
    {#each inlineActions as action (action.name)}
      <ActionButton {action} {context} size={buttonSize} {onTrigger} />
    {/each}
  </div>
{:else if isInline}
  {#each inlineActions as action (action.name)}
    <ActionButton {action} {context} size={buttonSize} {onTrigger} />
  {/each}
{:else}
  <DropdownMenu>
    {#if group.tooltip}
      <Tooltip>
        <TooltipTrigger>
          {#snippet child({ props })}
            {@render trigger(props)}
          {/snippet}
        </TooltipTrigger>
        <TooltipContent>{group.tooltip}</TooltipContent>
      </Tooltip>
    {:else}
      {@render trigger()}
    {/if}
    <DropdownMenuContent
      side={placement.side}
      align={placement.align}
      sideOffset={group.dropdownOffset ?? undefined}
      class={contentClass}
      style={group.maxHeight ? `max-height: ${group.maxHeight}` : undefined}
    >
      <ActionGroupItems actions={group.actions} {context} />
      {#if group.actions.length === 0}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>—</DropdownMenuItem>
      {/if}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
