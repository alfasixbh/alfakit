import type { SchemaComponent, SectionSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { SectionComponent } from '../src/components/layout/section'
import { Wrapper } from './mocks'

function section(overrides: Partial<SectionSchema> = {}): SectionSchema {
  return {
    type: 'Section',
    key: 'details',
    heading: 'Details',
    schema: [{ type: 'Text', key: 'body', content: 'Section body' } as SchemaComponent],
    ...overrides,
  } as SectionSchema
}

describe('section', () => {
  it.each([false, true])('toggles a collapsible section (aside: %s)', (aside) => {
    const { container } = render(
      <Wrapper>
        <SectionComponent component={section({ aside, collapsible: true, collapsed: true })} />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="section"]')).not.toBeNull()
    const toggle = screen.getByRole('button', { name: 'Toggle section' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Section body')).toBeNull()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Section body')).toBeInTheDocument()
    expect(container.querySelector('[data-surface="section"]')).not.toBeNull()
  })

  it('renders a non-collapsible aside section open without a toggle', () => {
    render(
      <Wrapper>
        <SectionComponent component={section({ aside: true })} />
      </Wrapper>,
    )

    expect(screen.getByText('Section body')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toggle section' })).toBeNull()
  })
})
