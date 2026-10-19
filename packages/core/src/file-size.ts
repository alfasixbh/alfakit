import type { LocaleFormatter } from './i18n'

const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/** A human file size (`1.4 MB`) in the formatter's locale. Kept apart from file-manager.ts so pickers don't pull the whole controller. */
export function fileManagerSize(
  bytes: number | null | undefined,
  formatter: Pick<LocaleFormatter, 'number'>,
): string {
  let value = typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  let unit = 0

  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit++
  }

  return formatter.number(value, {
    style: 'unit',
    unit: SIZE_UNITS[unit],
    // Bytes have no short form in most locales ("11 byte"): the long one is pluralised.
    unitDisplay: unit === 0 ? 'long' : 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  })
}
