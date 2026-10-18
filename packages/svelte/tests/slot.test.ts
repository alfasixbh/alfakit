import type { SchemaComponent } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { panel, setPageProps } from './mocks'
import SlotHarness from './SlotHarness.svelte'
import Wrapper from './Wrapper.svelte'

afterEach(() => {
  setPageProps({ alfakit: panel })
})

describe('Slot', () => {
  it('renders html and component items', () => {
    setPageProps({
      alfakit: {
        ...panel,
        slots: {
          'topbar.end': [
            { type: 'html', html: '<span>Raw html</span>' },
            {
              type: 'component',
              component: { type: 'Text', key: 'note', content: 'From a schema' } as SchemaComponent,
            },
          ],
        },
      },
    })

    render(Wrapper, { props: { component: SlotHarness, props: { name: 'topbar.end' } } })

    expect(screen.getByText('Raw html')).toBeInTheDocument()
    expect(screen.getByText('From a schema')).toBeInTheDocument()
    expect(document.querySelector('[data-slot-name="topbar.end"]')).not.toBeNull()
  })

  it('renders nothing when the slot is empty', () => {
    render(Wrapper, { props: { component: SlotHarness, props: { name: 'topbar.end' } } })

    expect(screen.getByTestId('host').innerHTML.replace(/<!--.*?-->/g, '')).toBe('')
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

    render(Wrapper, {
      props: {
        component: SlotHarness,
        props: { name: 'table.header-cell', data: { column: 'total' } },
      },
    })

    expect(screen.getByText('every')).toBeInTheDocument()
    expect(screen.getByText('money')).toBeInTheDocument()
    expect(screen.queryByText('title-only')).toBeNull()
  })
})
