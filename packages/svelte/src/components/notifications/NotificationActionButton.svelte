<script lang="ts">
  import type { NotificationActionSchema } from '@alfakit/core'
  import { resolveActionSize } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import { toast } from 'svelte-sonner'
  import {
    colorClass,
    ghostButtonColorClasses,
    outlineButtonColorClasses,
    solidButtonColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { Button } from '../ui/button'

  let {
    action,
    toastId,
    onMarkAsRead,
    onMarkAsUnread,
  }: {
    action: NotificationActionSchema
    toastId?: string
    onMarkAsRead?: () => void
    /** Database notifications: `markAsUnread()`. */
    onMarkAsUnread?: () => void
  } = $props()

  const run = () => {
    if (action.dispatch) {
      window.dispatchEvent(new CustomEvent(action.dispatch.event, { detail: action.dispatch.data }))
    }

    if (action.markAsRead) onMarkAsRead?.()
    if (action.markAsUnread) onMarkAsUnread?.()
    if (action.close && toastId) toast.dismiss(toastId)

    if (action.url) {
      if (action.openUrlInNewTab) window.open(action.url, '_blank', 'noopener')
      else router.visit(action.url)
    }
  }

  const variant = $derived.by(() => {
    switch (action.variant) {
      case 'button':
        return 'default'
      case 'outline':
        return 'outline'
      case 'ghost':
      case 'icon-button':
        return 'ghost'
      default:
        return 'link'
    }
  })

  // The action's `color()` applied to its variant (links default to the primary colour).
  const colorClasses = $derived.by(() => {
    const color = action.color

    if (!color) return undefined

    switch (action.variant) {
      case 'button':
        return colorClass(solidButtonColorClasses, color, 'primary')
      case 'outline':
        return colorClass(outlineButtonColorClasses, color, 'gray')
      case 'ghost':
      case 'icon-button':
        return colorClass(ghostButtonColorClasses, color, 'gray')
      default:
        return colorClass(textColorClasses, color, 'primary')
    }
  })
</script>

<Button
  type="button"
  size={resolveActionSize(action.size, 'xs')}
  {variant}
  class={colorClasses}
  onclick={run}
>
  {#if action.icon}<Icon name={action.icon} class="size-3.5" />{/if}
  {action.label}
</Button>
