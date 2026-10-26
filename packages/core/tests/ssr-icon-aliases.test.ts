import { afterEach, describe, expect, it, vi } from 'vitest'
import { iconAliasOverride, setIconAliases } from '../src/icons'
import type { PanelSchema } from '../src/schema/panel'
import { applyPanelTheme } from '../src/theme'

// W-V3-28: the server render drew the bundled glyph for a chrome icon the app replaced with
// `Icons::register()`, the browser the replacement, so hydration mismatched.
describe('icon aliases during a server render', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setIconAliases({})
  })

  it("applies the panel's icon replacements without a document", () => {
    vi.stubGlobal('document', undefined)

    applyPanelTheme({
      id: 'admin',
      theme: { icons: { 'alfakit::tables.actions.filter': '/icons/filter.svg' } },
      colors: {},
    } as unknown as PanelSchema)

    expect(iconAliasOverride('alfakit::tables.actions.filter')).toBe('/icons/filter.svg')
  })
})
