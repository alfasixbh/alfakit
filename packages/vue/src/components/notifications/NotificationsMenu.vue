<script setup lang="ts">
import {
  NotificationCenter,
  notificationTintStyles,
  onDatabaseNotificationsSent,
  onOpenDatabaseNotifications,
} from '@alfakit/core'
import { BellIcon, CheckCheckIcon, Trash2Icon } from '@lucide/vue'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useDirection, useFormatter, usePanel, useT } from '../../context'
import { cssColor, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import ScrollArea from '../ui/ScrollArea.vue'
import Spinner from '../ui/Spinner.vue'
import NotificationActionButton from './NotificationActionButton.vue'

/**
 * Bell menu for database notifications. It also opens when something calls
 * `openDatabaseNotifications()` (or an action with `->openDatabaseNotifications()`).
 * `variant="sidebar"`: a full-width row with a label, for layouts that put it in the sidebar.
 */
const props = withDefaults(defineProps<{ variant?: 'topbar' | 'sidebar' }>(), {
  variant: 'topbar',
})
const t = useT()
const direction = useDirection()
const panel = usePanel()
const config = computed(() => panel.value.databaseNotifications)
const endpoints = panel.value.endpoints

const center =
  endpoints.notifications && endpoints.notificationsReadAll && endpoints.notificationsDestroyAll
    ? new NotificationCenter(
        {
          notifications: endpoints.notifications,
          notificationsReadAll: endpoints.notificationsReadAll,
          notificationsDestroyAll: endpoints.notificationsDestroyAll,
        },
        config.value?.unreadCount ?? 0,
      )
    : null

const open = ref(false)
const state = useStore(
  center?.store ?? {
    get: () => ({ notifications: [], unreadCount: 0, loading: false, hasMore: false, page: 0 }),
    subscribe: () => () => {},
  },
)

// Polling starts in the browser only: a server render must not leave timers behind.
onMounted(() => {
  watch(
    () => config.value?.pollingInterval,
    (interval) => center?.startPolling(interval),
    { immediate: true },
  )
})

watch(open, (isOpen) => {
  if (isOpen) void center?.load()
})

// Every visit brings the server's unread count (another user after impersonating, or
// notifications read in another tab): follow it instead of waiting for the next poll.
watch(
  () => config.value?.unreadCount,
  (count) => {
    if (center && typeof count === 'number' && count !== center.store.get().unreadCount) {
      center.store.update({ unreadCount: count })
    }
  },
)

// Realtime notifications announce stored ones, so the unread count updates right away.
let stopListening: (() => void) | null = null
onMounted(() => {
  stopListening = center ? onDatabaseNotificationsSent(() => void center.load()) : null
})
onScopeDispose(() => stopListening?.())

// `openDatabaseNotifications()`: opened from code or an action.
let stopOpenListener: (() => void) | null = null
onMounted(() => {
  stopOpenListener = onOpenDatabaseNotifications(() => (open.value = true))
})
onScopeDispose(() => stopOpenListener?.())

onScopeDispose(() => center?.stopPolling())
const format = useFormatter()
</script>

<template>
  <Popover v-if="config && center" :open="open" @update:open="open = $event">
    <PopoverTrigger as-child>
      <Button
        v-if="props.variant === 'sidebar'"
        type="button"
        variant="ghost"
        class="relative w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        data-slot="notifications-trigger"
        data-variant="sidebar"
      >
        <!-- In a collapsed (icon) sidebar only the bell and its badge stay visible. -->
        <Icon
          name="alfakit::panels.topbar.open-database-notifications-button"
          :fallback="BellIcon"
        />
        <span class="flex-1 text-start group-data-[collapsible=icon]:sr-only">{{
          t('notifications', {}, 'Notifications')
        }}</span>
        <span
          v-if="state.unreadCount > 0"
          class="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-end-1 group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:text-[10px]"
          >{{ state.unreadCount > 99 ? '99+' : state.unreadCount }}
          <span class="sr-only">{{ t('unread_notifications', {}, 'unread') }}</span></span
        >
      </Button>
      <Button
        v-else
        type="button"
        variant="ghost"
        size="icon"
        class="relative"
        data-slot="notifications-trigger"
        :aria-label="t('notifications', {}, 'Notifications')"
      >
        <Icon
          name="alfakit::panels.topbar.open-database-notifications-button"
          :fallback="BellIcon"
        />
        <span
          v-if="state.unreadCount > 0"
          class="bg-primary text-primary-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
          >{{ state.unreadCount > 99 ? '99+' : state.unreadCount }}</span
        >
      </Button>
    </PopoverTrigger>
    <PopoverContent
      :align="props.variant === 'sidebar' ? 'start' : 'end'"
      :side="props.variant === 'sidebar' ? (direction === 'rtl' ? 'left' : 'right') : 'bottom'"
      class="w-80 p-0 sm:w-96"
    >
      <div class="flex items-center justify-between border-b px-3 py-2">
        <span class="text-sm font-semibold">{{ t('notifications', {}, 'Notifications') }}</span>
        <div class="flex items-center gap-1">
          <Button
            v-if="state.unreadCount > 0"
            type="button"
            variant="ghost"
            size="icon-sm"
            :title="t('mark_all_read', {}, 'Mark all as read')"
            @click="void center.markAllAsRead()"
            ><CheckCheckIcon
          /></Button>
          <Button
            v-if="state.notifications.length > 0"
            type="button"
            variant="ghost"
            size="icon-sm"
            :title="t('clear_notifications', {}, 'Clear notifications')"
            @click="void center.clear()"
            ><Trash2Icon
          /></Button>
        </div>
      </div>
      <ScrollArea class="max-h-96">
        <div
          v-if="state.loading && state.notifications.length === 0"
          class="flex justify-center py-8"
        >
          <Spinner />
        </div>
        <p
          v-else-if="state.notifications.length === 0"
          class="text-muted-foreground px-3 py-8 text-center text-sm"
        >
          {{ t('no_notifications', {}, 'You have no notifications.') }}
        </p>
        <ul v-else class="divide-y">
          <li
            v-for="notification in state.notifications"
            :key="notification.id"
            :class="cn('flex gap-3 px-3 py-3', !notification.readAt && 'bg-primary/5')"
            :style="
              notification.color
                ? notificationTintStyles(cssColor(notification.color)).item
                : undefined
            "
          >
            <Icon
              v-if="notification.icon"
              :name="notification.icon"
              :class="
                cn(
                  'mt-0.5 size-5 shrink-0',
                  notification.iconColor && textColorClasses[notification.iconColor],
                )
              "
            />
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium">{{ notification.title }}</p>
                <button
                  v-if="!notification.readAt"
                  type="button"
                  class="focus-visible:ring-ring/50 -me-2 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
                  :aria-label="t('mark_as_read', {}, 'Mark as read')"
                  @click="void center.markAsRead(notification.id)"
                >
                  <span class="bg-primary size-2 rounded-full" aria-hidden="true" />
                </button>
              </div>
              <p
                v-if="notification.body"
                class="text-muted-foreground text-sm"
                v-html="notification.body"
              />
              <time v-if="notification.date" class="text-muted-foreground text-xs">{{
                format.relative(notification.date)
              }}</time>
              <div v-if="notification.actions" class="flex flex-wrap gap-1">
                <NotificationActionButton
                  v-for="action in notification.actions"
                  :key="action.name"
                  :action="action"
                  :on-mark-as-read="() => void center!.markAsRead(notification.id)"
                  :on-mark-as-unread="() => void center!.markAsUnread(notification.id)"
                />
              </div>
            </div>
          </li>
        </ul>
        <div
          v-if="state.hasMore && state.notifications.length > 0"
          class="flex justify-center border-t p-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            :disabled="state.loading"
            @click="void center!.loadMore()"
          >
            <Spinner v-if="state.loading" />
            {{ t('load_more', {}, 'Load more') }}
          </Button>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
