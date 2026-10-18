import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CONTRAST_PAIRS,
  contrast,
  resolveTheme,
  themeNames,
  tokenBlock,
  type Tokens,
} from './support/contrast'

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8')

const themes = read('../themes.css')
const renderers = ['react', 'vue', 'svelte'].map((name) => ({
  name,
  css: read(`../../${name}/src/styles.css`),
}))
const base = {
  light: tokenBlock(renderers[0]!.css, ':root'),
  dark: tokenBlock(renderers[0]!.css, '.dark'),
}

describe('theme contrast (WCAG 2.1 AA)', () => {
  it('computes contrast ratios', () => {
    const tokens: Tokens = {
      '--background': 'oklch(1 0 0)',
      '--white': 'oklch(1 0 0)',
      '--black': 'oklch(0 0 0)',
      '--glass': 'oklch(0 0 0 / 50%)',
    }

    expect(contrast(tokens, '--black', '--white')).toBeCloseTo(21, 1)
    expect(contrast(tokens, '--white', '--white')).toBeCloseTo(1, 5)
    // Translucent colours are composited over the background first.
    expect(contrast(tokens, '--glass', '--white')).toBeGreaterThan(3)
    expect(contrast(tokens, '--glass', '--white')).toBeLessThan(5)
  })

  it('finds the base tokens and every theme', () => {
    expect(base.light['--background']).toBeDefined()
    expect(base.dark['--background']).toBeDefined()
    expect(themeNames(themes)).toEqual(
      expect.arrayContaining(['alfakit', 'minimal', 'soft', 'corporate', 'filament']),
    )
  })

  it('keeps the base tokens identical in every renderer', () => {
    for (const renderer of renderers.slice(1)) {
      expect(tokenBlock(renderer.css, ':root'), renderer.name).toEqual(base.light)
      expect(tokenBlock(renderer.css, '.dark'), renderer.name).toEqual(base.dark)
    }
  })

  const cases = [null, ...themeNames(themes)].flatMap((theme) =>
    (['light', 'dark'] as const).map((mode) => ({ theme, mode })),
  )

  it.each(cases)('$theme theme in $mode mode passes AA', ({ theme, mode }) => {
    const tokens = resolveTheme(base, themes, theme, mode)
    const failures = CONTRAST_PAIRS.map((pair) => ({
      ...pair,
      ratio: contrast(tokens, pair.foreground, pair.background),
    }))
      .filter((pair) => pair.ratio < pair.minimum)
      .map(
        (pair) =>
          `${pair.foreground} on ${pair.background}: ${pair.ratio.toFixed(2)} < ${pair.minimum}`,
      )

    expect(failures).toEqual([])
  })
})
