import { iconAliasOverride, setIconAliases } from '@alfakit/core'
import { renderToString } from 'react-dom/server'
import { AlfakitRoot } from '../src/create-alfakit'
import { Wrapper, panel, setPageProps } from './mocks'

// W-V3-28: the server render (no layout effects) drew the bundled glyph for a chrome icon the
// app replaced with `Icons::register()`, the browser the replacement: a hydration mismatch.
afterEach(() => {
  setPageProps({ alfakit: panel })
  setIconAliases({})
})

it("applies the panel's icon replacements while rendering, not only in an effect", () => {
  setIconAliases({})
  setPageProps({
    alfakit: {
      ...panel,
      theme: { ...panel.theme, icons: { 'alfakit::tables.actions.filter': '/icons/filter.svg' } },
    } as typeof panel,
  })

  renderToString(
    <Wrapper>
      <AlfakitRoot>
        <div />
      </AlfakitRoot>
    </Wrapper>,
  )

  expect(iconAliasOverride('alfakit::tables.actions.filter')).toBe('/icons/filter.svg')
})
