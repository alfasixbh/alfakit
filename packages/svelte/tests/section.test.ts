import type { SchemaComponent, SectionSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import SectionComponent from '../src/components/layout/SectionComponent.svelte'
import Wrapper from './Wrapper.svelte'

function section(overrides: Partial<SectionSchema> = {}): SectionSchema {
  return {
    type: 'Section',
    key: 'details',
    heading: 'Details',
    schema: [{ type: 'Text', key: 'body', content: 'Section body' } as SchemaComponent],
    ...overrides,
  } as SectionSchema
}

describe('Section', () => {
  it.each([false, true])('toggles a collapsible section (aside: %s)', async (aside) => {
    render(Wrapper, {
      props: {
        component: SectionComponent,
        props: { component: section({ aside, collapsible: true, collapsed: true }) },
      },
    })

    expect(document.querySelector('section')?.getAttribute('data-slot')).toBe('section')
    const toggle = screen.getByRole('button', { name: 'Toggle section' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Section body').closest('[hidden]')).not.toBeNull()

    await fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Section body')).toBeVisible()
    expect(screen.getByText('Section body').closest('[hidden]')).toBeNull()
  })

  it('renders a non-collapsible aside section open without a toggle', () => {
    render(Wrapper, {
      props: { component: SectionComponent, props: { component: section({ aside: true }) } },
    })

    expect(screen.getByText('Section body')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Toggle section' })).toBeNull()
  })
})
