import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import PopoverHarness from './PopoverHarness.svelte'

describe('popover', () => {
  // A quick click on a button that opens a modal must not leave the list open over it.
  it('closes on an outside pointerdown, before the click lands', async () => {
    const onOpenChange = vi.fn()
    render(PopoverHarness, { props: { onOpenChange } })
    await tick()

    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Inside' }))
    expect(screen.getByTestId('state')).toHaveTextContent('open')

    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.getByTestId('state')).toHaveTextContent('closed')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
