import { describe, expect, it, vi } from 'vitest'
import {
  CALENDAR_EVENT_DROP_ACTION,
  CALENDAR_FETCH_EVENTS_ACTION,
  calendarIdentity,
  calendarOptions,
  calendarWallTime,
  type CalendarEnvironment,
} from '../src/calendar'
import type { CalendarWidgetSchema } from '../src/schema/calendar'

const widget: CalendarWidgetSchema = {
  type: 'Calendar',
  key: 'meetings',
  id: 'meetings',
  component: 'widget:calendar',
  columnSpan: { default: 'full' },
  views: ['dayGridMonth', 'timeGridWeek', 'listWeek'],
  initialView: 'dayGridMonth',
  timezone: 'Asia/Bahrain',
  editable: true,
  selectable: true,
  config: { dayMaxEvents: true, locale: 'ignored-by-widget' },
  eventClickAction: { type: 'Action', name: 'view', hasModal: true },
  dateSelectAction: { type: 'Action', name: 'create', hasModal: true },
}

function environment(result: unknown = { events: [] }) {
  const env = {
    runner: { trigger: vi.fn(async () => {}), executeJson: vi.fn(async () => result) },
    token: 'tok',
    t: (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
      (fallback ?? key).replace(/:(\w+)/g, (_, name: string) => String(replacements[name] ?? '')),
    locale: 'ar',
    direction: 'rtl' as const,
    firstDayOfWeek: 6,
    visit: vi.fn(),
    notify: vi.fn(),
    error: vi.fn(),
  } satisfies CalendarEnvironment

  return env
}

type Options = Record<string, (...args: never[]) => unknown> & Record<string, unknown>

describe('calendarWallTime', () => {
  it('writes UTC-mode dates as wall time', () => {
    expect(calendarWallTime(new Date('2026-10-13T09:30:00Z'))).toBe('2026-10-13T09:30:00')
    expect(calendarWallTime(new Date('2026-10-13T00:00:00Z'), true)).toBe('2026-10-13')
    expect(calendarWallTime(null)).toBeUndefined()
  })
})

describe('calendarOptions', () => {
  it('follows the panel locale, direction and first day and translates the toolbar', () => {
    const options = calendarOptions(widget, environment())

    expect(options).toMatchObject({
      timeZone: 'UTC',
      locale: 'ar',
      direction: 'rtl',
      firstDay: 6,
      editable: true,
      selectable: true,
      dayMaxEvents: true,
      initialView: 'dayGridMonth',
      headerToolbar: { end: 'dayGridMonth,timeGridWeek,listWeek' },
    })
    expect((options.buttonText as Record<string, string>).listWeek).toBe('List')
    expect((options.moreLinkText as (count: number) => string)(3)).toBe('+3 more')
  })

  it('translates the hints FullCalendar would otherwise show in English', () => {
    const t = (key: string, replacements: Record<string, string | number> = {}) =>
      `${key}${Object.keys(replacements).length ? JSON.stringify(replacements) : ''}`
    const options = calendarOptions(widget, { ...environment(), t })

    expect((options.viewHint as (text: string) => string)('Week')).toBe(
      'calendar.view_hint{"view":"Week"}',
    )
    expect((options.navLinkHint as (date: string) => string)('13 Oct')).toBe(
      'calendar.go_to_date{"date":"13 Oct"}',
    )
    expect((options.moreLinkHint as (count: number) => string)(2)).toBe(
      'calendar.more_events_hint{"count":2}',
    )
    expect(options).toMatchObject({
      closeHint: 'close',
      timeHint: 'calendar.time',
      eventHint: 'calendar.event',
      weekText: 'calendar.week_number_short',
      weekTextLong: 'calendar.week',
      buttonHints: { prev: 'calendar.previous', next: 'calendar.next', today: 'calendar.today' },
    })
  })

  it('fetches the visible range through the widget action', async () => {
    const env = environment({ events: [{ id: '1', title: 'Standup' }] })
    const options = calendarOptions(widget, env) as Options
    const success = vi.fn()

    ;(options.events as (...args: unknown[]) => void)(
      { start: new Date('2026-10-01T00:00:00Z'), end: new Date('2026-11-01T00:00:00Z') },
      success,
      vi.fn(),
    )

    await vi.waitFor(() => expect(success).toHaveBeenCalledWith([{ id: '1', title: 'Standup' }]))
    expect(env.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: CALENDAR_FETCH_EVENTS_ACTION }),
      {
        token: 'tok',
        component: 'widget:meetings',
        arguments: { calendar: { start: '2026-10-01T00:00:00', end: '2026-11-01T00:00:00' } },
      },
    )
  })

  it('opens the event click action with the event record and visits event URLs', () => {
    const env = environment()
    const options = calendarOptions(widget, env) as Options
    const preventDefault = vi.fn()
    const click = options.eventClick as (info: unknown) => void

    click({ event: { id: '5', url: '', extendedProps: {} }, jsEvent: { preventDefault } })
    click({
      event: { id: '6', url: '/admin/x', extendedProps: { openUrlInNewTab: true } },
      jsEvent: { preventDefault },
    })

    expect(env.runner.trigger).toHaveBeenCalledWith(widget.eventClickAction, {
      token: 'tok',
      component: 'widget:meetings',
      record: '5',
    })
    expect(env.visit).toHaveBeenCalledWith('/admin/x', true)
    expect(preventDefault).toHaveBeenCalledTimes(2)
  })

  it('opens the date select action with the selected range', () => {
    const env = environment()
    const unselect = vi.fn()

    ;(calendarOptions(widget, env).select as (info: unknown) => void)({
      start: new Date('2026-10-20T00:00:00Z'),
      end: new Date('2026-10-22T00:00:00Z'),
      allDay: true,
      view: { calendar: { unselect } },
    })

    expect(unselect).toHaveBeenCalled()
    expect(env.runner.trigger).toHaveBeenCalledWith(widget.dateSelectAction, {
      token: 'tok',
      component: 'widget:meetings',
      arguments: { calendar: { start: '2026-10-20', end: '2026-10-22', allDay: true } },
    })
  })

  it('reverts a drop the server refuses or fails', async () => {
    const event = (start: string) => ({
      id: '5',
      start: new Date(start),
      end: null,
      allDay: false,
      url: '',
      extendedProps: {},
    })
    const info = {
      event: event('2026-10-15T10:00:00Z'),
      oldEvent: event('2026-10-13T09:00:00Z'),
      revert: vi.fn(),
    }

    const refused = environment({ ok: false, notifications: [{ id: 'n', format: 'alfakit' }] })
    await (calendarOptions(widget, refused).eventDrop as (info: unknown) => Promise<void>)(info)

    expect(refused.runner.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: CALENDAR_EVENT_DROP_ACTION }),
      expect.objectContaining({
        record: '5',
        arguments: {
          calendar: expect.objectContaining({
            start: '2026-10-15T10:00:00',
            oldStart: '2026-10-13T09:00:00',
          }),
        },
      }),
    )
    expect(refused.notify).toHaveBeenCalledWith([{ id: 'n', format: 'alfakit' }])
    expect(info.revert).toHaveBeenCalledTimes(1)

    const failing = environment()
    failing.runner.executeJson.mockRejectedValueOnce(new Error('403'))
    await (calendarOptions(widget, failing).eventResize as (info: unknown) => Promise<void>)(info)

    expect(info.revert).toHaveBeenCalledTimes(2)
    expect(failing.error).toHaveBeenCalledWith('The change could not be saved.')

    const saved = environment({ ok: true })
    await (calendarOptions(widget, saved).eventDrop as (info: unknown) => Promise<void>)(info)

    expect(info.revert).toHaveBeenCalledTimes(2)
  })

  it('changes identity only for options that need a new calendar', () => {
    const env = environment()

    expect(calendarIdentity({ ...widget, heading: 'Other' }, env)).toBe(
      calendarIdentity(widget, env),
    )
    expect(calendarIdentity({ ...widget, views: ['listWeek'] }, env)).not.toBe(
      calendarIdentity(widget, env),
    )
  })
})
