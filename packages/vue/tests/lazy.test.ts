import type { RelationManagersBlock, WidgetsBlock } from '@alfakit/core'
import { h } from 'vue'
import ContentBlockRenderer from '../src/pages/ContentBlockRenderer.vue'
import { mountWithAlfakit } from './mocks'

const widgets = {
  type: 'Widgets',
  key: 'widgets',
  columns: { default: 1, lg: 2 },
  widgets: [
    {
      type: 'StatsOverviewWidget',
      key: 'stats',
      id: 'stats',
      columnSpan: { default: 1 },
      lazy: true,
    },
    {
      type: 'StatsOverviewWidget',
      key: 'loaded',
      id: 'loaded',
      columnSpan: { default: 1 },
      stats: [{ label: 'Posts', value: 3 }],
    },
  ],
} as unknown as WidgetsBlock

const managers = {
  type: 'RelationManagers',
  key: 'relationManagers',
  managers: [
    {
      type: 'RelationManager',
      key: 'a',
      component: 'relationManager:A',
      title: 'Comments',
      lazy: true,
    },
    {
      type: 'RelationManager',
      key: 'b',
      component: 'relationManager:B',
      title: 'Tags',
      lazy: true,
    },
  ],
} as unknown as RelationManagersBlock

describe('lazy components', () => {
  it('renders a skeleton in the cell of a lazy widget and the others as usual', () => {
    const wrapper = mountWithAlfakit(() => h(ContentBlockRenderer, { block: widgets }))
    const placeholders = wrapper.findAll('[data-slot="lazy-placeholder"]')

    expect(placeholders).toHaveLength(1)
    expect(placeholders[0]!.attributes('aria-busy')).toBe('true')
    expect(placeholders[0]!.attributes('role')).toBe('status')
    expect(placeholders[0]!.text()).toContain('Loading…')
    expect(wrapper.text()).toContain('Posts')
    wrapper.unmount()
  })

  it('keeps relation manager tabs and shows a table skeleton until the data arrives', () => {
    const wrapper = mountWithAlfakit(() => h(ContentBlockRenderer, { block: managers }))

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Comments', 'Tags'])
    expect(wrapper.find('[data-slot="lazy-placeholder"][data-variant="table"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
