import {
  NotificationCenter,
  notificationTintStyles,
  onDatabaseNotificationsSent,
  onOpenDatabaseNotifications,
} from '@alfakit/core'
import { BellIcon, CheckCheckIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDirection, useFormatter, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cssColor, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { ScrollArea } from '../ui/scroll-area'
import { Spinner } from '../ui/spinner'
import { NotificationActionButton } from './flash-toasts'

export interface NotificationsMenuProps {
  /**
   * Where the trigger sits: `topbar` (an icon button, default) or `sidebar` (a full-width
   * row with a label, for layouts that move the bell into the sidebar).
   */
  variant?: 'topbar' | 'sidebar'
}

/**
 * Bell menu for database notifications. It also opens when something calls
 * `openDatabaseNotifications()` (or an action with `->openDatabaseNotifications()`).
 */
export function NotificationsMenu({ variant = 'topbar' }: NotificationsMenuProps = {}) {
  const t = useT()
  const direction = useDirection()
  const format = useFormatter()
  const panel = usePanel()
  const config = panel.databaseNotifications
  const endpoints = panel.endpoints

  const center = useMemo(
    () =>
      endpoints.notifications && endpoints.notificationsReadAll && endpoints.notificationsDestroyAll
        ? new NotificationCenter(
            {
              notifications: endpoints.notifications,
              notificationsReadAll: endpoints.notificationsReadAll,
              notificationsDestroyAll: endpoints.notificationsDestroyAll,
            },
            config?.unreadCount ?? 0,
          )
        : null,
    [
      endpoints.notifications,
      endpoints.notificationsReadAll,
      endpoints.notificationsDestroyAll,
      config?.unreadCount,
    ],
  )

  const [open, setOpen] = useState(false)
  const state = useStore(
    center?.store ?? {
      get: () => ({ notifications: [], unreadCount: 0, loading: false, hasMore: false, page: 0 }),
      subscribe: () => () => {},
    },
  )

  useEffect(() => {
    if (!center) return

    center.startPolling(config?.pollingInterval)

    return () => center.stopPolling()
  }, [center, config?.pollingInterval])

  useEffect(() => {
    if (open) void center?.load()
  }, [open, center])

  // `openDatabaseNotifications()`: opened from code or an action.
  useEffect(() => onOpenDatabaseNotifications(() => setOpen(true)), [])

  // Realtime notifications announce stored ones, so the unread count updates right away.
  useEffect(
    () => (center ? onDatabaseNotificationsSent(() => void center.load()) : undefined),
    [center],
  )

  if (!config || !center) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'sidebar' ? (
          // In a collapsed (icon) sidebar only the bell and its badge stay visible.
          <Button
            type="button"
            variant="ghost"
            className="relative w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            data-slot="notifications-trigger"
            data-variant="sidebar"
          >
            <Icon
              name="alfakit::panels.topbar.open-database-notifications-button"
              fallback={BellIcon}
            />
            <span className="flex-1 text-start group-data-[collapsible=icon]:sr-only">
              {t('notifications', {}, 'Notifications')}
            </span>
            {state.unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-end-1 group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:text-[10px]">
                {state.unreadCount > 99 ? '99+' : state.unreadCount}
                <span className="sr-only"> {t('unread_notifications', {}, 'unread')}</span>
              </span>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t('notifications', {}, 'Notifications')}
            data-slot="notifications-trigger"
          >
            <Icon
              name="alfakit::panels.topbar.open-database-notifications-button"
              fallback={BellIcon}
            />
            {state.unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                {state.unreadCount > 99 ? '99+' : state.unreadCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={variant === 'sidebar' ? 'start' : 'end'}
        side={variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'}
        className="w-80 p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t('notifications', {}, 'Notifications')}</span>
          <div className="flex items-center gap-1">
            {state.unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={t('mark_all_read', {}, 'Mark all as read')}
                onClick={() => void center.markAllAsRead()}
              >
                <CheckCheckIcon />
              </Button>
            )}
            {state.notifications.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={t('clear_notifications', {}, 'Clear notifications')}
                onClick={() => void center.clear()}
              >
                <Trash2Icon />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {state.loading && state.notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : state.notifications.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              {t('no_notifications', {}, 'You have no notifications.')}
            </p>
          ) : (
            <ul className="divide-y">
              {state.notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn('flex gap-3 px-3 py-3', !notification.readAt && 'bg-primary/5')}
                  style={
                    notification.color
                      ? notificationTintStyles(cssColor(notification.color)).item
                      : undefined
                  }
                >
                  {notification.icon && (
                    <Icon
                      name={notification.icon}
                      className={cn(
                        'mt-0.5 size-5 shrink-0',
                        notification.iconColor && textColorClasses[notification.iconColor],
                      )}
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.readAt && (
                        <button
                          type="button"
                          className="focus-visible:ring-ring/50 -me-2 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
                          aria-label={t('mark_as_read', {}, 'Mark as read')}
                          onClick={() => void center.markAsRead(notification.id)}
                        >
                          <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {notification.body && (
                      <p
                        className="text-muted-foreground text-sm"
                        dangerouslySetInnerHTML={{ __html: notification.body }}
                      />
                    )}
                    {notification.date && (
                      <time className="text-muted-foreground text-xs">
                        {format.relative(notification.date)}
                      </time>
                    )}
                    {notification.actions && (
                      <div className="flex flex-wrap gap-1">
                        {notification.actions.map((action) => (
                          <NotificationActionButton
                            key={action.name}
                            action={action}
                            onMarkAsRead={() => void center.markAsRead(notification.id)}
                            onMarkAsUnread={() => void center.markAsUnread(notification.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {state.hasMore && state.notifications.length > 0 && (
            <div className="flex justify-center border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={state.loading}
                onClick={() => void center.loadMore()}
              >
                {state.loading && <Spinner />}
                {t('load_more', {}, 'Load more')}
              </Button>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
