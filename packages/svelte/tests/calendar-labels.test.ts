import { render, screen } from '@testing-library/svelte'
import { Calendar } from '../src/components/ui/calendar'
import Wrapper from './Wrapper.svelte'

// W-V3-06: the month buttons were announced as Bits UI's English "Previous" / "Next".
describe('calendar month navigation labels', () => {
  it('names the previous and next month buttons from the language pack', () => {
    render(Wrapper, { props: { component: Calendar, props: {} } })

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument()
  })
})
