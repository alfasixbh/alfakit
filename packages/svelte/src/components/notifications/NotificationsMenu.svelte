<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
  import {
    notificationTintStyles,
    NotificationCenter,
    onDatabaseNotificationsSent,
    onOpenDatabaseNotifications,
    pwaStore,
    startPwa,
    togglePushNotifications,
  } from '@alfakit/core'
  import BellIcon from '@lucide/svelte/icons/bell'
  import BellOffIcon from '@lucide/svelte/icons/bell-off'
  import BellRingIcon from '@lucide/svelte/icons/bell-ring'
  import CheckCheckIcon from '@lucide/svelte/icons/check-check'
  import Trash2Icon from '@lucide/svelte/icons/trash'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { toast } from 'svelte-sonner'
  import { useDirection, useFormatter, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cssColor, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import { ScrollArea } from '../ui/scroll-area'
  import { Spinner } from '../ui/spinner'
  import NotificationActionButton from './NotificationActionButton.svelte'

  /**
   * Bell menu for database notifications. It also opens when something calls
   * `openDatabaseNotifications()` (or an action with `->openDatabaseNotifications()`).
   * `variant="sidebar"`: a full-width row with a label, for layouts that put it in the sidebar.
   */
  let { variant = 'topbar' }: { variant?: 'topbar' | 'sidebar' } = $props()

  const t = useT()
  const format = useFormatter()
  const direction = $derived(useDirection())
  const panel = $derived(usePanel())
  const config = $derived(panel.databaseNotifications)

  const center = untrack(() => {
    const endpoints = panel.endpoints

    return endpoints.notifications &&
      endpoints.notificationsReadAll &&
      endpoints.notificationsDestroyAll
      ? new NotificationCenter(
          {
            notifications: endpoints.notifications,
            notificationsReadAll: endpoints.notificationsReadAll,
            notificationsDestroyAll: endpoints.notificationsDestroyAll,
          },
          panel.databaseNotifications?.unreadCount ?? 0,
        )
      : null
  })

  // `pwa(push: true)` in a starter kit: the app's user menu has no AlfaKit entries, so Web
  // Push is turned on or off from the bell's menu.
  const pwa = useStore(pwaStore)
  const kitPush = $derived(Boolean(panel.starterKit && panel.pwa?.push))
  const pushToggle = $derived(kitPush && pwa.current.push !== 'unsupported')
  const pushLabel = $derived(
    pwa.current.push === 'subscribed'
      ? t('pwa.notifications.disable', {}, 'Turn off notifications')
      : t('pwa.notifications.enable', {}, 'Turn on notifications'),
  )

  onMount(() => {
    if (kitPush) startPwa(panel.pwa)
  })

  async function togglePush() {
    const { message } = await togglePushNotifications()
    const text = t(message.key, {}, message.fallback)

    if (message.error) toast.error(text)
    else toast.success(text)
  }

  let open = $state(false)
  const centerState = useStore(
    center?.store ?? {
      get: () => ({ notifications: [], unreadCount: 0, loading: false, hasMore: false, page: 0 }),
      subscribe: () => () => {},
    },
  )

  // Depend on the interval value only: `panel` is a new object after every visit, and
  // restarting the timer each time would stop polling on pages that reload often.
  const pollingInterval = $derived(config?.pollingInterval)

  $effect(() => {
    const interval = pollingInterval

    untrack(() => center?.startPolling(interval))

    return () => center?.stopPolling()
  })

  $effect(() => {
    if (open) void center?.load()
  })

  // Every visit brings the server's unread count (another user after impersonating, or
  // notifications read in another tab): follow it instead of waiting for the next poll.
  const serverUnreadCount = $derived(config?.unreadCount)

  $effect(() => {
    const count = serverUnreadCount

    untrack(() => {
      if (center && typeof count === 'number' && count !== center.store.get().unreadCount) {
        center.store.update({ unreadCount: count })
      }
    })
  })

  // Realtime notifications announce stored ones, so the unread count updates right away.
  $effect(() => (center ? onDatabaseNotificationsSent(() => void center.load()) : undefined))

  // `openDatabaseNotifications()`: opened from code or an action.
  $effect(() => onOpenDatabaseNotifications(() => (open = true)))

  onDestroy(() => center?.stopPolling())
</script>

{#if config && center}
  <Popover bind:open>
    <PopoverTrigger>
      {#snippet child({ props })}
        {#if variant === 'sidebar'}
          <!-- The popover's props first: its `data-slot` must not replace ours (theme hook). -->
          <Button
            {...props}
            type="button"
            variant="ghost"
            class="relative w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            data-slot="notifications-trigger"
            data-variant="sidebar"
          >
            <!-- In a collapsed (icon) sidebar only the bell and its badge stay visible. -->
            <Icon
              name="alfakit::panels.topbar.open-database-notifications-button"
              fallback={BellIcon}
            />
            <span class="flex-1 text-start group-data-[collapsible=icon]:sr-only"
              >{t('notifications', {}, 'Notifications')}</span
            >
            {#if centerState.current.unreadCount > 0}
              <span
                class="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-end-1 group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:text-[10px]"
                >{centerState.current.unreadCount > 99 ? '99+' : centerState.current.unreadCount}
                <span class="sr-only">{t('unread_notifications', {}, 'unread')}</span></span
              >
            {/if}
          </Button>
        {:else}
          <Button
            {...props}
            type="button"
            variant="ghost"
            size="icon"
            class="relative"
            data-slot="notifications-trigger"
            aria-label={t('notifications', {}, 'Notifications')}
          >
            <Icon
              name="alfakit::panels.topbar.open-database-notifications-button"
              fallback={BellIcon}
            />
            {#if centerState.current.unreadCount > 0}
              <span
                class="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
                >{centerState.current.unreadCount > 99
                  ? '99+'
                  : centerState.current.unreadCount}</span
              >
            {/if}
          </Button>
        {/if}
      {/snippet}
    </PopoverTrigger>
    <PopoverContent
      align={variant === 'sidebar' ? 'start' : 'end'}
      side={variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'}
      class="w-80 p-0 sm:w-96"
    >
      <div class="flex items-center justify-between border-b px-3 py-2">
        <span class="text-sm font-semibold">{t('notifications', {}, 'Notifications')}</span>
        <div class="flex items-center gap-1">
          {#if pushToggle}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-slot="pwa-push"
              disabled={pwa.current.pushBusy || pwa.current.push === 'denied'}
              title={pushLabel}
              aria-label={pushLabel}
              onclick={() => void togglePush()}
            >
              {#if pwa.current.push === 'subscribed'}<BellOffIcon />{:else}<BellRingIcon />{/if}
            </Button>
          {/if}
          {#if centerState.current.unreadCount > 0}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={t('mark_all_read', {}, 'Mark all as read')}
              onclick={() => void center.markAllAsRead()}><CheckCheckIcon /></Button
            >
          {/if}
          {#if centerState.current.notifications.length > 0}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={t('clear_notifications', {}, 'Clear notifications')}
              onclick={() => void center.clear()}><Trash2Icon /></Button
            >
          {/if}
        </div>
      </div>
      <ScrollArea class="max-h-96">
        {#if centerState.current.loading && centerState.current.notifications.length === 0}
          <div class="flex justify-center py-8"><Spinner /></div>
        {:else if centerState.current.notifications.length === 0}
          <p class="text-muted-foreground px-3 py-8 text-center text-sm">
            {t('no_notifications', {}, 'You have no notifications.')}
          </p>
        {:else}
          <ul class="divide-y">
            {#each centerState.current.notifications as notification (notification.id)}
              <li
                class={cn('flex gap-3 px-3 py-3', !notification.readAt && 'bg-primary/5')}
                style:background-color={notification.color
                  ? notificationTintStyles(cssColor(notification.color)).item.backgroundColor
                  : undefined}
              >
                {#if notification.icon}<Icon
                    name={notification.icon}
                    class={cn(
                      'mt-0.5 size-5 shrink-0',
                      notification.iconColor && textColorClasses[notification.iconColor],
                    )}
                  />{/if}
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium">{notification.title}</p>
                    {#if !notification.readAt}
                      <button
                        type="button"
                        class="focus-visible:ring-ring/50 -me-2 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
                        aria-label={t('mark_as_read', {}, 'Mark as read')}
                        onclick={() => void center.markAsRead(notification.id)}
                        ><span class="bg-primary size-2 rounded-full" aria-hidden="true"
                        ></span></button
                      >
                    {/if}
                  </div>
                  {#if notification.body}<p class="text-muted-foreground text-sm">
                      {@html notification.body}
                    </p>{/if}
                  {#if notification.date}<time class="text-muted-foreground text-xs"
                      >{format.current.relative(notification.date)}</time
                    >{/if}
                  {#if notification.actions}
                    <div class="flex flex-wrap gap-1">
                      {#each notification.actions as action, actionIndex (uniqueKey(notification.actions, actionIndex, (item) => item.name))}
                        <NotificationActionButton
                          {action}
                          onMarkAsRead={() => void center.markAsRead(notification.id)}
                          onMarkAsUnread={() => void center.markAsUnread(notification.id)}
                        />
                      {/each}
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
        {#if centerState.current.hasMore && centerState.current.notifications.length > 0}
          <div class="flex justify-center border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={centerState.current.loading}
              onclick={() => void center.loadMore()}
            >
              {#if centerState.current.loading}<Spinner />{/if}
              {t('load_more', {}, 'Load more')}
            </Button>
          </div>
        {/if}
      </ScrollArea>
    </PopoverContent>
  </Popover>
{/if}
