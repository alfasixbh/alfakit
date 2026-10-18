import type { NotificationSchema } from '@alfakit/core'
import { notificationTintStyles, onCloseNotification } from '@alfakit/core'
import { defineComponent, h, markRaw, type Component } from 'vue'
import { toast } from 'vue-sonner'
import { cssColor, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import NotificationActionButton from './NotificationActionButton.vue'
import UndoButton from './UndoButton.vue'

let closeListening = false

// Starter kit mode: toasts go to Alfakit's own toaster (`STARTER_KIT_TOASTER_ID`).
let toasterId: string | undefined

/** Send Alfakit's toasts to the `<Toaster id>` with this id (undefined: the id-less one). */
export function setToasterId(id: string | undefined): void {
  toasterId = id
}

/** `closeNotification(id)` (or a `close-notification` event) dismisses that toast. */
export function listenForClosedNotifications(): void {
  if (closeListening || typeof window === 'undefined') return

  closeListening = true
  onCloseNotification((id) => toast.dismiss(id))
}

export function showToast(notification: NotificationSchema, Custom?: Component): void {
  listenForClosedNotifications()

  const duration =
    notification.duration === 'persistent' ? Infinity : (notification.duration ?? 6000)

  if (Custom) {
    toast.custom(markRaw(defineComponent({ setup: () => () => h(Custom, { notification }) })), {
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
      ? notificationTintStyles(cssColor(notification.color)).toast
      : undefined,
    // vue-sonner renders a component `action` as text ("{}"), so the notification's action
    // buttons go below the body inside the description, like the React and Svelte toasts.
    description:
      notification.body || hasActions
        ? markRaw(
            defineComponent({
              setup: () => () =>
                h('div', { class: 'flex flex-col gap-1' }, [
                  notification.body ? h('span', { innerHTML: notification.body }) : null,
                  hasActions
                    ? h('div', { class: 'mt-1 flex flex-wrap items-center gap-1' }, [
                        notification.undo
                          ? h(UndoButton, {
                              key: 'undo',
                              undo: notification.undo,
                              toastId: notification.id,
                            })
                          : null,
                        ...(notification.actions ?? []).map((action) =>
                          h(NotificationActionButton, {
                            key: action.name,
                            action,
                            toastId: notification.id,
                          }),
                        ),
                      ])
                    : null,
                ]),
            }),
          )
        : undefined,
    icon: notification.icon
      ? markRaw(
          defineComponent({
            setup: () => () =>
              h(Icon, {
                name: notification.icon,
                class: cn(
                  'size-4',
                  notification.iconColor && textColorClasses[notification.iconColor],
                ),
              }),
          }),
        )
      : undefined,
  })
}
