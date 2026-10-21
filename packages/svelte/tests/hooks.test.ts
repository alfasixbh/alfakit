import { createStore } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import HooksHarness from './HooksHarness.svelte'

describe('hooks in the browser', () => {
  it('useHydrated() turns true after mount and useStore() follows the store through .current', async () => {
    const store = createStore({ count: 1 })
    render(HooksHarness, { props: { store } })
    await tick()

    expect(screen.getByTestId('hydrated')).toHaveTextContent('true')
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    store.set({ count: 2 })
    await tick()

    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })
})
