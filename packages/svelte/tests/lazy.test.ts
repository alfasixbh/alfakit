import type { RelationManagersBlock, WidgetsBlock } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import ContentBlockRenderer from '../src/pages/ContentBlockRenderer.svelte'
import Wrapper from './Wrapper.svelte'

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
    const { container } = render(Wrapper, {
      props: { component: ContentBlockRenderer, props: { block: widgets } },
    })

    const placeholders = container.querySelectorAll('[data-slot="lazy-placeholder"]')

    expect(placeholders).toHaveLength(1)
    expect(placeholders[0]).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByText('Posts')).toBeInTheDocument()
  })

  it('keeps relation manager tabs and shows a table skeleton until the data arrives', () => {
    const { container } = render(Wrapper, {
      props: { component: ContentBlockRenderer, props: { block: managers } },
    })

    expect(screen.getByRole('tab', { name: 'Comments' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tags' })).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="lazy-placeholder"][data-variant="table"]'),
    ).not.toBeNull()
  })
})
