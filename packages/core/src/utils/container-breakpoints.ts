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

/**
 * `contentGrid()` breakpoints, read against the width of the table rather than the
 * viewport: the table sits beside the panel sidebar (and a cluster's sub-navigation), so a
 * viewport breakpoint says little about the room the cards have. Each viewport key maps to
 * the largest container size at or below that viewport minus 24rem (a 16rem sidebar plus
 * the page's gutters): `md` 48rem → `@sm` 24rem, `xl` 80rem → `@4xl` 56rem.
 */
const CONTENT_GRID_FROM: Record<string, ContainerBreakpoint | null> = {
  default: null,
  sm: '@3xs',
  md: '@sm',
  lg: '@xl',
  xl: '@4xl',
  '2xl': '@6xl',
}

/**
 * The smallest container size that keeps `n` cards at least 15rem wide, with the grid's
 * `p-4` and `gap-4`: 16rem per column plus 1rem. Five or more columns need `@7xl` (80rem).
 */
const CONTENT_GRID_MIN: Record<number, ContainerBreakpoint | null> = {
  1: null,
  2: '@xl', // 33rem → 36rem
  3: '@4xl', // 49rem → 56rem
  4: '@6xl', // 65rem → 72rem
}

const CONTENT_GRID_KEYS = ['default', 'sm', 'md', 'lg', 'xl', '2xl'] as const

function widerBreakpoint(
  a: ContainerBreakpoint | null,
  b: ContainerBreakpoint | null,
): ContainerBreakpoint | null {
  if (!a) return b
  if (!b) return a

  return CONTAINER_BREAKPOINTS.indexOf(a) >= CONTAINER_BREAKPOINTS.indexOf(b) ? a : b
}

/**
 * Classes for a table's `contentGrid()`: one column, then `@…:grid-cols-N` container-query
 * classes relative to the `@container` around the card grid. A column count applies from
 * the wider of its key's size (`CONTENT_GRID_FROM`) and the size that fits that many cards
 * (`CONTENT_GRID_MIN`), so cards get fewer columns instead of getting narrow. Container
 * keys (`'@lg' => 2`) are used as given; when two keys land on the same size, the later
 * (wider) key wins.
 */
export function contentGridClasses(grid: Breakpoints | undefined | null): string {
  const classes = new Map<ContainerBreakpoint, string>()

  for (const key of CONTENT_GRID_KEYS) {
    const value = grid?.[key]

    if (!value) continue

    const count = Math.min(Math.max(Math.trunc(value), 1), 12)
    const at = widerBreakpoint(CONTENT_GRID_FROM[key] ?? null, CONTENT_GRID_MIN[count] ?? '@7xl')
    const cls = at ? CONTAINER_GRID_COLS[at]?.[String(count)] : undefined

    if (at && cls) classes.set(at, cls)
  }

  for (const breakpoint of CONTAINER_BREAKPOINTS) {
    const cls = CONTAINER_GRID_COLS[breakpoint]?.[String(grid?.[breakpoint] ?? '')]

    if (cls) classes.set(breakpoint, cls)
  }

  return [
    'grid-cols-1',
    ...CONTAINER_BREAKPOINTS.map((breakpoint) => classes.get(breakpoint)).filter(Boolean),
  ].join(' ')
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
