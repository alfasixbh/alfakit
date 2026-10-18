<script lang="ts">
  import type { CalendarEnvironment, CalendarWidgetSchema } from '@alfakit/core'
  import { calendarIdentity, calendarOptions, clientErrorNotification } from '@alfakit/core'
  import { Calendar, type CalendarOptions } from '@fullcalendar/core'
  import dayGridPlugin from '@fullcalendar/daygrid'
  import interactionPlugin from '@fullcalendar/interaction'
  import listPlugin from '@fullcalendar/list'
  import timeGridPlugin from '@fullcalendar/timegrid'
  import { router } from '@inertiajs/svelte'
  import { untrack } from 'svelte'
  import { useActionRunner, useDirection, useLocalization, useT } from '../../context.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import ActionList from '../actions/ActionList.svelte'
  import { showToast } from '../notifications/toast'
  import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

  /**
   * The calendar widget (alfasix/alfakit-calendar, registry key `widget:calendar`). Events
   * are fetched for the visible range through the widget's actions; FullCalendar loads with
   * this component's own chunk.
   */
  let { widget }: { widget: CalendarWidgetSchema } = $props()

  const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = $derived(useDirection())
  const localization = $derived(useLocalization())
  let element = $state<HTMLDivElement | null>(null)
  let calendar: Calendar | null = null

  const environment = (): CalendarEnvironment => ({
    runner,
    token: page.token,
    t,
    locale: localization?.tag ?? 'en',
    direction,
    firstDayOfWeek: localization?.firstDayOfWeek ?? 0,
    visit: (url, newTab) => (newTab ? window.open(url, '_blank', 'noopener') : router.visit(url)),
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification(`calendar-${widget.id}`, message)),
  })

  // Views, locale, direction or interactions changed: a new calendar.
  const identity = $derived(calendarIdentity(widget, environment()))

  $effect(() => {
    void identity

    if (!element) {
      return
    }

    const target = element
    const instance = untrack(
      () =>
        new Calendar(target, {
          ...(calendarOptions(
            $state.snapshot(widget) as CalendarWidgetSchema,
            environment(),
          ) as CalendarOptions),
          plugins,
          height: 'auto',
        }),
    )

    instance.render()
    calendar = instance

    return () => {
      instance.destroy()
      calendar = null
    }
  })

  // Anything else (an action ran, a poll) only refetches the events.
  let first = true

  $effect(() => {
    void widget

    if (first) {
      first = false

      return
    }

    untrack(() => calendar?.refetchEvents())
  })
</script>

<Card class="gap-4 py-4" data-slot="calendar-widget">
  {#if widget.heading || widget.headerActions?.length}
    <CardHeader class="px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        {#if widget.heading}
          <CardTitle class="text-base">{widget.heading}</CardTitle>
        {/if}
        {#if widget.headerActions}
          <ActionList
            actions={widget.headerActions}
            context={{ token: page.token, component: `widget:${widget.id}` }}
            size="sm"
            align="end"
            class="ms-auto"
          />
        {/if}
      </div>
    </CardHeader>
  {/if}
  <CardContent class="px-5">
    <div
      bind:this={element}
      data-slot="calendar"
      dir={direction}
      role="region"
      aria-label={widget.heading ?? t('calendar.label', {}, 'Calendar')}
    ></div>
  </CardContent>
</Card>
