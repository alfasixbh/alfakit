import { FormStore } from '@alfakit/core'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import {
  cpuTime,
  largeRepeater,
  largeRepeaterState,
  largeTable,
} from '../../core/tests/fixtures/large-form'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

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
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(SchemaRenderer, { components: [repeater] })
      },
    })

    const { result: wrapper, elapsed } = cpuTime(() => mountWithAlfakit(() => h(Form)))

    // Measured locally (jsdom, M-series Mac, 3 runs): 37–132 ms and 745 nodes for the first
    // window of 12 items; without windowing the same form takes ~1.4–1.9 s and 30,513 nodes.
    expect(wrapper.findAll('li[data-index]').length).toBeLessThan(40)
    expect(wrapper.element.querySelectorAll('*').length).toBeLessThan(2_500)
    expect(elapsed).toBeLessThan(1_000)
    wrapper.unmount()
  })

  it('renders a 1,000-row, 12-column table within budget', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })

    const { result: wrapper, elapsed } = cpuTime(() =>
      mountWithAlfakit(() => h(DataTable, { table: largeTable(1000, 12) })),
    )

    // Measured locally (jsdom, M-series Mac, 3 runs): 36–71 ms and 1,357 nodes for the first
    // window of 21 rows; without windowing ~1.6 s and 61,074 nodes.
    expect(wrapper.findAll('tbody tr[data-index]').length).toBeLessThan(60)
    expect(wrapper.element.querySelectorAll('*').length).toBeLessThan(2_500)
    expect(elapsed).toBeLessThan(1_000)
    wrapper.unmount()
  })
})
