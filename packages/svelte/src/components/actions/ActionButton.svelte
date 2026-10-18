<script lang="ts">
  import type { ActionContext, ActionSchema } from '@alfakit/core'
  import {
    bindsKeyBindings,
    formatKeyBinding,
    iconButtonSize,
    registerKeyBindings,
    resolveActionSize,
  } from '@alfakit/core'
  import { useActionRunner, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import {
    badgeColorClasses,
    colorClass,
    ghostButtonColorClasses,
    outlineButtonColorClasses,
    solidButtonColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import { Spinner } from '../ui/spinner'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
  import { extraProps } from '../../lib/attributes'

  interface Props {
    action: ActionSchema
    context: ActionContext
    size?: 'xs' | 'sm' | 'default' | 'lg'
    class?: string
    /** Force a variant (e.g. menu items render as plain rows). */
    variant?: ActionSchema['variant']
    /** Bind the action's key bindings globally while mounted. */
    withKeyBindings?: boolean
    /** Override how the action runs (e.g. a form submits its values). */
    onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
  }

  let {
    action,
    context,
    size = 'default',
    class: className,
    variant: variantProp,
    withKeyBindings = true,
    onTrigger,
  }: Props = $props()

  const runner = useActionRunner()
  const runnerState = useStore(runner.store)
  const loading = $derived(runnerState.current.loading === action.name)
  const processing = $derived(
    runnerState.current.modals.some(
      (modal) => modal.action.name === action.name && modal.processing,
    ),
  )

  const variant = $derived(
    variantProp ??
      (action.outlined
        ? 'outline'
        : (action.variant ??
          (action.hasAction || action.hasModal || action.url ? 'link' : 'button'))),
  )
  const isIconOnly = $derived(variant === 'icon-button' || !action.label)
  const busy = $derived(loading || processing)
  // A disabled link renders as a disabled button so it cannot navigate.
  const isPlainLink = $derived(
    Boolean(action.url && !action.hasAction && !action.hasModal && !action.disabled),
  )
  // Record actions repeat per row: a global shortcut would run them for every record.
  const bindsKeys = $derived(withKeyBindings && bindsKeyBindings(action, context))

  /** The badge trigger style (`badge()` without an argument). */
  const BADGE_TRIGGER_CLASSES =
    "h-auto min-h-6 gap-1 rounded-md border px-2 py-0.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5"

  function buttonClasses(): string {
    const color = action.color ?? 'primary'

    switch (variant) {
      case 'outline':
        return cn('bg-background border', colorClass(outlineButtonColorClasses, color, 'gray'))
      case 'ghost':
        return colorClass(ghostButtonColorClasses, color, 'gray')
      case 'link':
        return cn(
          'h-auto p-0 underline-offset-4 hover:underline',
          colorClass(textColorClasses, color, 'primary'),
        )
      case 'icon-button':
        return colorClass(ghostButtonColorClasses, color, 'gray')
      case 'badge':
        // `badge()`: a tinted pill in the action's colour.
        return cn(BADGE_TRIGGER_CLASSES, colorClass(badgeColorClasses, color, 'primary'))
      default:
        return colorClass(solidButtonColorClasses, color, 'primary')
    }
  }

  const run = () => void (onTrigger ? onTrigger(action, context) : runner.trigger(action, context))

  // Keyed on the shortcut itself, so reloads (which bring a new action object) don't
  // re-register it; the handler runs the current action.
  const keyBindings = $derived(
    bindsKeys && action.keyBindings?.length ? JSON.stringify(action.keyBindings) : '',
  )

  $effect(() => {
    if (!keyBindings) {
      return
    }

    return registerKeyBindings([
      { keys: JSON.parse(keyBindings) as string[], handler: () => run() },
    ])
  })

  const onclick = (event: MouseEvent) => {
    if (isPlainLink) {
      return // Plain link: let Inertia handle it.
    }

    event.preventDefault()
    run()
  }

  /**
   * Tooltip triggers pass their own event handlers through the child snippet. Spreading them
   * after ours would silently replace the button's click handler, so compose both instead.
   */
  function withMergedHandlers(triggerProps: Record<string, unknown>): Record<string, unknown> {
    const triggerClick = triggerProps.onclick as ((event: MouseEvent) => void) | undefined

    return {
      ...triggerProps,
      onclick: (event: MouseEvent) => {
        triggerClick?.(event)
        onclick(event)
      },
    }
  }

  const buttonSize = $derived(variant === 'badge' ? 'xs' : resolveActionSize(action.size, size))
  const sizeProp = $derived(isIconOnly ? iconButtonSize(buttonSize) : buttonSize)
  // `labeledFrom()`: icon only below the breakpoint; the label stays the accessible name.
  const LABEL_FROM: Record<string, string> = {
    sm: 'hidden sm:inline',
    md: 'hidden md:inline',
    lg: 'hidden lg:inline',
    xl: 'hidden xl:inline',
    '2xl': 'hidden 2xl:inline',
  }
  const ICON_ONLY_BELOW: Record<string, string> = {
    sm: 'max-sm:aspect-square max-sm:px-0',
    md: 'max-md:aspect-square max-md:px-0',
    lg: 'max-lg:aspect-square max-lg:px-0',
    xl: 'max-xl:aspect-square max-xl:px-0',
    '2xl': 'max-2xl:aspect-square max-2xl:px-0',
  }
  const labeledFrom = $derived(
    !isIconOnly && action.icon && action.labeledFrom ? action.labeledFrom : null,
  )
  const classes = $derived(
    cn(buttonClasses(), labeledFrom && ICON_ONLY_BELOW[labeledFrom], className),
  )
  const tooltip = $derived(action.tooltip ?? (isIconOnly ? action.label : undefined))
  const shortcut = $derived(bindsKeys ? action.keyBindings?.[0] : undefined)
  const t = useT()
  const newTabHint = $derived(t('opens_in_new_tab', {}, '(opens in a new tab)'))
  const newTab = $derived(isPlainLink && Boolean(action.openUrlInNewTab))
  const ariaLabel = $derived.by(() => {
    if (!isIconOnly && !labeledFrom) return undefined

    const name = action.label ?? action.tooltip ?? action.name

    return newTab ? `${name} ${newTabHint}` : name
  })
</script>

{#snippet content()}
  {#if busy}
    <Spinner />
  {:else if action.icon && action.iconPosition !== 'after'}
    <Icon name={action.icon} />
  {/if}
  {#if !isIconOnly}<span class={labeledFrom ? LABEL_FROM[labeledFrom] : undefined}
      >{action.label}</span
    >{#if newTab}<span class="sr-only"> {newTabHint}</span>{/if}{/if}
  {#if action.icon && action.iconPosition === 'after' && !busy}
    <Icon name={action.icon} />
  {/if}
  {#if action.badge !== undefined && action.badge !== null}
    <Badge
      variant="outline"
      class={cn('ms-1 px-1.5 py-0', colorClass(badgeColorClasses, action.badgeColor, 'gray'))}
      >{action.badge}</Badge
    >
  {/if}
{/snippet}

{#snippet button(triggerProps: Record<string, unknown> = {})}
  {@const extra = withMergedHandlers(triggerProps)}
  {#if isPlainLink}
    <Button
      href={action.url}
      external={action.openUrlInNewTab}
      target={action.openUrlInNewTab ? '_blank' : undefined}
      rel={action.openUrlInNewTab ? 'noopener noreferrer' : undefined}
      variant="plain"
      size={sizeProp}
      disabled={action.disabled}
      aria-label={ariaLabel}
      {...extraProps(action.extraAttributes, classes)}
      {...extra}
    >
      {@render content()}
    </Button>
  {:else}
    <Button
      type="button"
      variant="plain"
      size={sizeProp}
      disabled={action.disabled || busy}
      {onclick}
      aria-label={ariaLabel}
      {...extraProps(action.extraAttributes, classes)}
      {...extra}
    >
      {@render content()}
    </Button>
  {/if}
{/snippet}

{#if !tooltip && !shortcut}
  {@render button()}
{:else}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        {#if action.disabled && tooltip}
          <!-- A disabled button gets no pointer or focus events: a focusable span carries the
               tooltip (e.g. the reason from `authorizationTooltip()`). -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <span {...props} tabindex="0" class="inline-flex" data-slot="action-disabled-tooltip"
            >{@render button()}</span
          >
        {:else}
          {@render button(props)}
        {/if}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>
      {tooltip}
      {#if shortcut}<kbd class="ms-2 rounded border border-white/20 px-1 font-mono text-[10px]"
          >{formatKeyBinding(shortcut)}</kbd
        >{/if}
    </TooltipContent>
  </Tooltip>
{/if}
