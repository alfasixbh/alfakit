import type { CalendarWidgetSchema } from '@alfakit/core'
import { calendarIdentity, calendarOptions, clientErrorNotification } from '@alfakit/core'
import { Calendar, type CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import { router } from '@inertiajs/react'
import { useEffect, useRef } from 'react'
import { useActionRunner, useDirection, useLocalization, useT } from '../../context'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { showToast } from '../notifications/flash-toasts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]

/**
 * The calendar widget (alfasix/alfakit-calendar, registry key `widget:calendar`). Events
 * are fetched for the visible range through the widget's actions; FullCalendar loads with
 * this component's own chunk.
 */
export function CalendarWidget({ widget }: { widget: CalendarWidgetSchema }) {
  const element = useRef<HTMLDivElement>(null)
  const calendar = useRef<Calendar | null>(null)
  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const direction = useDirection()
  const localization = useLocalization()

  const env = {
    runner,
    token: page.token,
    t,
    locale: localization?.tag ?? 'en',
    direction,
    firstDayOfWeek: localization?.firstDayOfWeek ?? 0,
    visit: (url: string, newTab: boolean) =>
      newTab ? window.open(url, '_blank', 'noopener') : router.visit(url),
    notify: (notifications: Parameters<typeof showToast>[0][]) =>
      notifications.forEach((notification) => showToast(notification)),
    error: (message: string) =>
      showToast(clientErrorNotification(`calendar-${widget.id}`, message)),
  }
  // The callbacks always see the latest schema and context without recreating the calendar.
  const latest = useRef({ widget, env })

  useEffect(() => {
    latest.current = { widget, env }
  })

  const identity = calendarIdentity(widget, env)

  useEffect(() => {
    if (!element.current) {
      return
    }

    const options = calendarOptions(latest.current.widget, {
      ...latest.current.env,
      runner: {
        trigger: (...args) => latest.current.env.runner.trigger(...args),
        executeJson: (...args) => latest.current.env.runner.executeJson(...args),
      },
    })
    const instance = new Calendar(element.current, {
      ...(options as CalendarOptions),
      plugins,
      height: 'auto',
    })

    instance.render()
    calendar.current = instance

    return () => {
      instance.destroy()
      calendar.current = null
    }
  }, [identity])

  // A new schema (after an action ran, or a poll) brings fresh events.
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    calendar.current?.refetchEvents()
  }, [widget])

  return (
    <Card className="gap-4 py-4" data-slot="calendar-widget">
      {(widget.heading || widget.headerActions?.length) && (
        <CardHeader className="px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {widget.heading && <CardTitle className="text-base">{widget.heading}</CardTitle>}
            {widget.headerActions && (
              <ActionList
                actions={widget.headerActions}
                context={{ token: page.token, component: `widget:${widget.id}` }}
                size="sm"
                align="end"
                className="ms-auto"
              />
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="px-5">
        <div
          ref={element}
          data-slot="calendar"
          dir={direction}
          aria-label={widget.heading ?? t('calendar.label', {}, 'Calendar')}
          role="region"
        />
      </CardContent>
    </Card>
  )
}
