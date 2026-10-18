<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import type { NotificationSchema } from '@alfakit/core'
  import { notificationTintStyles } from '@alfakit/core'
  import { toast } from 'svelte-sonner'
  import XIcon from '@lucide/svelte/icons/x'
  import { cssColor, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import NotificationActionButton from './NotificationActionButton.svelte'
  import UndoButton from './UndoButton.svelte'
  import { useT } from '../../context.svelte'

  let { notification }: { notification: NotificationSchema } = $props()

  const STATUS_ICONS: Record<string, string> = {
    success: 'circle-check',
    danger: 'circle-x',
    warning: 'triangle-alert',
    info: 'info',
  }
  const icon = $derived(
    notification.icon ?? (notification.status ? STATUS_ICONS[notification.status] : undefined),
  )

  // The same tinted colours as sonner's `richColors` toasts in the React and Vue renderers.
  const RICH: Record<string, string> = {
    success: 'success',
    danger: 'error',
    warning: 'warning',
    info: 'info',
  }
  const rich = $derived(
    notification.status && !notification.color ? RICH[notification.status] : undefined,
  )

  // `color()`: tints the background (it replaces the status colours).
  const tint = $derived(
    notification.color
      ? Object.entries(notificationTintStyles(cssColor(notification.color)).toast)
          .map(([property, value]) => `${property}: ${value}`)
          .join('; ') + '; background: var(--normal-bg); border-color: var(--normal-border)'
      : undefined,
  )

  const t = useT()
</script>

<!-- Rich toast body: HTML content, custom icon and action buttons. -->
<div
  data-slot="alfakit-toast"
  class={cn(
    'flex w-full items-start gap-3 rounded-lg border p-4 text-sm shadow-lg',
    !rich && 'bg-popover text-popover-foreground',
  )}
  style={rich
    ? `background: var(--${rich}-bg); border-color: var(--${rich}-border); color: var(--${rich}-text)`
    : tint}
>
  {#if icon}
    <Icon
      name={icon}
      class={cn(
        'mt-0.5 size-5 shrink-0',
        textColorClasses[notification.iconColor ?? notification.status ?? 'gray'],
      )}
    />
  {/if}
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    {#if notification.title}<p class="font-medium">{notification.title}</p>{/if}
    {#if notification.body}<div class={rich ? 'opacity-90' : 'text-muted-foreground'}>
        {@html notification.body}
      </div>{/if}
    {#if notification.undo || (notification.actions && notification.actions.length > 0)}
      <div class="mt-1 flex flex-wrap items-center gap-1">
        {#if notification.undo}
          <UndoButton undo={notification.undo} toastId={notification.id} />
        {/if}
        {#each notification.actions ?? [] as action, actionIndex (uniqueKey(notification.actions ?? [], actionIndex, (item) => item.name))}
          <NotificationActionButton {action} toastId={notification.id} />
        {/each}
      </div>
    {/if}
  </div>
  <button
    type="button"
    class="text-muted-foreground hover:text-foreground"
    aria-label={t('close', {}, 'Close')}
    onclick={() => toast.dismiss(notification.id)}
  >
    <XIcon class="size-4" />
  </button>
</div>
