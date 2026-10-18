/**
 * WCAG 2.1 contrast of the theme tokens: parses the token blocks of `themes.css` and the
 * renderers' base `styles.css`, resolves `var()` references, composites translucent colours
 * over their background and computes contrast ratios. Used by `contrast.test.ts`.
 */

export type Tokens = Record<string, string>

type Rgba = { r: number; g: number; b: number; a: number }

/** Custom properties declared directly in the block whose selector is exactly `selector`. */
export function tokenBlock(css: string, selector: string): Tokens {
  const tokens: Tokens = {}
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let index = 0

  while ((index = source.indexOf(selector, index)) !== -1) {
    const lineStart = source.lastIndexOf('\n', index) + 1
    const after = source.slice(index + selector.length).match(/^\s*\{/)

    if (lineStart !== index || !after) {
      index += selector.length
      continue
    }

    const open = index + selector.length + after[0].length
    const close = source.indexOf('}', open)

    for (const match of source.slice(open, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[match[1] as string] = (match[2] as string).trim()
    }

    index = close
  }

  return tokens
}

/** Theme names declared in `themes.css` (`:root[data-alfakit-theme~='name'] {`). */
export function themeNames(css: string): string[] {
  return [
    ...new Set(
      [...css.matchAll(/^:root\[data-alfakit-theme~='([\w-]+)'\]\s*\{/gm)].map(
        (match) => match[1] as string,
      ),
    ),
  ]
}

/** The tokens in effect for a theme and mode, following the cascade of `themes.css`. */
export function resolveTheme(
  base: { light: Tokens; dark: Tokens },
  themes: string,
  theme: string | null,
  mode: 'light' | 'dark',
): Tokens {
  const light = theme ? tokenBlock(themes, `:root[data-alfakit-theme~='${theme}']`) : {}
  const dark = theme ? tokenBlock(themes, `:root.dark[data-alfakit-theme~='${theme}']`) : {}

  // `:root.dark[theme]` beats `:root[theme]`, which beats `.dark`, which beats `:root`.
  return mode === 'light'
    ? { ...base.light, ...light }
    : { ...base.light, ...base.dark, ...light, ...dark }
}

/** Resolve `var(--name, fallback)` (the panel colour variables are unset: use the fallback). */
export function tokenValue(tokens: Tokens, name: string, depth = 0): string {
  const raw = tokens[name]

  if (raw === undefined) {
    throw new Error(`Token ${name} is not defined.`)
  }

  return resolveVars(tokens, raw, depth)
}

function resolveVars(tokens: Tokens, value: string, depth: number): string {
  if (depth > 10) {
    throw new Error(`Token reference loop in ${value}.`)
  }

  const match = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/)

  if (!match) {
    return value
  }

  const [, reference, fallback] = match

  if (reference && !reference.startsWith('--alfakit-') && tokens[reference] !== undefined) {
    return tokenValue(tokens, reference, depth + 1)
  }

  if (fallback === undefined) {
    throw new Error(`Token ${reference} has no value.`)
  }

  return resolveVars(tokens, fallback.trim(), depth + 1)
}

/** Parse `oklch(L C H / A)` (L as 0–1 or a percentage, A as 0–1 or a percentage). */
export function parseOklch(value: string): Rgba {
  const match = value.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  )

  if (!match) {
    throw new Error(`Unsupported colour: ${value}`)
  }

  const number = (part: string, percentScale: number) =>
    part.endsWith('%') ? (parseFloat(part) / 100) * percentScale : parseFloat(part)

  const lightness = number(match[1] as string, 1)
  const chroma = parseFloat(match[2] as string)
  const hue = (parseFloat(match[3] as string) * Math.PI) / 180
  const alpha = match[4] === undefined ? 1 : number(match[4], 1)

  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  const clamp = (channel: number) => Math.min(1, Math.max(0, channel))

  return {
    r: encode(clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: encode(clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: encode(clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: alpha,
  }
}

/** Linear light → gamma-encoded sRGB (0–1). */
function encode(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
}

function decode(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** Composite a translucent colour over an opaque one (in gamma-encoded sRGB, like browsers). */
function over(top: Rgba, bottom: Rgba): Rgba {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  }
}

function luminance(colour: Rgba): number {
  return 0.2126 * decode(colour.r) + 0.7152 * decode(colour.g) + 0.0722 * decode(colour.b)
}

/**
 * WCAG 2.1 contrast ratio of two token colours. A translucent background is first composited
 * over the page background, a translucent foreground over the result.
 */
export function contrast(tokens: Tokens, foreground: string, background: string): number {
  const page = parseOklch(tokenValue(tokens, '--background'))
  const bottom = over(parseOklch(tokenValue(tokens, background)), page)
  const top = over(parseOklch(tokenValue(tokens, foreground)), bottom)
  const [light, dark] = [luminance(top), luminance(bottom)].sort((x, y) => y - x) as [
    number,
    number,
  ]

  return (light + 0.05) / (dark + 0.05)
}

export interface ContrastPair {
  foreground: string
  background: string
  /** 4.5 for text, 3 for component boundaries (WCAG 1.4.3 / 1.4.11). */
  minimum: number
}

/** The token pairs every theme must pass in light and dark mode. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { foreground: '--foreground', background: '--background', minimum: 4.5 },
  { foreground: '--card-foreground', background: '--card', minimum: 4.5 },
  { foreground: '--popover-foreground', background: '--popover', minimum: 4.5 },
  { foreground: '--muted-foreground', background: '--background', minimum: 4.5 },
  { foreground: '--muted-foreground', background: '--card', minimum: 4.5 },
  { foreground: '--primary-foreground', background: '--primary', minimum: 4.5 },
  // `text-primary` links and active states.
  { foreground: '--primary', background: '--background', minimum: 4.5 },
  { foreground: '--secondary-foreground', background: '--secondary', minimum: 4.5 },
  { foreground: '--accent-foreground', background: '--accent', minimum: 4.5 },
  { foreground: '--sidebar-foreground', background: '--sidebar', minimum: 4.5 },
  { foreground: '--sidebar-accent-foreground', background: '--sidebar-accent', minimum: 4.5 },
  { foreground: '--destructive', background: '--background', minimum: 4.5 },
  { foreground: '--destructive', background: '--card', minimum: 4.5 },
  { foreground: '--destructive-foreground', background: '--destructive', minimum: 4.5 },
  // Status colours: badges and `text-success|warning|info` on the page, and solid buttons.
  { foreground: '--success', background: '--background', minimum: 4.5 },
  { foreground: '--warning', background: '--background', minimum: 4.5 },
  { foreground: '--info', background: '--background', minimum: 4.5 },
  { foreground: '--success-foreground', background: '--success', minimum: 4.5 },
  { foreground: '--warning-foreground', background: '--warning', minimum: 4.5 },
  { foreground: '--info-foreground', background: '--info', minimum: 4.5 },
  { foreground: '--input', background: '--background', minimum: 3 },
  { foreground: '--input', background: '--card', minimum: 3 },
]
