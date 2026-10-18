/**
 * Conversions between the native `<input type="color">` value (always `#rrggbb`) and the
 * formats a ColorPicker can store (`hex`, `rgb`, `rgba`, `hsl`). The server validates the
 * stored string; these helpers only translate what the swatch picker produces.
 */

export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl'

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function parseHex(value: string): Rgba | null {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1]

  if (!digits) {
    return null
  }

  const hex =
    digits.length === 3
      ? digits
          .split('')
          .map((char) => char + char)
          .join('')
      : digits

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  }
}

function parseRgb(value: string): Rgba | null {
  const match =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+)\s*)?\)$/i.exec(
      value.trim(),
    )

  if (!match) {
    return null
  }

  return {
    r: clamp(Number(match[1]), 0, 255),
    g: clamp(Number(match[2]), 0, 255),
    b: clamp(Number(match[3]), 0, 255),
    a: match[4] === undefined ? 1 : clamp(Number(match[4]), 0, 1),
  }
}

function parseHsl(value: string): Rgba | null {
  const match = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/i.exec(value.trim())

  if (!match) {
    return null
  }

  const h = (Number(match[1]) % 360) / 360
  const s = clamp(Number(match[2]), 0, 100) / 100
  const l = clamp(Number(match[3]), 0, 100) / 100

  if (s === 0) {
    const grey = Math.round(l * 255)

    return { r: grey, g: grey, b: grey, a: 1 }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const k = t < 0 ? t + 1 : t > 1 ? t - 1 : t

    if (k < 1 / 6) return p + (q - p) * 6 * k
    if (k < 1 / 2) return q
    if (k < 2 / 3) return p + (q - p) * (2 / 3 - k) * 6

    return p
  }

  return {
    r: Math.round(channel(h + 1 / 3) * 255),
    g: Math.round(channel(h) * 255),
    b: Math.round(channel(h - 1 / 3) * 255),
    a: 1,
  }
}

function parseColor(value: string): Rgba | null {
  return parseHex(value) ?? parseRgb(value) ?? parseHsl(value)
}

/** The `#rrggbb` value for the native swatch input, or null when `value` is not a colour. */
export function colorToHex(value: string | null | undefined): string | null {
  const color = value ? parseColor(value) : null

  if (!color) {
    return null
  }

  return `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Convert a picked `#rrggbb` value to the field's format. `previous` keeps the alpha
 * channel of an existing `rgba` value, which the native picker cannot edit.
 */
export function formatColor(hex: string, format: ColorFormat, previous?: string | null): string {
  const color = parseHex(hex)

  if (!color || format === 'hex') {
    return hex
  }

  const { r, g, b } = color

  if (format === 'rgb') {
    return `rgb(${r}, ${g}, ${b})`
  }

  if (format === 'rgba') {
    const alpha = (previous ? parseRgb(previous)?.a : undefined) ?? 1

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4

    h /= 6
  }

  return `hsl(${Math.round(h * 360) % 360}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

/** The alpha channel of a colour, 0–1 (1 when it has none or is not a colour). */
export function colorAlpha(value: string | null | undefined): number {
  return (value ? parseColor(value)?.a : undefined) ?? 1
}

/**
 * `value` as `rgba()` with a new alpha (`ColorPicker::rgba()`'s opacity control). Rounded
 * to two decimals; black when `value` is not a colour yet.
 */
export function withColorAlpha(value: string | null | undefined, alpha: number): string {
  const { r, g, b } = (value ? parseColor(value) : null) ?? { r: 0, g: 0, b: 0 }
  const rounded = Math.round(clamp(alpha, 0, 1) * 100) / 100

  return `rgba(${r}, ${g}, ${b}, ${rounded})`
}
