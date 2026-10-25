<script lang="ts">
  import type { CalloutSchema } from '@alfakit/core'
  import { actionsAlignmentClass, fieldActionContext } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { colorClass, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import ActionList from '../actions/ActionList.svelte'
  import MixedContent from './MixedContent.svelte'

  const CALLOUT_COLORS: Record<string, string> = {
    primary: 'border-primary/30 bg-primary/5 [&_[data-slot=callout-icon]]:text-primary',
    secondary: 'border-border bg-secondary [&_[data-slot=callout-icon]]:text-secondary-foreground',
    success: 'border-success/30 bg-success/5 [&_[data-slot=callout-icon]]:text-success',
    warning: 'border-warning/40 bg-warning/10 [&_[data-slot=callout-icon]]:text-warning',
    danger: 'border-destructive/30 bg-destructive/5 [&_[data-slot=callout-icon]]:text-destructive',
    info: 'border-info/30 bg-info/5 [&_[data-slot=callout-icon]]:text-info',
    gray: 'border-border bg-muted/40 [&_[data-slot=callout-icon]]:text-muted-foreground',
  }

  const CALLOUT_ICON_SIZES: Record<string, string> = {
    xs: 'size-4',
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
    xl: 'size-7',
    '2xl': 'size-8',
  }

  let { component }: { component: CalloutSchema } = $props()
  // Inside a form the actions run as field actions of this component, so `$get` / `$set`
  // reach the form (like a section's header actions).
  const form = useOptionalFormStore()
  const pageContext = usePageActionContext()
  const context = $derived(
    form ? fieldActionContext({ token: pageContext.token, form, key: component.key }) : pageContext,
  )
  const tone = $derived(component.color ?? component.status)
  // `iconColor()`, or the status colour once `color(null)` removed the background.
  const iconColor = $derived(
    component.iconColor ?? (component.color ? undefined : component.status),
  )
</script>

<div
  data-slot="callout"
  data-color={component.color ?? 'gray'}
  data-status={component.status}
  role={tone === 'danger' || tone === 'warning' ? 'alert' : 'note'}
  {...extraProps(
    component.extraAttributes,
    cn(
      'flex items-start gap-3 rounded-lg border p-4 text-sm',
      colorClass(CALLOUT_COLORS, component.color),
    ),
  )}
>
  {#if component.icon}
    <span data-slot="callout-icon" class="mt-0.5 shrink-0">
      <Icon
        name={component.icon}
        class={cn(
          (component.iconSize && CALLOUT_ICON_SIZES[component.iconSize]) || 'size-5',
          iconColor && colorClass(textColorClasses, iconColor),
        )}
      />
    </span>
  {/if}
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    {#if component.heading}<p class="leading-6 font-semibold">{component.heading}</p>{/if}
    {#if component.description}
      <!-- Escaped by the server (`Html::from`). -->
      <div class="text-muted-foreground alfakit-prose">{@html component.description}</div>
    {/if}
    {#if component.actions && component.actions.length > 0}
      <ActionList
        actions={component.actions}
        {context}
        size="sm"
        class={cn('mt-2', actionsAlignmentClass(component.footerActionsAlignment))}
      />
    {/if}
    <MixedContent items={component.footer} name="callout-footer" class="mt-2" {context} />
  </div>
  <MixedContent
    items={component.controls}
    name="callout-controls"
    class="-me-1 -mt-1 shrink-0 gap-1"
    {context}
  />
</div>
