import type { Breakpoints, ColumnSpanValue } from '../schema/common'

const ORDER = ['default', 'sm', 'md', 'lg', 'xl', '2xl'] as const

const GRID_COLS: Record<string, Record<number, string>> = {
  default: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  },
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    7: 'sm:grid-cols-7',
    8: 'sm:grid-cols-8',
    9: 'sm:grid-cols-9',
    10: 'sm:grid-cols-10',
    11: 'sm:grid-cols-11',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
    9: 'md:grid-cols-9',
    10: 'md:grid-cols-10',
    11: 'md:grid-cols-11',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    7: 'xl:grid-cols-7',
    8: 'xl:grid-cols-8',
    9: 'xl:grid-cols-9',
    10: 'xl:grid-cols-10',
    11: 'xl:grid-cols-11',
    12: 'xl:grid-cols-12',
  },
  '2xl': {
    1: '2xl:grid-cols-1',
    2: '2xl:grid-cols-2',
    3: '2xl:grid-cols-3',
    4: '2xl:grid-cols-4',
    5: '2xl:grid-cols-5',
    6: '2xl:grid-cols-6',
    7: '2xl:grid-cols-7',
    8: '2xl:grid-cols-8',
    9: '2xl:grid-cols-9',
    10: '2xl:grid-cols-10',
    11: '2xl:grid-cols-11',
    12: '2xl:grid-cols-12',
  },
}

const COL_SPAN: Record<string, Record<string, string>> = {
  default: {
    full: 'col-span-full',
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  },
  sm: {
    full: 'sm:col-span-full',
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
    5: 'sm:col-span-5',
    6: 'sm:col-span-6',
    7: 'sm:col-span-7',
    8: 'sm:col-span-8',
    9: 'sm:col-span-9',
    10: 'sm:col-span-10',
    11: 'sm:col-span-11',
    12: 'sm:col-span-12',
  },
  md: {
    full: 'md:col-span-full',
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
    7: 'md:col-span-7',
    8: 'md:col-span-8',
    9: 'md:col-span-9',
    10: 'md:col-span-10',
    11: 'md:col-span-11',
    12: 'md:col-span-12',
  },
  lg: {
    full: 'lg:col-span-full',
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
    12: 'lg:col-span-12',
  },
  xl: {
    full: 'xl:col-span-full',
    1: 'xl:col-span-1',
    2: 'xl:col-span-2',
    3: 'xl:col-span-3',
    4: 'xl:col-span-4',
    5: 'xl:col-span-5',
    6: 'xl:col-span-6',
    7: 'xl:col-span-7',
    8: 'xl:col-span-8',
    9: 'xl:col-span-9',
    10: 'xl:col-span-10',
    11: 'xl:col-span-11',
    12: 'xl:col-span-12',
  },
  '2xl': {
    full: '2xl:col-span-full',
    1: '2xl:col-span-1',
    2: '2xl:col-span-2',
    3: '2xl:col-span-3',
    4: '2xl:col-span-4',
    5: '2xl:col-span-5',
    6: '2xl:col-span-6',
    7: '2xl:col-span-7',
    8: '2xl:col-span-8',
    9: '2xl:col-span-9',
    10: '2xl:col-span-10',
    11: '2xl:col-span-11',
    12: '2xl:col-span-12',
  },
}

const COL_START: Record<string, Record<string, string>> = {
  default: {
    1: 'col-start-1',
    2: 'col-start-2',
    3: 'col-start-3',
    4: 'col-start-4',
    5: 'col-start-5',
    6: 'col-start-6',
    7: 'col-start-7',
    8: 'col-start-8',
    9: 'col-start-9',
    10: 'col-start-10',
    11: 'col-start-11',
    12: 'col-start-12',
  },
  sm: {
    1: 'sm:col-start-1',
    2: 'sm:col-start-2',
    3: 'sm:col-start-3',
    4: 'sm:col-start-4',
    5: 'sm:col-start-5',
    6: 'sm:col-start-6',
    7: 'sm:col-start-7',
    8: 'sm:col-start-8',
    9: 'sm:col-start-9',
    10: 'sm:col-start-10',
    11: 'sm:col-start-11',
    12: 'sm:col-start-12',
  },
  md: {
    1: 'md:col-start-1',
    2: 'md:col-start-2',
    3: 'md:col-start-3',
    4: 'md:col-start-4',
    5: 'md:col-start-5',
    6: 'md:col-start-6',
    7: 'md:col-start-7',
    8: 'md:col-start-8',
    9: 'md:col-start-9',
    10: 'md:col-start-10',
    11: 'md:col-start-11',
    12: 'md:col-start-12',
  },
  lg: {
    1: 'lg:col-start-1',
    2: 'lg:col-start-2',
    3: 'lg:col-start-3',
    4: 'lg:col-start-4',
    5: 'lg:col-start-5',
    6: 'lg:col-start-6',
    7: 'lg:col-start-7',
    8: 'lg:col-start-8',
    9: 'lg:col-start-9',
    10: 'lg:col-start-10',
    11: 'lg:col-start-11',
    12: 'lg:col-start-12',
  },
  xl: {
    1: 'xl:col-start-1',
    2: 'xl:col-start-2',
    3: 'xl:col-start-3',
    4: 'xl:col-start-4',
    5: 'xl:col-start-5',
    6: 'xl:col-start-6',
    7: 'xl:col-start-7',
    8: 'xl:col-start-8',
    9: 'xl:col-start-9',
    10: 'xl:col-start-10',
    11: 'xl:col-start-11',
    12: 'xl:col-start-12',
  },
  '2xl': {
    1: '2xl:col-start-1',
    2: '2xl:col-start-2',
    3: '2xl:col-start-3',
    4: '2xl:col-start-4',
    5: '2xl:col-start-5',
    6: '2xl:col-start-6',
    7: '2xl:col-start-7',
    8: '2xl:col-start-8',
    9: '2xl:col-start-9',
    10: '2xl:col-start-10',
    11: '2xl:col-start-11',
    12: '2xl:col-start-12',
  },
}

/**
 * Tailwind classes for a responsive `columns` map. Classes are spelled out in full so
 * Tailwind's scanner can see them.
 */
export function gridColumnsClasses(columns: Breakpoints | undefined): string {
  if (!columns) {
    return 'grid-cols-1'
  }

  return ORDER.map((breakpoint) => {
    const value = columns[breakpoint]

    return value ? GRID_COLS[breakpoint]?.[value] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

export function columnSpanClasses(span: Breakpoints<ColumnSpanValue> | undefined): string {
  if (!span) {
    return ''
  }

  return ORDER.map((breakpoint) => {
    const value = span[breakpoint]

    return value ? COL_SPAN[breakpoint]?.[String(value)] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

/** Tailwind `col-start-*` classes for a responsive `columnStart` map. */
export function columnStartClasses(start: Breakpoints<number | string | null> | undefined): string {
  if (!start) {
    return ''
  }

  return ORDER.map((breakpoint) => {
    const value = start[breakpoint]

    return value ? COL_START[breakpoint]?.[String(value)] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

/** The maximum column count across breakpoints, for CSS-variable based layouts. */
export function maxColumns(columns: Breakpoints | undefined): number {
  if (!columns) {
    return 1
  }

  return Math.max(1, ...Object.values(columns).map((value) => value ?? 1))
}
