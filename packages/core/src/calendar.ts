import type { ActionContext, ActionRunner } from './actions'
import type { Translator } from './i18n'
import type { ActionSchema } from './schema/actions'
import type {
  CalendarChangeResult,
  CalendarEventSchema,
  CalendarWidgetSchema,
} from './schema/calendar'
import type { NotificationSchema } from './schema/notifications'

/**
 * The framework-agnostic half of the calendar widget (alfasix/alfakit-calendar): every
 * renderer creates a FullCalendar `Calendar` with `calendarOptions()` and only adds the
 * card, the header actions and the lifecycle.
 *
 * FullCalendar runs in UTC mode: the server sends wall times in the calendar's timezone
 * (`2026-10-13T09:30:00`, no offset) and reads the same format back, so no timezone plugin
 * is needed and the server stays the only place that converts timezones.
 */

/** The widget's JSON actions (see `CalendarWidget` in PHP). */
export const CALENDAR_FETCH_EVENTS_ACTION = 'calendarFetchEvents'
export const CALENDAR_EVENT_DROP_ACTION = 'calendarEventDrop'
export const CALENDAR_EVENT_RESIZE_ACTION = 'calendarEventResize'

/** Dates go to the server under this argument: `{ calendar: { start, end, allDay } }`. */
export const CALENDAR_ARGUMENTS_KEY = 'calendar'

/** The registry key of the calendar widget component. */
export const CALENDAR_REGISTRY_KEY = 'widget:calendar'

/** A UTC-mode FullCalendar date as the wall-time string the server reads. */
export function calendarWallTime(
  date: Date | null | undefined,
  allDay = false,
): string | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined
  }

  const iso = date.toISOString()

  return allDay ? iso.slice(0, 10) : iso.slice(0, 19)
}

/** The subset of FullCalendar's event API the callbacks use. */
export interface CalendarEventApi {
  id: string
  start: Date | null
  end: Date | null
  allDay: boolean
  url: string
  extendedProps: Record<string, unknown>
}

export interface CalendarEventChangeInfo {
  event: CalendarEventApi
  oldEvent: CalendarEventApi
  revert(): void
}

export interface CalendarEventClickInfo {
  event: CalendarEventApi
  jsEvent: { preventDefault(): void }
}

export interface CalendarSelectInfo {
  start: Date
  end: Date
  allDay: boolean
  view: { calendar: { unselect(): void } }
}

export interface CalendarFetchInfo {
  start: Date
  end: Date
}

/** What the options need from the renderer. */
export interface CalendarEnvironment {
  runner: Pick<ActionRunner, 'trigger' | 'executeJson'>
  /** The page context token. */
  token: string
  t: Translator['t']
  /** The panel's BCP 47 locale (the widget's own `locale` wins). */
  locale: string
  direction: 'ltr' | 'rtl'
  /** The panel's first day of the week (the widget's own `firstDay` wins). */
  firstDayOfWeek: number
  /** Visit an event's URL (Inertia for internal links). */
  visit(url: string, newTab: boolean): void
  /** Show notifications sent by the server during a change. */
  notify(notifications: NotificationSchema[]): void
  /** Show a failure (a toast). */
  error(message: string): void
}

const VIEW_LABELS: Record<string, [key: string, fallback: string]> = {
  dayGridMonth: ['calendar.month', 'Month'],
  dayGridWeek: ['calendar.week', 'Week'],
  dayGridDay: ['calendar.day', 'Day'],
  timeGridWeek: ['calendar.week', 'Week'],
  timeGridDay: ['calendar.day', 'Day'],
  listDay: ['calendar.list', 'List'],
  listWeek: ['calendar.list', 'List'],
  listMonth: ['calendar.list', 'List'],
  listYear: ['calendar.list', 'List'],
}

/** The action context of a calendar widget's actions. */
export function calendarActionContext(
  widget: Pick<CalendarWidgetSchema, 'id'>,
  token: string,
  extra: Partial<ActionContext> = {},
): ActionContext {
  return { token, component: `widget:${widget.id}`, ...extra }
}

function jsonAction(name: string): ActionSchema {
  return { type: 'Action', name, hasAction: true }
}

/**
 * The FullCalendar options of a calendar widget: the server's `config` first, then the
 * options the widget controls (views, locale, direction, first day, translated buttons)
 * and the callbacks that fetch events and run the widget's actions.
 */
