export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(exponent === 0 ? 0 : decimals)} ${units[exponent]}`
}

/**
 * Replace `:placeholder` tokens the way Laravel's translator does, including the
 * `:Name` (first letter upper-cased) and `:NAME` (upper-cased) variants.
 */
export function interpolate(
  template: string,
  replacements: Record<string, string | number>,
): string {
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length)

  return keys.reduce((result, key) => {
    const value = String(replacements[key])
    const upperFirst = key.charAt(0).toUpperCase() + key.slice(1)

    return result
      .replace(new RegExp(`:${key.toUpperCase()}\\b`, 'g'), value.toUpperCase())
      .replace(new RegExp(`:${upperFirst}\\b`, 'g'), value.charAt(0).toUpperCase() + value.slice(1))
      .replace(new RegExp(`:${key}\\b`, 'g'), value)
  }, template)
}

/** `'10s'`, `'500ms'`, `'2m'` → milliseconds. */
export function parseInterval(interval: string | number | null | undefined): number | null {
  if (interval === null || interval === undefined || interval === '') {
    return null
  }

  if (typeof interval === 'number') {
    return interval
  }

  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i.exec(interval.trim())

  if (!match) {
    return null
  }

  const value = Number(match[1])
  const unit = (match[2] ?? 's').toLowerCase()

  return value * ({ ms: 1, s: 1000, m: 60_000, h: 3_600_000 }[unit] ?? 1000)
}

export function initials(name: string, limit = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, limit)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

let counter = 0

export function uniqueId(prefix = 'alfakit'): string {
  counter += 1

  return `${prefix}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
