import { render } from '@testing-library/svelte'
import FormattedText from '../src/components/entries/FormattedText.svelte'
import Wrapper from './Wrapper.svelte'

// Arabic-locale money ("‏0.00 US$") starts with a right-to-left mark: in `<bdi>` without a
// direction it showed as "$US 0.00".
const usd = '‏0.00 US$'

describe('display values in right-to-left languages', () => {
  it('lays out money without right-to-left letters as written, Arabic text in its own direction', () => {
    const { container } = render(Wrapper, {
      props: { component: FormattedText, props: { value: [usd, 'مرحبا'], schema: {} } },
    })

    const values = [...container.querySelectorAll('bdi')]

    expect(values[0]).toHaveAttribute('dir', 'ltr')
    expect(values[0]!.textContent).toBe(usd)
    expect(values[1]).toHaveAttribute('dir', 'auto')
  })
})