export function calendarOptions(
  widget: CalendarWidgetSchema,
  env: CalendarEnvironment,
): Record<string, unknown> {
  const t = env.t
  const views = widget.views.length > 0 ? widget.views : ['dayGridMonth']
  const buttonText: Record<string, string> = {
    today: t('calendar.today', {}, 'Today'),
    month: t('calendar.month', {}, 'Month'),
    week: t('calendar.week', {}, 'Week'),
    day: t('calendar.day', {}, 'Day'),
    list: t('calendar.list', {}, 'List'),
  }

  for (const view of views) {
    const label = VIEW_LABELS[view]

    if (label) {
      buttonText[view] = t(label[0], {}, label[1])
    }
  }

  const change =
    (action: string) =>
    async (info: CalendarEventChangeInfo): Promise<void> => {
      const { event, oldEvent } = info

      try {
        const result = await env.runner.executeJson<CalendarChangeResult>(
          jsonAction(action),
          calendarActionContext(widget, env.token, {
            record: event.id || undefined,
            arguments: {
              [CALENDAR_ARGUMENTS_KEY]: {
                start: calendarWallTime(event.start, event.allDay),
                end: calendarWallTime(event.end, event.allDay),
                allDay: event.allDay,
                oldStart: calendarWallTime(oldEvent.start, oldEvent.allDay),
                oldEnd: calendarWallTime(oldEvent.end, oldEvent.allDay),
                oldAllDay: oldEvent.allDay,
              },
            },
          }),
        )

        env.notify(result?.notifications ?? [])

        if (!result?.ok) {
          info.revert()
        }
      } catch {
        info.revert()
        env.error(t('calendar.move_failed', {}, 'The change could not be saved.'))
      }
    }

  return {
    ...(widget.config ?? {}),
    initialView: widget.initialView ?? views[0],
    timeZone: 'UTC',
    locale: widget.locale ?? env.locale,
    direction: env.direction,
    firstDay: widget.firstDay ?? env.firstDayOfWeek,
    editable: Boolean(widget.editable),
    selectable: Boolean(widget.selectable),
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: views.length > 1 ? views.join(',') : '',
    },
    buttonText,
    buttonHints: {
      prev: t('calendar.previous', {}, 'Previous'),
      next: t('calendar.next', {}, 'Next'),
      today: t('calendar.today', {}, 'Today'),
    },
    allDayText: t('calendar.all_day', {}, 'All day'),
    noEventsText: t('calendar.no_events', {}, 'No events to display'),
    moreLinkText: (count: number) => t('calendar.more_events', { count }, '+:count more'),
    // FullCalendar's own accessible texts (its English defaults otherwise: no FullCalendar
    // locale is loaded; dates still follow `locale` through Intl).
    viewHint: (buttonText: string) => t('calendar.view_hint', { view: buttonText }, ':view view'),
    navLinkHint: (date: string) => t('calendar.go_to_date', { date }, 'Go to :date'),
    moreLinkHint: (count: number) =>
      t('calendar.more_events_hint', { count }, 'Show :count more events'),
    closeHint: t('close', {}, 'Close'),
    timeHint: t('calendar.time', {}, 'Time'),
    eventHint: t('calendar.event', {}, 'Event'),
    weekText: t('calendar.week_number_short', {}, 'W'),
    weekTextLong: t('calendar.week', {}, 'Week'),
    events: (
      info: CalendarFetchInfo,
      success: (events: CalendarEventSchema[]) => void,
      failure: (error: Error) => void,
    ) => {
      env.runner
        .executeJson<{ events?: CalendarEventSchema[] }>(
          jsonAction(CALENDAR_FETCH_EVENTS_ACTION),
          calendarActionContext(widget, env.token, {
            arguments: {
              [CALENDAR_ARGUMENTS_KEY]: {
                start: calendarWallTime(info.start),
                end: calendarWallTime(info.end),
              },
            },
          }),
        )
        .then((result) => success(result?.events ?? []))
        .catch((error: unknown) => {
          failure(error instanceof Error ? error : new Error(String(error)))
          env.error(t('calendar.load_failed', {}, 'The events could not be loaded.'))
        })
    },
    eventClick: (info: CalendarEventClickInfo) => {
      const { event } = info

      if (event.url) {
        info.jsEvent.preventDefault()
        env.visit(event.url, event.extendedProps.openUrlInNewTab === true)

        return
      }

      if (widget.eventClickAction && event.id) {
        info.jsEvent.preventDefault()
        void env.runner.trigger(
          widget.eventClickAction,
          calendarActionContext(widget, env.token, { record: event.id }),
        )
      }
    },
    select: (info: CalendarSelectInfo) => {
      info.view.calendar.unselect()

      if (!widget.dateSelectAction) {
        return
      }

      void env.runner.trigger(
        widget.dateSelectAction,
        calendarActionContext(widget, env.token, {
          arguments: {
            [CALENDAR_ARGUMENTS_KEY]: {
              start: calendarWallTime(info.start, info.allDay),
              end: calendarWallTime(info.end, info.allDay),
              allDay: info.allDay,
            },
          },
        }),
      )
    },
    eventDrop: change(CALENDAR_EVENT_DROP_ACTION),
    eventResize: change(CALENDAR_EVENT_RESIZE_ACTION),
  }
}

/**
 * A key that changes when the calendar has to be created again (views, locale, direction,
 * interactions or extra options changed); other schema updates only refetch the events.
 */
export function calendarIdentity(
  widget: CalendarWidgetSchema,
  env: Pick<CalendarEnvironment, 'locale' | 'direction' | 'firstDayOfWeek'>,
): string {
  return JSON.stringify([
    widget.id,
    widget.views,
    widget.initialView,
    widget.locale ?? env.locale,
    widget.firstDay ?? env.firstDayOfWeek,
    env.direction,
    Boolean(widget.editable),
    Boolean(widget.selectable),
    widget.eventClickAction?.name ?? null,
    widget.dateSelectAction?.name ?? null,
    widget.config ?? null,
  ])
}

/** A client-side toast for a failed calendar or tree request. */
export function clientErrorNotification(id: string, title: string): NotificationSchema {
  return { id: `alfakit-${id}`, title, status: 'danger', format: 'alfakit' }
}
