import { render } from '@testing-library/react'
import { FormattedText } from '../src/components/entries/text-entry'
import { Wrapper } from './mocks'

// A list of enum cases whose colours or icons differ carries them per item.
describe('per-item enum colours', () => {
  it('colours each badge from itemColors, falling back to the shared colour', () => {
    const { container } = render(
      <Wrapper>
        <FormattedText
          value={['Draft', 'Published', 'Archived']}
          schema={{ badge: true, color: 'gray', itemColors: ['warning', 'success', null] }}
        />
      </Wrapper>,
    )

    const badges = [...container.querySelectorAll('[data-slot="badge"]')]

    expect(badges).toHaveLength(3)
    expect(badges[0]!.className).toMatch(/warning/)
    expect(badges[1]!.className).toMatch(/success/)
    expect(badges[2]!.className).not.toMatch(/warning|success/)
  })
})
