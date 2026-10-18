import type { Breakpoints } from './schema/common'
import type { BaseComponent, SchemaComponentContext } from './schema/components'
import { getPath } from './utils/path'

const BREAKPOINTS = ['default', 'sm', 'md', 'lg', 'xl', '2xl'] as const

/** Spelled out in full so Tailwind's scanner (or an `@source inline`) can see them. */
const ORDER_CLASSES: Record<string, Record<string, string>> = {
  default: {
    1: 'order-1',
    2: 'order-2',
    3: 'order-3',
    4: 'order-4',
    5: 'order-5',
    6: 'order-6',
    7: 'order-7',
    8: 'order-8',
    9: 'order-9',
    10: 'order-10',
    11: 'order-11',
    12: 'order-12',
  },
  sm: {
    1: 'sm:order-1',
    2: 'sm:order-2',
    3: 'sm:order-3',
    4: 'sm:order-4',
    5: 'sm:order-5',
    6: 'sm:order-6',
    7: 'sm:order-7',
    8: 'sm:order-8',
    9: 'sm:order-9',
    10: 'sm:order-10',
    11: 'sm:order-11',
    12: 'sm:order-12',
  },
  md: {
    1: 'md:order-1',
    2: 'md:order-2',
    3: 'md:order-3',
    4: 'md:order-4',
    5: 'md:order-5',
    6: 'md:order-6',
    7: 'md:order-7',
    8: 'md:order-8',
    9: 'md:order-9',
    10: 'md:order-10',
    11: 'md:order-11',
    12: 'md:order-12',
  },
  lg: {
    1: 'lg:order-1',
    2: 'lg:order-2',
    3: 'lg:order-3',
    4: 'lg:order-4',
    5: 'lg:order-5',
    6: 'lg:order-6',
    7: 'lg:order-7',
    8: 'lg:order-8',
    9: 'lg:order-9',
    10: 'lg:order-10',
    11: 'lg:order-11',
    12: 'lg:order-12',
  },
  xl: {
    1: 'xl:order-1',
    2: 'xl:order-2',
    3: 'xl:order-3',
    4: 'xl:order-4',
    5: 'xl:order-5',
    6: 'xl:order-6',
    7: 'xl:order-7',
    8: 'xl:order-8',
    9: 'xl:order-9',
    10: 'xl:order-10',
    11: 'xl:order-11',
    12: 'xl:order-12',
  },
  '2xl': {
    1: '2xl:order-1',
    2: '2xl:order-2',
    3: '2xl:order-3',
    4: '2xl:order-4',
    5: '2xl:order-5',
    6: '2xl:order-6',
    7: '2xl:order-7',
    8: '2xl:order-8',
    9: '2xl:order-9',
    10: '2xl:order-10',
    11: '2xl:order-11',
    12: '2xl:order-12',
  },
}

/** Tailwind `order-*` classes for a component's `columnOrder` (1–12 per breakpoint). */
export function columnOrderClasses(order: Breakpoints<number | null> | undefined): string {
  if (!order) {
    return ''
  }

  return BREAKPOINTS.map((breakpoint) => {
    const value = order[breakpoint]

    return value ? ORDER_CLASSES[breakpoint]?.[String(value)] : undefined
  })
    .filter(Boolean)
    .join(' ')
}

/**
 * The gap class of a layout component's child grid: `dense()` halves the default
 * `gap-6`, `gap(false)` removes it. Empty for the default gap.
 */
export function schemaGapClass(component: Pick<BaseComponent, 'dense' | 'gap'>): string {
  if (component.gap === false) {
    return 'gap-0'
  }

  return component.dense ? 'gap-3' : ''
}

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

/** `h1`…`h6` for a heading level; `fallback` when the server sent none. */
export function headingTag(level: number | undefined, fallback: HeadingTag = 'h3'): HeadingTag {
  if (!level || !Number.isFinite(level)) {
    return fallback
  }

  return `h${Math.min(6, Math.max(1, Math.round(level)))}` as HeadingTag
}

export type PersistStorage = 'local' | 'session'

