/**
 * Stable, unique key for item `index` of a keyed `{#each}` block.
 *
 * Svelte throws `each_key_duplicate` when two items share a key, but labels,
 * colours, URLs and file names can legitimately repeat. The first occurrence
 * keeps its natural key (so items stay stable across updates); later repeats
 * get an occurrence suffix.
 */
export function uniqueKey<T>(
  items: readonly T[],
  index: number,
  key: (item: T) => unknown,
): string {
  const base = String(key(items[index] as T))
  let seen = 0

  for (let i = 0; i < index; i++) {
    if (String(key(items[i] as T)) === base) {
      seen++
    }
  }

  return seen === 0 ? base : `${base}\u0000${seen}`
}

/** Key for navigation entries, which may repeat both labels and URLs. */
export const navigationKey = (item: { label?: string | null; url?: string | null }): string =>
  `${item.url ?? ''}\u0000${item.label ?? ''}`

/** Identity key for plain string or number list items. */
export const valueKey = (value: unknown): unknown => value
