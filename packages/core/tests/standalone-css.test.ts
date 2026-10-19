import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8')
const rule = (css: string, selector: string) =>
  css.match(new RegExp(`${selector.replace(/[[\]'()]/g, '\\$&')} \\{([^}]*)\\}`))?.[1]?.trim()

describe('standalone.css', () => {
  // Starter-kit panels load standalone.css instead of themes.css: the credit footer would
  // otherwise draw the Alfa Six emblem at the full width of the page.
  it('sizes the credit emblem like themes.css', () => {
    const selector = "[data-slot='credit'] svg"

    expect(rule(read('../standalone.css'), selector)).toBe(rule(read('../themes.css'), selector))
    expect(rule(read('../standalone.css'), selector)).toContain('height: 1.125rem')
  })

  // Plugin widgets (calendar, tree, Kanban, chart colours, RichEditor columns) look the
  // same in starter-kit panels: both stylesheets import the shared component styles.
  it('shares the component styles with the panel stylesheet', () => {
    const importsComponents = /^@import '\.\/components\.css';$/m

    expect(read('../standalone.css')).toMatch(importsComponents)
    expect(read('../themes.css')).toMatch(importsComponents)

    const components = read('../components.css')

    for (const selector of [
      ":where(.fc[data-slot='calendar'])",
      "[data-slot='tree-item'][data-drop='inside']",
      "[data-slot='kanban-card'][data-picked='keyboard']",
      ':where(.alfakit-grid)',
    ]) {
      expect(components).toContain(selector)
    }
    expect(components).toContain('--chart-text')
    expect(read('../themes.css')).not.toContain('--fc-page-bg-color')
  })

  // An @import after other rules is ignored by CSS (and dropped by Tailwind).
  it('imports before any rule', () => {
    for (const file of ['../standalone.css', '../themes.css']) {
      const css = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim()

      expect(css.startsWith("@import './components.css';")).toBe(true)
    }
  })
})
