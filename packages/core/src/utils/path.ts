/**
 * Dot-path helpers mirroring Laravel's `data_get` / `data_set` semantics, used for form
 * state addressed by `statePath` (e.g. `comments.0.body`).
 */

export type PathSegment = string | number

export function splitPath(path: string): string[] {
  return path === '' ? [] : path.split('.')
}

export function getPath<T = unknown>(source: unknown, path: string, fallback?: T): T {
  if (path === '') {
    return source as T
  }

  let current: unknown = source

  for (const segment of splitPath(path)) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return fallback as T
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return (current === undefined ? fallback : current) as T
}

export function hasPath(source: unknown, path: string): boolean {
  let current: unknown = source

  for (const segment of splitPath(path)) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object' ||
      !(segment in (current as object))
    ) {
      return false
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return true
}

/**
 * Immutably set a value, cloning each container along the path. Numeric segments on a
 * missing container create arrays.
 */
export function setPath<T extends object>(source: T, path: string, value: unknown): T {
  const segments = splitPath(path)

  if (segments.length === 0) {
    return value as T
  }

  const root: unknown = Array.isArray(source) ? [...source] : { ...(source ?? {}) }
  let current = root as Record<string, unknown>

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1

    if (isLast) {
      current[segment] = value

      return
    }

    const existing = current[segment]
    const nextSegment = segments[index + 1] ?? ''
    const container =
      existing !== null && typeof existing === 'object'
        ? Array.isArray(existing)
          ? [...existing]
          : { ...existing }
        : /^\d+$/.test(nextSegment)
          ? []
          : {}

    current[segment] = container
    current = container as Record<string, unknown>
  })

  return root as T
}

export function deletePath<T extends object>(source: T, path: string): T {
  const segments = splitPath(path)
  const last = segments.pop()

  if (last === undefined) {
    return source
  }

  const parentPath = segments.join('.')
  const parent = getPath<Record<string, unknown> | unknown[]>(source, parentPath)

  if (parent === null || parent === undefined || typeof parent !== 'object') {
    return source
  }

  if (Array.isArray(parent)) {
    const copy = [...parent]
    copy.splice(Number(last), 1)

    return setPath(source, parentPath, copy)
  }

  const copy = { ...parent }
  delete copy[last]

  return setPath(source, parentPath, copy)
}

export function parentPath(path: string): string {
  const segments = splitPath(path)
  segments.pop()

  return segments.join('.')
}

export function joinPath(...segments: PathSegment[]): string {
  return segments
    .map(String)
    .filter((segment) => segment !== '')
    .join('.')
}

/**
 * Replace the Repeater template placeholder with a concrete index, deeply, in any
 * string value of the object (state paths, keys, ids). Only the first placeholder of each
 * string is this level's: a repeater inside a builder block template has item paths like
 * `content.__INDEX__.data.items.__INDEX__.question`, whose second placeholder is filled
 * in when an item is added to that repeater.
 */
export function replacePlaceholder<T>(value: T, placeholder: string, replacement: string): T {
  if (typeof value === 'string') {
    const at = value.indexOf(placeholder)

    return (
      at === -1 ? value : value.slice(0, at) + replacement + value.slice(at + placeholder.length)
    ) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholder(item, placeholder, replacement)) as T
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = replacePlaceholder(nested, placeholder, replacement)
    }

    return result as T
  }

  return value
}

// Instances of a template per index, kept while the template object lives (it is replaced
// when the server sends a new schema).
const templateInstances = new WeakMap<object, Map<string, unknown>>()

/**
 * A Repeater or Builder template with the item index filled in (`replacePlaceholder()`),
 * the same object for the same template and index. Items the server hasn't seen yet render
 * from their template on every render: new objects each time made every field below them
 * render again (and restart work such as the image editor's loading).
 */
export function templateForIndex<T extends object>(template: T, index: number | string): T {
  let instances = templateInstances.get(template)

  if (!instances) {
    instances = new Map()
    templateInstances.set(template, instances)
  }

  const key = String(index)
  let instance = instances.get(key) as T | undefined

  if (instance === undefined) {
    instance = replacePlaceholder(template, '__INDEX__', key)
    instances.set(key, instance)
  }

  return instance
}
