/**
 * A deep copy of plain state. Reactive proxies (Svelte `$state`, Vue `reactive`) can't be
 * structured-cloned (`DataCloneError`), so those fall back to a JSON round trip, which is
 * lossless for the JSON state the server sends.
 */
export function cloneState<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Fall through to the JSON copy.
    }
  }

  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)
}
