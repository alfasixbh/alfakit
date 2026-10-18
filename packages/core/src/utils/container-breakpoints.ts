import type { Breakpoints, ColumnSpanValue, ContainerBreakpoint } from '../schema/common'

/**
 * Container-query variants of the grid classes: a `columns` map with `@md`-style keys
 * follows the width of the surrounding `@container` instead of the viewport. Classes are
 * spelled out in full so Tailwind's scanner (and `@source inline`) can see them.
 */
export const CONTAINER_BREAKPOINTS: readonly ContainerBreakpoint[] = [
  '@3xs',
  '@2xs',
  '@xs',
  '@sm',
  '@md',
  '@lg',
  '@xl',
  '@2xl',
  '@3xl',
  '@4xl',
  '@5xl',
  '@6xl',
  '@7xl',
]

const SPANS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

function table(prefix: string, values: readonly (number | string)[]): Record<string, string> {
  return Object.fromEntries(values.map((value) => [String(value), `${prefix}${value}`]))
}

const CONTAINER_GRID_COLS: Record<string, Record<string, string>> = Object.fromEntries(
  CONTAINER_BREAKPOINTS.map((breakpoint) => [breakpoint, table(`${breakpoint}:grid-cols-`, SPANS)]),
)

const CONTAINER_COL_SPAN: Record<string, Record<string, string>> = Object.fromEntries(
  CONTAINER_BREAKPOINTS.map((breakpoint) => [
    breakpoint,
    table(`${breakpoint}:col-span-`, [...SPANS, 'full']),
  ]),
)

/** Whether a responsive map uses container sizes (`@md`) and so needs an `@container` parent. */
export function hasContainerBreakpoints(map: Breakpoints<unknown> | undefined | null): boolean {
  return !!map && Object.keys(map).some((key) => key.startsWith('@'))
}

/** `@md:grid-cols-3`-style classes for the container keys of a `columns` map. */
export function containerGridColumnsClasses(columns: Breakpoints | undefined): string {
  if (!columns) return ''

  return CONTAINER_BREAKPOINTS.map((breakpoint) => {
    const value = columns[breakpoint]

    return value ? CONTAINER_GRID_COLS[breakpoint]?.[String(value)] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

/** `@md:col-span-2`-style classes for the container keys of a `columnSpan` map. */
export function containerColumnSpanClasses(span: Breakpoints<ColumnSpanValue> | undefined): string {
  if (!span) return ''

  return CONTAINER_BREAKPOINTS.map((breakpoint) => {
    const value = span[breakpoint]

    return value ? CONTAINER_COL_SPAN[breakpoint]?.[String(value)] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

const FLEX_ROW: Record<string, string> = {
  default: 'flex-row',
  sm: 'sm:flex-row',
  md: 'md:flex-row',
  lg: 'lg:flex-row',
  xl: 'xl:flex-row',
  '2xl': '2xl:flex-row',
}

/** `Flex::alignment()`: main-axis alignment (logical, so `start` follows the direction). */
const FLEX_JUSTIFY: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  justify: 'justify-between',
}

const FLEX_ALIGN: Record<string, Record<string, string>> = {
  start: {
    default: 'items-start',
    sm: 'sm:items-start',
    md: 'md:items-start',
    lg: 'lg:items-start',
    xl: 'xl:items-start',
    '2xl': '2xl:items-start',
  },
  center: {
    default: 'items-center',
    sm: 'sm:items-center',
    md: 'md:items-center',
    lg: 'lg:items-center',
    xl: 'xl:items-center',
    '2xl': '2xl:items-center',
  },
  end: {
    default: 'items-end',
    sm: 'sm:items-end',
    md: 'md:items-end',
    lg: 'lg:items-end',
    xl: 'xl:items-end',
    '2xl': '2xl:items-end',
  },
}

/**
 * Classes for a `Flex` schema component: stacked, then a row (and the vertical alignment)
 * from its `from` breakpoint. Force-generated with `@source inline(...)` in each renderer.
 */
export function flexLayoutClasses(flex: {
  from?: string | null
  verticalAlignment?: string | null
  alignment?: string | null
}): string {
  const from = flex.from ?? 'default'
  const align = flex.verticalAlignment ? FLEX_ALIGN[flex.verticalAlignment]?.[from] : undefined
  const justify = flex.alignment ? FLEX_JUSTIFY[flex.alignment] : undefined

  return ['flex flex-col gap-6', FLEX_ROW[from] ?? 'flex-row', align, justify]
    .filter(Boolean)
    .join(' ')
}

/** Width behaviour of a child inside a `Flex`: share the row, or keep its natural width. */
export function flexItemClasses(component: { grow?: boolean }): string {
  return component.grow === false ? 'min-w-0 shrink-0' : 'min-w-0 flex-1'
}
