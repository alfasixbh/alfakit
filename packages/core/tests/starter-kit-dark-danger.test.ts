import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { contrast } from './support/contrast'

const css = readFileSync(resolve(__dirname, '../standalone.css'), 'utf8')

// W-D-11: in a starter kit's dark mode, danger text used the kit's dark `--destructive`
// (a button background colour), about 2:1 on the kit's near-black page.
describe('starter kit dark danger text', () => {
  it("gives danger text in AlfaKit's views a readable red in dark mode", () => {
    const rule = css.slice(css.indexOf('.dark :where([data-alfakit-embedded]'))
    const fallback = rule.match(/--alfakit-danger-text,\s*(oklch\([^)]*\))/)?.[1]

    expect(rule).toContain('.text-destructive')
    expect(fallback).toBeDefined()

    const tokens = {
      '--text': fallback!,
      // The Laravel starter kits' dark background and dark `--destructive`.
      '--background': 'oklch(0.145 0 0)',
      '--kit-destructive': 'oklch(0.396 0.141 25.723)',
    }

    expect(contrast(tokens, '--kit-destructive', '--background')).toBeLessThan(4.5)
    expect(contrast(tokens, '--text', '--background')).toBeGreaterThanOrEqual(4.5)
  })
})
