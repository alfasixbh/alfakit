import type { NotificationActionSchema, NotificationSchema } from '@alfakit/core'
import { notificationTintStyles, onCloseNotification, resolveActionSize } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegistry } from '../../context'
import {
  colorClass,
  cssColor,
  ghostButtonColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { ensureFlashToasts } from '../../standalone/runtime'
import { Button } from '../ui/button'
import { UndoButton } from './undo-button'

/**
 * Turns flashed Alfakit notifications into sonner toasts. Mount once. Inertia 3 delivers
 * flash data as `page.flash` (and a `flash` event), not as a page prop, so this shares the
 * listener the standalone toaster uses.
 */
export function FlashToasts() {
  const registry = useRegistry()

  useEffect(() => {
    ensureFlashToasts(registry)
  }, [registry])

  return null
}

let closeListening = false

// Starter kit mode: toasts go to Alfakit's own toaster (`STARTER_KIT_TOASTER_ID`).
let toasterId: string | undefined

/** Send Alfakit's toasts to the `<Toaster id>` with this id (undefined: the id-less one). */
export function setToasterId(id: string | undefined): void {
  toasterId = id
}

/**
 * Options for a direct `toast.*()` call: the starter kit toaster's id merged in, so PWA and
 * notification messages reach AlfaKit's toaster in a starter kit too (W-S1-03).
 */
export function toastOptions<T extends object>(options?: T): T & { toasterId?: string } {
  return { ...(options ?? ({} as T)), toasterId }
}

/** `closeNotification(id)` (or a `close-notification` event) dismisses that toast. */
export function listenForClosedNotifications(): void {
  if (closeListening || typeof window === 'undefined') return

  closeListening = true
  onCloseNotification((id) => toast.dismiss(id))
}

export function showToast(
  notification: NotificationSchema,
  Custom?: React.ComponentType<{ notification: NotificationSchema }>,
) {
  listenForClosedNotifications()

  const duration =
    notification.duration === 'persistent' ? Infinity : (notification.duration ?? 6000)

  if (Custom) {
    toast.custom(() => <Custom notification={notification} />, {
      id: notification.id,
      duration,
      toasterId,
    })

    return
  }

  const method =
    notification.status === 'success'
      ? toast.success
      : notification.status === 'danger'
        ? toast.error
        : notification.status === 'warning'
          ? toast.warning
          : notification.status === 'info'
            ? toast.info
            : toast

  const hasActions = (notification.actions?.length ?? 0) > 0 || Boolean(notification.undo)

  method(notification.title ?? '', {
    id: notification.id,
    duration,
    toasterId,
    // `color()`: tints the toast's background.
    style: notification.color
      ? (notificationTintStyles(cssColor(notification.color)).toast as React.CSSProperties)
      : undefined,
    // Action buttons go below the body (as in the Vue and Svelte toasts): sonner's `action`
    // slot sits beside the title and squeezes it into a narrow column.
    description:
      notification.body || hasActions ? (
        <div className="flex flex-col gap-1">
          {notification.body && <span dangerouslySetInnerHTML={{ __html: notification.body }} />}
          {hasActions && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {notification.undo && (
                <UndoButton undo={notification.undo} toastId={notification.id} />
              )}
              {(notification.actions ?? []).map((action) => (
                <NotificationActionButton
                  key={action.name}
                  action={action}
                  toastId={notification.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : undefined,
    icon: notification.icon ? (
      <Icon
        name={notification.icon}
        className={cn('size-4', notification.iconColor && textColorClasses[notification.iconColor])}
      />
    ) : undefined,
  })
}

export function NotificationActionButton({
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
}) {
  const run = () => {
    if (action.dispatch) {
      window.dispatchEvent(new CustomEvent(action.dispatch.event, { detail: action.dispatch.data }))
    }

    if (action.markAsRead) onMarkAsRead?.()
    if (action.markAsUnread) onMarkAsUnread?.()
    if (action.close && toastId) toast.dismiss(toastId)

    if (action.url) {
      if (action.openUrlInNewTab) {
        window.open(action.url, '_blank', 'noopener')
      } else {
        router.visit(action.url)
      }
    }
  }

  return (
    <Button
      type="button"
      size={resolveActionSize(action.size, 'xs')}
      variant={notificationActionVariant(action)}
      className={notificationActionClasses(action)}
      onClick={run}
    >
      {action.icon && <Icon name={action.icon} className="size-3.5" />}
      {action.label}
    </Button>
  )
}

function notificationActionVariant(
  action: NotificationActionSchema,
): 'default' | 'outline' | 'ghost' | 'link' {
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
}

/** The action's `color()` applied to its variant (links default to the primary colour). */
function notificationActionClasses(action: NotificationActionSchema): string | undefined {
  if (!action.color) return undefined

  switch (action.variant) {
    case 'button':
      return colorClass(solidButtonColorClasses, action.color, 'primary')
    case 'outline':
      return colorClass(outlineButtonColorClasses, action.color, 'gray')
    case 'ghost':
    case 'icon-button':
      return colorClass(ghostButtonColorClasses, action.color, 'gray')
    default:
      return colorClass(textColorClasses, action.color, 'primary')
  }
}
