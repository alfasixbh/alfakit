import type { RelationManagersBlock } from '@alfakit/core'
import { h } from 'vue'
import RelationManagers from '../src/pages/RelationManagers.vue'
import { mountWithAlfakit } from './mocks'

const combined = (position: 'before' | 'after'): RelationManagersBlock => ({
  type: 'RelationManagers',
  key: 'relationManagers',
  managers: [{ type: 'RelationManager', key: 'c', component: 'c', title: 'Comments', lazy: true }],
  content: {
    label: 'Edit',
    position,
    block: {
      type: 'Schema',
      key: 'form',
      components: [{ type: 'Text', key: 'intro', content: 'The form' }],
    },
  },
})

describe('combined relation manager tabs', () => {
  it('shows the form as the first tab next to a single manager', () => {
    const wrapper = mountWithAlfakit(() => h(RelationManagers, { block: combined('before') }))
    const tabs = wrapper.findAll('[role="tab"]')

    expect(tabs.map((tab) => tab.text())).toEqual(['Edit', 'Comments'])
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('The form')
  })

  it('places the content tab last and keeps the form mounted while hidden', () => {
    const wrapper = mountWithAlfakit(() => h(RelationManagers, { block: combined('after') }))

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Comments', 'Edit'])
    expect(wrapper.find('[data-slot="relation-content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('The form')
  })
})
