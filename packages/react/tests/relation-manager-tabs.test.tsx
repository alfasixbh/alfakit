import type { RelationManagersBlock } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { ContentBlockRenderer } from '../src/pages/page'
import { Wrapper } from './mocks'

const manager = (key: string, title: string) => ({
  type: 'RelationManager' as const,
  key,
  component: key,
  title,
  lazy: true as const,
})

const combined = (position: 'before' | 'after'): RelationManagersBlock => ({
  type: 'RelationManagers',
  key: 'relationManagers',
  managers: [manager('relationManager:App\\Comments', 'Comments')],
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
    render(
      <Wrapper>
        <ContentBlockRenderer block={combined('before')} />
      </Wrapper>,
    )

    const tabs = screen.getAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent)).toEqual(['Edit', 'Comments'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('The form')).toBeVisible()
  })

  it('places the content tab last and keeps the form mounted while hidden', () => {
    const { container } = render(
      <Wrapper>
        <ContentBlockRenderer block={combined('after')} />
      </Wrapper>,
    )

    const tabs = screen.getAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent)).toEqual(['Comments', 'Edit'])
    // The content tab is force-mounted: the form exists before it is opened.
    expect(container.querySelector('[data-slot="relation-content"]')).not.toBeNull()

    fireEvent.mouseDown(tabs[1]!)

    expect(screen.getByText('The form')).toBeInTheDocument()
  })
})
