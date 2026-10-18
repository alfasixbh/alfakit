import { FormStore } from '@alfakit/core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  cpuTime,
  largeRepeater,
  largeRepeaterState,
  largeTable,
} from '../../core/tests/fixtures/large-form'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, setPageProps } from './mocks'

// jsdom has no matchMedia (the table's mobile preset reads it).
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

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
    } = cpuTime(() =>
      render(
        <Wrapper>
          <FormProvider store={store}>
            <SchemaRenderer components={[repeater]} />
          </FormProvider>
        </Wrapper>,
      ),
    )

    // Measured locally (jsdom, M-series Mac, 3 runs): 42–147 ms and 769 nodes for the first
    // window of 12 items; without windowing the same form takes ~1.6 s and 31,513 nodes.
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
      render(
        <Wrapper>
          <DataTable table={largeTable(1000, 12)} />
        </Wrapper>,
      ),
    )

    // Measured locally (jsdom, M-series Mac, 3 runs): 13–45 ms and 1,357 nodes for the first
    // window of 21 rows; without windowing ~0.55 s and 61,074 nodes.
    expect(container.querySelectorAll('tbody tr[data-index]').length).toBeLessThan(60)
    expect(container.querySelectorAll('*').length).toBeLessThan(2_500)
    expect(elapsed).toBeLessThan(1_000)
  })
})
