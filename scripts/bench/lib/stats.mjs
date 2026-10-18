/** Medians and spreads for the benchmark samples. */

export const round = (value, digits = 1) =>
    value === null || value === undefined || Number.isNaN(value)
        ? null
        : Math.round(value * 10 ** digits) / 10 ** digits

const quantile = (sorted, q) => {
    if (sorted.length === 0) return null
    const position = (sorted.length - 1) * q
    const lower = Math.floor(position)
    const upper = Math.ceil(position)

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

/** `{ n, min, median, p95, max }` of the numeric values (nulls are skipped). */
export function summarize(values) {
    const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b)

    if (sorted.length === 0) return null

    return {
        n: sorted.length,
        min: round(sorted[0]),
        median: round(quantile(sorted, 0.5)),
        p95: round(quantile(sorted, 0.95)),
        max: round(sorted.at(-1)),
    }
}

export const formatBytes = (bytes) =>
    bytes === null || bytes === undefined
        ? 'n/a'
        : bytes >= 1024 * 1024
          ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
          : `${(bytes / 1024).toFixed(1)} KB`

export const formatMs = (ms) => (ms === null || ms === undefined ? 'n/a' : `${Math.round(ms)} ms`)
