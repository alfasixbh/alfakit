import { render } from '@testing-library/svelte'
import FormattedText from '../src/components/entries/FormattedText.svelte'
import Wrapper from './Wrapper.svelte'

// A list of enum cases whose colours differ carries them per item.
describe('per-item enum colours', () => {
  it('colours each badge from itemColors, falling back to the shared colour', () => {
    const { container } = render(Wrapper, {
      props: {
        component: FormattedText,
        props: {
          value: ['Draft', 'Published', 'Archived'],
          schema: { badge: true, color: 'gray', itemColors: ['warning', 'success', null] },
        },
      },
    })

    const badges = [...container.querySelectorAll('[data-slot="badge"]')]

    expect(badges).toHaveLength(3)
    expect(badges[0]!.className).toMatch(/warning/)
    expect(badges[1]!.className).toMatch(/success/)
    expect(badges[2]!.className).not.toMatch(/warning|success/)
  })
})
