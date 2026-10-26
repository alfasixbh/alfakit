import { Translator } from '@alfakit/core'
import { render, screen } from '@testing-library/react'
import { Calendar } from '../src/components/ui/calendar'
import { AlfakitProvider } from '../src/context'
import { actions, registry } from './mocks'

// W-V3-06: the month buttons were announced as react-day-picker's English defaults.
describe('calendar month navigation labels', () => {
  it('names the previous and next month buttons in English by default', () => {
    render(
      <AlfakitProvider value={{ registry, pages: {}, actions, translator: new Translator({}) }}>
        <Calendar mode="single" />
      </AlfakitProvider>,
    )

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument()
  })

  it("uses the panel's language pack", () => {
    const translator = new Translator({
      form: { previous_month: 'الشهر السابق', next_month: 'الشهر التالي' },
    })

    render(
      <AlfakitProvider value={{ registry, pages: {}, actions, translator }}>
        <Calendar mode="single" />
      </AlfakitProvider>,
    )

    expect(screen.getByRole('button', { name: 'الشهر السابق' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'الشهر التالي' })).toBeInTheDocument()
  })
})
