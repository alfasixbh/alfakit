<script setup lang="ts">
import type { CalendarEnvironment, CalendarWidgetSchema, NotificationSchema } from '@alfakit/core'
import { calendarIdentity, calendarOptions, clientErrorNotification } from '@alfakit/core'
import { Calendar, type CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import { router } from '@inertiajs/vue3'
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useActionRunner, useDirection, useLocalization, useT } from '../../context'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'
import { showToast } from '../notifications/flash-toasts'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import CardHeader from '../ui/CardHeader.vue'
import CardTitle from '../ui/CardTitle.vue'

/**
 * The calendar widget (alfasix/alfakit-calendar, registry key `widget:calendar`). Events
 * are fetched for the visible range through the widget's actions; FullCalendar loads with
 * this component's own chunk.
 */
const props = defineProps<{ widget: CalendarWidgetSchema }>()

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]
const element = ref<HTMLDivElement | null>(null)
const runner = useActionRunner()
const page = usePageActionContext()
const t = useT()
const direction = useDirection()
const localization = useLocalization()
let calendar: Calendar | null = null

const environment = (): CalendarEnvironment => ({
  runner,
  token: page.token,
  t,
  locale: localization.value?.tag ?? 'en',
  direction: direction.value,
  firstDayOfWeek: localization.value?.firstDayOfWeek ?? 0,
  visit: (url, newTab) => (newTab ? window.open(url, '_blank', 'noopener') : router.visit(url)),
  notify: (notifications: NotificationSchema[]) =>
    notifications.forEach((notification) => showToast(notification)),
  error: (message) => showToast(clientErrorNotification(`calendar-${props.widget.id}`, message)),
})

const create = () => {
  calendar?.destroy()
  calendar = null

  if (!element.value) {
    return
  }

  // The callbacks read the current schema, so a refetch after an action sees fresh actions.
  const options = calendarOptions(toRaw(props.widget), environment())

  calendar = new Calendar(element.value, {
    ...(options as CalendarOptions),
    plugins,
    height: 'auto',
  })
  calendar.render()
}

onMounted(create)
onBeforeUnmount(() => {
  calendar?.destroy()
  calendar = null
})

// Views, locale, direction or interactions changed: a new calendar. Anything else (an
// action ran, a poll) only refetches the events.
watch(
  () => calendarIdentity(props.widget, environment()),
  () => create(),
)
watch(
  () => props.widget,
  () => calendar?.refetchEvents(),
)
</script>

<template>
  <Card class="gap-4 py-4" data-slot="calendar-widget">
    <CardHeader v-if="props.widget.heading || props.widget.headerActions?.length" class="px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <CardTitle v-if="props.widget.heading" class="text-base">{{
          props.widget.heading
        }}</CardTitle>
        <ActionList
          v-if="props.widget.headerActions"
          :actions="props.widget.headerActions"
          :context="{ token: page.token, component: `widget:${props.widget.id}` }"
          size="sm"
          align="end"
          class="ms-auto"
        />
      </div>
    </CardHeader>
    <CardContent class="px-5">
      <div
        ref="element"
        data-slot="calendar"
        :dir="direction"
        role="region"
        :aria-label="props.widget.heading ?? t('calendar.label', {}, 'Calendar')"
      />
    </CardContent>
  </Card>
</template>