function browserStorage(storage: PersistStorage): Storage | null {
  try {
    if (typeof window === 'undefined') {
      return null
    }

    return storage === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    // Blocked storage (privacy mode, sandboxed iframes) behaves as empty.
    return null
  }
}

/**
 * Read a value persisted in browser storage (`persistCollapsed()`, `persistTab()`).
 * `null` during SSR, when nothing is stored or when storage is unavailable, so callers
 * render the server default first and apply the stored value after mounting.
 */
export function readPersisted(key: string, storage: PersistStorage = 'local'): string | null {
  try {
    return browserStorage(storage)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writePersisted(
  key: string,
  value: string,
  storage: PersistStorage = 'local',
): void {
  try {
    browserStorage(storage)?.setItem(key, value)
  } catch {
    // Full or blocked storage: the state just isn't remembered.
  }
}

/**
 * Resolve a state path like PHP's `$get()` from a container's state path: `name` is a
 * child of the container (a sibling of the component) and each `../` goes one level up
 * (`Get::resolveFromContainerPath()`).
 */
export function resolveContainerStatePath(path: string, containerPath?: string | null): string {
  const base = (containerPath ?? '').replace(/^\.+|\.+$/g, '')
  const segments = base === '' ? [] : base.split('.')

  for (const part of path.split('/')) {
    if (part === '..') {
      segments.pop()
    } else if (part !== '' && part !== '.') {
      segments.push(part)
    }
  }

  return segments.join('.')
}

/**
 * Resolve a state path relative to a field's own path: the field's last segment is
 * dropped, so `name` is a sibling and `../name` is one level up
 * (`Get::resolveRelativePath()`). Components without a state path resolve from the root.
 */
export function resolveStatePath(path: string, basePath?: string | null): string {
  const base = (basePath ?? '').replace(/^\.+|\.+$/g, '')
  const segments = base === '' ? [] : base.split('.')
  // A field's own path points at itself; relative references start from its parent.
  segments.pop()

  return resolveContainerStatePath(path, segments.join('.'))
}

/** What a custom component can read about its schema (see the renderers' context helper). */
export interface SchemaComponentContextValue {
  /** `create`, `edit`, `view`… (`exposeContext()` on the PHP component). */
  operation: string | null
  recordKey: string | number | null
  /** The record attributes listed in `exposeContext(record: [...])`. */
  record: Record<string, unknown> | null
  /** `exposeContext(data: [...])`. */
  data: Record<string, unknown>
  /** The whole form state, or `null` outside a form (infolists). */
  state: Record<string, unknown> | null
  /**
   * Another component's state, like PHP's `$get()`: relative to the component's own path
   * (`'name'` is a sibling, `'../name'` one level up); `isAbsolute` reads from the root.
   */
  get: <T = unknown>(path: string, isAbsolute?: boolean) => T | undefined
}

/**
 * Build the context helper's value from the server context and the current form state.
 * Relative `get()` paths start from the server's `context.basePath` (the container's
 * state path); without it, from `basePath`, the component's own state path (fields).
 */
export function createSchemaComponentContext(
  context: SchemaComponentContext | undefined,
  state: Record<string, unknown> | null,
  basePath?: string | null,
): SchemaComponentContextValue {
  return {
    operation: context?.operation ?? null,
    recordKey: context?.recordKey ?? null,
    record: context?.record ?? null,
    data: context?.data ?? {},
    state,
    get: <T = unknown>(path: string, isAbsolute = false): T | undefined =>
      state === null
        ? undefined
        : getPath<T | undefined>(
            state,
            isAbsolute
              ? path
              : context?.basePath !== undefined
                ? resolveContainerStatePath(path, context.basePath)
                : resolveStatePath(path, basePath),
          ),
  }
}

/** `justify-*` class for an actions row (`footerActionsAlignment()`); empty for `start`. */
export function actionsAlignmentClass(alignment: string | null | undefined): string {
  switch (alignment) {
    case 'center':
      return 'justify-center'
    case 'end':
      return 'justify-end'
    case 'between':
    case 'justify':
      return 'justify-between'
    default:
      return ''
  }
}
