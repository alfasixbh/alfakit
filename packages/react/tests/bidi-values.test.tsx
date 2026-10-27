import { render } from '@testing-library/react'
import { FormattedText } from '../src/components/entries/text-entry'
import { StatsOverviewWidget } from '../src/components/widgets/stats-overview'
import { Wrapper } from './mocks'

// Arabic-locale money ("‏0.00 US$") starts with a right-to-left mark: in `<bdi>` without a
// direction it showed as "$US 0.00".
const usd = '‏0.00 US$'

describe('display values in right-to-left languages', () => {
  it('lays out money without right-to-left letters as written, Arabic text in its own direction', () => {
    const { container } = render(
      <Wrapper>
        <FormattedText value={[usd, 'مرحبا']} schema={{}} />
      </Wrapper>,
    )

    const values = [...container.querySelectorAll('bdi')]

    expect(values[0]).toHaveAttribute('dir', 'ltr')
    expect(values[0]!.textContent).toBe(usd)
    expect(values[1]).toHaveAttribute('dir', 'auto')
  })

  it('isolates stat values the same way', () => {
    const { container } = render(
      <Wrapper>
        <StatsOverviewWidget
          widget={
            {
              type: 'StatsOverviewWidget',
              key: 'stats',
              stats: [{ label: 'الإيرادات', value: usd, description: 'آخر 30 يومًا' }],
            } as never
          }
        />
      </Wrapper>,
    )

    expect(container.querySelector(`bdi[dir="ltr"]`)?.textContent).toBe(usd)
    expect(container.querySelector('bdi[dir="auto"]')?.textContent).toBe('آخر 30 يومًا')
  })
})
