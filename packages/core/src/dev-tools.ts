import type { DevToolsSchema } from './schema/dev-tools'

/**
 * Framework-agnostic helpers of the schema inspector (`Panel::devTools()`): walking the
 * page props as a JSON tree, searching it, and reading the server time AlfaKit reports in
 * the `Server-Timing` header (through the Performance API, which also covers the first
 * page load).
 */

export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface JsonEntry {
  key: string
  /** Dotted path from the root (`page.content.0.type`). */
  path: string
  value: unknown
  kind: JsonKind
}

export function jsonKind(value: unknown): JsonKind {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'

  switch (typeof value) {
    case 'object':
      return 'object'
    case 'number':
    case 'bigint':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'string'
  }
}

/** The children of an object or array, in order. */
export function jsonEntries(value: unknown, path = ''): JsonEntry[] {
  if (value === null || typeof value !== 'object') {
    return []
  }

  return Object.entries(value as Record<string, unknown>).map(([key, child]) => ({
    key,
    path: path === '' ? key : `${path}.${key}`,
    value: child,
    kind: jsonKind(child),
  }))
}

/** How many children an object or array has (0 for scalars). */
export function jsonSize(value: unknown): number {
  return value !== null && typeof value === 'object' ? Object.keys(value).length : 0
}

/** A scalar as JSON shows it: strings quoted, null as `null`. */
export function jsonScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)

  return String(value)
}

export interface JsonSearchResult {
  /** Paths whose key or scalar value contains the query. */
  matches: Set<string>
  /** Matches and every ancestor of a match: the nodes to show (and open) while searching. */
  visible: Set<string>
}

/** Case-insensitive search through keys and scalar values. */
export function searchJson(value: unknown, query: string): JsonSearchResult {
  const matches = new Set<string>()
  const visible = new Set<string>()
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return { matches, visible }
  }

  const walk = (node: unknown, path: string, depth: number): boolean => {
    let found = false

    for (const entry of jsonEntries(node, path)) {
      const own =
        entry.key.toLowerCase().includes(needle) ||
        (entry.kind !== 'object' &&
          entry.kind !== 'array' &&
          jsonScalar(entry.value).toLowerCase().includes(needle))
      const nested = depth < 64 && walk(entry.value, entry.path, depth + 1)

      if (own) matches.add(entry.path)
      if (own || nested) {
        visible.add(entry.path)
        found = true
      }
    }

    return found
  }

  walk(value, '', 0)

  return { matches, visible }
}

/** Page props worth inspecting: everything except the inspector's and the debug drawer's own data. */
export function inspectableProps(props: Record<string, unknown>): Record<string, unknown> {
  const { alfakitDevTools: _devTools, alfakitDebug: _debug, ...rest } = props

  return rest
}

/** Pretty-printed JSON for the copy button. */
export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? ''
  } catch {
    return ''
  }
}

/**
 * The latest server time (ms) AlfaKit reported in a `Server-Timing: alfakit;dur=…` header,
 * from the page load or the latest Inertia visit / internal request; null when the
 * browser has none (no header, or no Performance API, e.g. during SSR).
 */
export function latestServerTiming(): number | null {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return null
  }

  const entries = [
    ...performance.getEntriesByType('navigation'),
    ...performance.getEntriesByType('resource'),
  ] as PerformanceResourceTiming[]
  let latest: { at: number; duration: number } | null = null

  for (const entry of entries) {
    const timing = (entry.serverTiming ?? []).find((item) => item.name === 'alfakit')

    if (timing && (latest === null || entry.responseEnd >= latest.at)) {
      latest = { at: entry.responseEnd, duration: timing.duration }
    }
  }

  return latest === null ? null : Math.round(latest.duration * 10) / 10
}

/** Whether a page carries dev tools data (`Panel::devTools()` with `app.debug` on). */
export function hasDevTools(props: { alfakitDevTools?: DevToolsSchema | null }): boolean {
  return props.alfakitDevTools !== undefined && props.alfakitDevTools !== null
}
