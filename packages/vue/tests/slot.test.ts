import type { SchemaComponent } from '@alfakit/core'
import { h } from 'vue'
import Slot from '../src/components/panel/Slot.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

describe('Slot', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it('renders nothing when the slot is empty', () => {
    const wrapper = mountWithAlfakit(() => h(Slot, { name: 'topbar.end' }))

    expect(wrapper.find('[data-slot-name]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders html and component items', () => {
    setPageProps({
      alfakit: {
        ...panel,
        slots: {
          'topbar.end': [
            { type: 'html', html: '<span class="from-html">Hello</span>' },
            {
              type: 'component',
              component: {
                type: 'Text',
                key: 'note',
                content: 'From a component',
              } as SchemaComponent,
            },
          ],
        },
      },
    })

    const wrapper = mountWithAlfakit(() => h(Slot, { name: 'topbar.end', class: 'gap-2' }))
    const root = wrapper.find('[data-slot-name="topbar.end"]')

    expect(root.exists()).toBe(true)
    expect(root.classes()).toContain('contents')
    expect(root.find('.from-html').text()).toBe('Hello')
    expect(root.text()).toContain('From a component')
    wrapper.unmount()
  })

  it('renders items with `when` only where the slot data matches', () => {
    setPageProps({
      alfakit: {
        ...panel,
        slots: {
          'table.header-cell': [
            { type: 'html', html: '<span>every</span>' },
            { type: 'html', html: '<span>title-only</span>', when: { column: 'title' } },
            { type: 'html', html: '<span>money</span>', when: { column: ['price', 'total'] } },
          ],
        },
      },
    })

    const title = mountWithAlfakit(() =>
      h(Slot, { name: 'table.header-cell', data: { column: 'title' } }),
    )
    expect(title.text()).toBe('everytitle-only')
    title.unmount()

    const total = mountWithAlfakit(() =>
      h(Slot, { name: 'table.header-cell', data: { column: 'total' } }),
    )
    expect(total.text()).toBe('everymoney')
    total.unmount()
  })
})
