import type { NotificationSchema } from '@alfakit/core'
import { onCloseNotification } from '@alfakit/core'
import type { Component } from 'svelte'
import { toast } from 'svelte-sonner'
import AlfakitToast from './AlfakitToast.svelte'

export type NotificationComponent = Component<{ notification: NotificationSchema }>

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

/** Show an Alfakit notification as a sonner toast (optionally with a custom renderer). */
export function showToast(notification: NotificationSchema, Custom?: NotificationComponent): void {
  listenForClosedNotifications()

  const duration =
    notification.duration === 'persistent' ? Infinity : (notification.duration ?? 6000)

  if (Custom) {
    toast.custom(Custom, {
      id: notification.id,
      duration,
      toasterId,
      componentProps: { notification },
    })

    return
  }

  const rich =
    (notification.body !== undefined && /<[a-z][\s\S]*>/i.test(notification.body)) ||
    (notification.actions?.length ?? 0) > 0 ||
    // `Action::undoable()`: the "Undo" button lives in the Alfakit toast.
    Boolean(notification.undo) ||
    Boolean(notification.icon) ||
    // `color()`: the tinted background needs the Alfakit toast.
    Boolean(notification.color)

  if (rich) {
    toast.custom(AlfakitToast, {
      id: notification.id,
      duration,
      toasterId,
      componentProps: { notification },
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

  method(notification.title ?? '', {
    id: notification.id,
    duration,
    toasterId,
    description: notification.body,
  })
}
