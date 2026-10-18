/**
 * Runtime deprecation warnings for the frontend, mirroring `Deprecations::warn()` in PHP:
 * each key is reported once per process (browser session or SSR worker).
 *
 * ```ts
 * deprecate('createAlfakit({ adapters })', 'pass components instead', { since: '1.2' })
 * ```
 */
const reported = new Map<string, string>()

export interface DeprecationOptions {
  /** The release that deprecated it, e.g. `'1.2'`. */
  since?: string
}

export function deprecationMessage(
  key: string,
  message: string,
  options: DeprecationOptions = {},
): string {
  const since = options.since ? ` since Alfakit ${options.since}` : ''

  return `Alfakit: ${key} is deprecated${since}: ${message}`
}

/**
 * Warn about a deprecated API. Returns true the first time a key is reported, false for
 * every later call with the same key.
 */
export function deprecate(key: string, message: string, options: DeprecationOptions = {}): boolean {
  if (reported.has(key)) return false

  const text = deprecationMessage(key, message, options)
  reported.set(key, text)
  console.warn(text)

  return true
}

/** The messages reported so far, in report order (for a debug panel). */
export function reportedDeprecations(): string[] {
  return [...reported.values()]
}

/** Forget every reported deprecation (tests). */
export function resetDeprecations(): void {
  reported.clear()
}
