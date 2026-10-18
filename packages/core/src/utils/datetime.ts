/**
 * The current wall-clock time in `timeZone` as a local `Date` (its getters return that
 * zone's year, month, day, hours…). Date fields hold values already shifted into their
 * display timezone by the server, so "today" and "now" must be read in the same zone.
 */
export function wallClockNow(timeZone?: string | null, now: Date = new Date()): Date {
  if (!timeZone) {
    return now
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(now)
    const part = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((item) => item.type === type)?.value ?? 0)

    return new Date(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second'),
    )
  } catch {
    return now
  }
}
