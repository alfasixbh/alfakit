import type { RelationManagersBlock } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import RelationManagers from '../src/pages/RelationManagers.svelte'
import Wrapper from './Wrapper.svelte'

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
    render(Wrapper, {
      props: { component: RelationManagers, props: { block: combined('before') } },
    })
    const tabs = screen.getAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Edit', 'Comments'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('The form')).toBeInTheDocument()
  })

  it('places the content tab last and keeps the form mounted while hidden', () => {
    const { container } = render(Wrapper, {
      props: { component: RelationManagers, props: { block: combined('after') } },
    })

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
      'Comments',
      'Edit',
    ])
    expect(container.querySelector('[data-slot="relation-content"]')).not.toBeNull()
    expect(screen.getByText('The form')).toBeInTheDocument()
  })
})
