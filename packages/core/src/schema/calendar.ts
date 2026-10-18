import type { ActionSchema, AnyActionSchema } from './actions'
import type { NotificationSchema } from './notifications'
import type { BaseWidgetSchema } from './widgets'

/**
 * A FullCalendar view a calendar widget may offer (`CalendarWidget::getViews()`).
 */
export type CalendarView =
  | 'dayGridMonth'
  | 'dayGridWeek'
  | 'dayGridDay'
  | 'timeGridWeek'
  | 'timeGridDay'
  | 'listDay'
  | 'listWeek'
  | 'listMonth'
  | 'listYear'

/**
 * `CalendarWidget` (alfasix/alfakit-calendar), rendered by the `widget:calendar` registry
 * component. Events are not part of the schema: the renderer fetches them for the visible
 * range through the widget's `calendarFetchEvents` action.
 */
export interface CalendarWidgetSchema extends BaseWidgetSchema {
  type: 'Calendar'
  component: 'widget:calendar' | (string & {})
  heading?: string
  views: CalendarView[]
  initialView: CalendarView
  /** BCP 47 locale; absent follows the panel's locale. */
  locale?: string
  /** 0 = Sunday … 6 = Saturday; absent follows the panel. */
  firstDay?: number
  /** IANA timezone the events' wall times are in (for display only). */
  timezone: string
  /** Events can be dragged and resized (`onEventDrop()` / `onEventResize()`). */
  editable?: boolean
  /** A date range can be selected; it opens `dateSelectAction`. */
  selectable?: boolean
  /** Extra FullCalendar options (JSON values only, sanitised by the server). */
  config?: Record<string, unknown>
  headerActions?: AnyActionSchema[]
  /** Opened for an event without a URL, with the event id as the record. */
  eventClickAction?: ActionSchema
  /** Opened for a selected range, with `{ calendar: { start, end, allDay } }` arguments. */
  dateSelectAction?: ActionSchema
}

/** One event as `calendarFetchEvents` returns it (a FullCalendar event object). */
export interface CalendarEventSchema {
  id?: string
  title: string
  /** Wall time in the calendar's timezone (`2026-10-13T09:30:00`) or a date. */
  start?: string
  end?: string
  allDay?: boolean
  url?: string
  openUrlInNewTab?: boolean
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  editable?: boolean
  groupId?: string
  classNames?: string[]
  extendedProps?: Record<string, unknown>
}

/** The answer of the drop and resize actions. */
export interface CalendarChangeResult {
  ok: boolean
  notifications?: NotificationSchema[]
}
