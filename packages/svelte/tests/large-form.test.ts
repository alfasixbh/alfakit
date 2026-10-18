import { FormStore } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import {
  cpuTime,
  largeRepeater,
  largeRepeaterState,
  largeTable,
} from '../../core/tests/fixtures/large-form'
import DataTable from '../src/components/table/DataTable.svelte'
import FormHarness from './FormHarness.svelte'
import { setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

/*
 * Large-form regression budgets. The times are the worker thread's CPU time in jsdom (see
 * `cpuTime`), several times the local measurements (noted next to each) to stay quiet on a
 * slower CI runner, while still catching a renderer that stops windowing (which multiplies
 * both numbers).
 */
describe('large forms', () => {
  it('renders a 500-item repeater (TextInput, Select, FileUpload) within budget', () => {
    const repeater = largeRepeater(500)
    const store = new FormStore(
      { components: [repeater], state: largeRepeaterState(500) },
      { token: 't', component: 'form' },
    )

    const {
      result: { container },
      elapsed,
    } = cpuTime(() => render(Wrapper, { props: { component: FormHarness, props: { store } } }))

    // Measured locally (jsdom, M-series Mac, 3 runs): 66–246 ms and 745 nodes for the first
    // window of 12 items; without windowing the same form takes ~2.9–4.2 s and 30,513 nodes.
    expect(container.querySelectorAll('li[data-index]').length).toBeLessThan(40)
    expect(container.querySelectorAll('*').length).toBeLessThan(2_500)
    expect(elapsed).toBeLessThan(1_000)
  })

  it('renders a 1,000-row, 12-column table within budget', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })

    const {
      result: { container },
      elapsed,
    } = cpuTime(() =>
      render(Wrapper, {
        props: { component: DataTable, props: { table: largeTable(1000, 12) } },
      }),
    )

    // Measured locally (jsdom, M-series Mac, 3 runs): 63–202 ms and 1,357 nodes for the first
    // window of 21 rows; without windowing ~3.0–4.6 s and 61,074 nodes.
    expect(container.querySelectorAll('tbody tr[data-index]').length).toBeLessThan(60)
    expect(container.querySelectorAll('*').length).toBeLessThan(2_500)
    expect(elapsed).toBeLessThan(1_000)
  })
})
