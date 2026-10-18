<script lang="ts">
  /**
   * A table toolbar button (filters, column manager, grouping, reordering, apply / reset)
   * in its default look or as customised with `filtersTriggerAction()` & co. Extra props
   * (`aria-*`, handlers, popover trigger props) reach the button.
   */
  import type { TriggerButtonView } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import {
    badgeColorClasses,
    colorClass,
    outlineButtonColorClasses,
    solidButtonColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'

  type Props = Omit<HTMLButtonAttributes, 'children'> & {
    ref?: HTMLElement | null
    view: TriggerButtonView
    /** Icon of the default look; a server icon (`->icon()`) replaces it. */
    defaultIcon?: Snippet
    /** The default look hides the label below `sm` (icon only on phones). */
    responsiveLabel?: boolean
    /** Highlight the default look (active filters, an active grouping). */
    active?: boolean
  }

  let {
    ref = $bindable(null),
    view,
    defaultIcon,
    responsiveLabel = false,
    active = false,
    class: className,
    disabled,
    ...rest
  }: Props = $props()

  const iconOnly = $derived(!view.showLabel)
  const hasIcon = $derived(Boolean(view.icon || defaultIcon))
  const colored = $derived(
    view.color
      ? view.variant === 'default'
        ? colorClass(solidButtonColorClasses, view.color, 'primary')
        : view.variant === 'outline'
          ? colorClass(outlineButtonColorClasses, view.color, 'gray')
          : colorClass(textColorClasses, view.color, 'primary')
      : undefined,
  )
  const size = $derived(
    iconOnly
      ? view.size === 'xs'
        ? 'icon-xs'
        : view.size === 'lg'
          ? 'icon'
          : 'icon-sm'
      : view.size,
  )
</script>

{#snippet icon()}
  {#if view.icon}
    <Icon name={view.icon} />
  {:else}
    {@render defaultIcon?.()}
  {/if}
{/snippet}

<Button
  bind:ref
  type="button"
  variant={view.variant}
  {size}
  title={view.tooltip}
  aria-label={iconOnly ? view.label : undefined}
  data-slot="table-trigger"
  {...rest}
  disabled={view.disabled || disabled}
  class={cn(
    colored,
    active && !view.color && view.variant === 'outline' && 'border-primary/50 text-primary',
    typeof className === 'string' ? className : undefined,
  )}
>
  {#if !view.iconAfter}{@render icon()}{/if}
  {#if !iconOnly}
    <span class={cn(responsiveLabel && hasIcon ? 'sr-only sm:not-sr-only' : undefined)}>
      {view.label}
    </span>
  {/if}
  {#if view.iconAfter}{@render icon()}{/if}
  {#if view.badge !== undefined && view.badge !== null && view.badge !== 0}
    <Badge
      class={cn(
        'ms-1 h-5 min-w-5 px-1',
        view.badgeColor && colorClass(badgeColorClasses, view.badgeColor, 'primary'),
      )}
    >
      {view.badge}
    </Badge>
  {/if}
</Button>
